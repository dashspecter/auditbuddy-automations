/*
  Stable build bootstrap loader v6

  In preview/dev → skip manifest, load /src/main.tsx directly (Vite serves it).
  In production  → fetch build-manifest.json, inject hashed entry.
  Version check  → only clear caches on actual version mismatch.
*/

(function () {
  if (window.__BOOTSTRAP_INJECTED__) return;

  var BUILD_MANIFEST_URL = "/build-manifest.json";
  var VERSION_URL = "/version.json";
  var VERSION_KEY = "app_build_version";
  var VERSION_RELOAD_GUARD = "bootstrap:version-reloaded";
  var SESSION_MARKER_KEY = "bootstrap:session";

  // Detect preview / dev environments
  function isDevOrPreview() {
    var h = location.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.endsWith(".lovableproject.com") ||
      h.endsWith(".lovable.app") && h.includes("-preview--")
    );
  }

  // --- Utility helpers ---

  var parseNumericVersion = function (v) {
    if (!v) return null;
    var s = String(v).trim();
    if (!/^\d+$/.test(s)) return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  var hashToUint32String = function (input) {
    var str = String(input || "");
    var hash = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return String(hash >>> 0);
  };

  var fetchJsonNoStore = async function (url) {
    var res = await fetch(url + "?ts=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  };

  // Clear session guards on fresh browser sessions
  if (!sessionStorage.getItem(SESSION_MARKER_KEY)) {
    sessionStorage.setItem(SESSION_MARKER_KEY, Date.now().toString());
    sessionStorage.removeItem(VERSION_RELOAD_GUARD);
  }

  var normalizeAssetPath = function (p) {
    return "/" + String(p || "").replace(/^\/+/, "");
  };

  async function clearAllCaches() {
    try {
      if ("serviceWorker" in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.unregister(); }));
      }
    } catch (e) { /* ignore */ }
    try {
      if ("caches" in window) {
        var keys = await window.caches.keys();
        await Promise.all(keys.map(function (k) { return window.caches.delete(k); }));
      }
    } catch (e) { /* ignore */ }
  }

  function pickAppEntry(manifest) {
    var keys = Object.keys(manifest || {});
    var mainKey = keys.find(function (k) { return k.endsWith("src/main.tsx"); });
    if (mainKey) return manifest[mainKey];
    var anyKey = keys.find(function (k) { return /\.(ts|tsx)$/.test(k); });
    return anyKey ? manifest[anyKey] : null;
  }

  async function fetchManifestEntry() {
    var manifest = await fetchJsonNoStore(BUILD_MANIFEST_URL);
    if (!manifest) return null;
    var entry = pickAppEntry(manifest);
    if (!entry || !entry.file) return null;
    var buildId = entry.file + "|" + (Array.isArray(entry.css) ? entry.css.join(",") : "");
    var versionToken = hashToUint32String(buildId);
    return { entry: entry, buildId: buildId, versionToken: versionToken };
  }

  var cachedManifestInfo = null;

  async function ensureLatestVersion() {
    try {
      if (sessionStorage.getItem(VERSION_RELOAD_GUARD) === "1") return false;

      var data = await fetchJsonNoStore(VERSION_URL);
      var versionFromJson = data
        ? String(data.buildTime && data.buildTime !== "__BUILD_TIME__" ? data.buildTime : "")
        : "";

      cachedManifestInfo = await fetchManifestEntry();
      var serverVersion = versionFromJson || (cachedManifestInfo ? cachedManifestInfo.versionToken : "");
      if (!serverVersion) return false;

      var storedVersion = "";
      try { storedVersion = localStorage.getItem(VERSION_KEY) || ""; } catch (e) { /* ignore */ }

      var storedNum = parseNumericVersion(storedVersion);
      var serverNum = parseNumericVersion(serverVersion);
      var pinnedVersion =
        storedNum !== null && serverNum !== null
          ? String(Math.max(storedNum, serverNum))
          : serverVersion;

      if (!pinnedVersion) return false;

      if (!storedVersion) {
        try { localStorage.setItem(VERSION_KEY, pinnedVersion); } catch (e) { /* ignore */ }
        return false;
      }

      if (storedVersion === pinnedVersion) return false;

      // Real version mismatch — clear caches and reload once
      console.info("[Bootstrap] Version mismatch: " + storedVersion + " → " + pinnedVersion + ". Reloading...");
      sessionStorage.setItem(VERSION_RELOAD_GUARD, "1");
      try { localStorage.setItem(VERSION_KEY, pinnedVersion); } catch (e) { /* ignore */ }
      await clearAllCaches();
      window.location.reload();
      return true;
    } catch (e) {
      console.warn("[Bootstrap] Version check error:", e);
      return false;
    }
  }

  function showBootFallback() {
    var el = document.getElementById("boot-fallback");
    if (el) el.style.display = "flex";
  }

  function injectStylesheets(cssFiles) {
    if (!Array.isArray(cssFiles)) return;
    cssFiles.forEach(function (cssFile) {
      var href = normalizeAssetPath(cssFile);
      if (document.querySelector('link[rel="stylesheet"][href^="' + href + '"]')) return;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function injectModuleScript(file) {
    var src = normalizeAssetPath(file);
    var s = document.createElement("script");
    s.type = "module";
    s.src = src;
    document.body.appendChild(s);
  }

  async function boot() {
    // Guard: only inject once
    if (window.__BOOTSTRAP_INJECTED__) return;

    // DEV / PREVIEW: skip manifest entirely, Vite serves /src/main.tsx
    if (isDevOrPreview()) {
      window.__BOOTSTRAP_INJECTED__ = true;
      injectModuleScript("/src/main.tsx");
      return;
    }

    try {
      // PRODUCTION: check version, may reload once
      var reloading = await ensureLatestVersion();
      if (reloading) return;

      var manifestInfo = cachedManifestInfo || await fetchManifestEntry();
      if (!manifestInfo) {
        await new Promise(function (r) { setTimeout(r, 1500); });
        manifestInfo = await fetchManifestEntry();
      }

      if (!manifestInfo) {
        console.warn("[Bootstrap] Could not load build manifest. Showing fallback.");
        showBootFallback();
        return;
      }

      window.__BOOTSTRAP_INJECTED__ = true;
      var entry = manifestInfo.entry;
      injectStylesheets(entry.css);
      injectModuleScript(entry.file);
    } catch (e) {
      console.warn("[Bootstrap] Error:", e);
      showBootFallback();
    }
  }

  boot();
})();
