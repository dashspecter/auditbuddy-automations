/*
  Stable build bootstrap loader v4 - Simplified single version check

  This is the ONLY version-checking system. No service workers, no redundant
  checks in main.tsx. One simple flow:
  1. Fetch version.json (never cached)
  2. Compare against localStorage
  3. If mismatch on first visit in session → clear caches, reload once
  4. Inject app entry from build-manifest.json

  This file lives in /public so it is served as-is (not hashed).
*/

(function () {
  var BUILD_MANIFEST_URL = "/build-manifest.json";
  var BUILD_ID_KEY = "app_build_manifest_id";
  var RELOAD_GUARD_KEY = "bootstrap:reloaded";
  var SESSION_MARKER_KEY = "bootstrap:session";
  var VERSION_URL = "/version.json";
  var VERSION_KEY = "app_build_version";
  var VERSION_RELOAD_GUARD = "bootstrap:version-reloaded";

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
    var res = await fetch(url + "?ts=" + Date.now() + "&r=" + Math.random(), {
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
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
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

  /**
   * Simple version check: compare server version with stored version.
   * If mismatch, clear caches and reload ONCE (no URL redirect).
   */
  async function ensureLatestVersion() {
    try {
      // Explicit reset flow
      var url = new URL(window.location.href);
      if (url.searchParams.get("resetApp") === "1") {
        var returnTo = url.searchParams.get("returnTo") || "/";
        await clearAllCaches();
        window.location.replace(returnTo);
        return true;
      }

      // Prevent reload loops — if we already reloaded this session, stop
      if (sessionStorage.getItem(VERSION_RELOAD_GUARD) === "1") {
        return false;
      }

      // Fetch server version
      var data = await fetchJsonNoStore(VERSION_URL);
      var versionFromJson = data
        ? String(data.buildTime && data.buildTime !== "__BUILD_TIME__" ? data.buildTime : "")
        : "";

      var manifestInfo = await fetchManifestEntry();
      var serverVersion = versionFromJson || (manifestInfo ? manifestInfo.versionToken : "");
      if (!serverVersion) return false;

      var storedVersion = "";
      try { storedVersion = localStorage.getItem(VERSION_KEY) || ""; } catch (e) { /* ignore */ }

      // Pin to highest version seen (prevents bouncing between CDN edges)
      var storedNum = parseNumericVersion(storedVersion);
      var serverNum = parseNumericVersion(serverVersion);
      var pinnedVersion =
        storedNum !== null && serverNum !== null
          ? String(Math.max(storedNum, serverNum))
          : serverVersion;

      if (!pinnedVersion) return false;

      // First visit — just store version
      if (!storedVersion) {
        try { localStorage.setItem(VERSION_KEY, pinnedVersion); } catch (e) { /* ignore */ }
        return false;
      }

      // Same version — no action
      if (storedVersion === pinnedVersion) return false;

      // Version mismatch — clear caches and reload once
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

  function injectStylesheets(cssFiles, buildId) {
    if (!Array.isArray(cssFiles)) return;
    cssFiles.forEach(function (cssFile) {
      var href = normalizeAssetPath(cssFile) + "?v=" + encodeURIComponent(buildId);
      if (document.querySelector('link[rel="stylesheet"][href^="' + normalizeAssetPath(cssFile) + '"]')) return;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function injectModuleScript(file, buildId) {
    var src = normalizeAssetPath(file) + "?v=" + encodeURIComponent(buildId);
    var s = document.createElement("script");
    s.type = "module";
    s.src = src;
    document.body.appendChild(s);
  }

  async function boot() {
    try {
      // STEP 1: Check version, may reload once
      var reloading = await ensureLatestVersion();
      if (reloading) return;

      // STEP 2: Clear any stale SW/caches silently (no reload)
      await clearAllCaches();

      // STEP 3: Fetch build manifest and inject app
      var manifestInfo = await fetchManifestEntry();
      if (!manifestInfo) throw new Error("manifest missing entry.file");

      var entry = manifestInfo.entry;
      var buildId = manifestInfo.buildId;

      localStorage.setItem(BUILD_ID_KEY, buildId);
      injectStylesheets(entry.css, buildId);
      injectModuleScript(entry.file, buildId);
    } catch (e) {
      console.warn("[Bootstrap] Error, falling back to dev mode:", e);
      injectModuleScript("/src/main.tsx", String(Date.now()));
    }
  }

  boot();
})();
