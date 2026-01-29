/*
  Stable build bootstrap loader v3.1 - Enhanced stale UI prevention
  
  Problem: Users sometimes see old UI even after Cmd+Shift+R because:
  - CDN/browser may cache index.html despite no-cache headers
  - Service workers can serve stale app shells
  - Edge caches may ignore cache-control headers
  
  Solution: Multiple layers of defense:
  1. ALWAYS fetch version.json on every load (never cached)
  2. Compare against localStorage pinned version (always use highest seen)
  3. Force clear ALL caches + SW before reloading if version differs
  4. Add URL version param to bust CDN caches for index.html
  5. Pre-clean on fresh session if any SW/caches exist
  
  This file lives in /public so it is served as-is (not hashed), keeping index.html stable.
*/

(function () {
  const BUILD_MANIFEST_URL = "/build-manifest.json";
  const BUILD_ID_KEY = "app_build_manifest_id";
  const RELOAD_GUARD_KEY = "bootstrap:reloaded";
  const SESSION_MARKER_KEY = "bootstrap:session";
  const PRECLEAN_GUARD_KEY = "bootstrap:precleaned";
  const FORCE_RELOAD_KEY = "bootstrap:force-reload";

  // Version-based cache busting to defeat stubborn edge/CDN caches
  const VERSION_URL = "/version.json";
  const VERSION_KEY = "app_build_version";
  const VERSION_REDIRECT_GUARD_KEY = "bootstrap:version-redirected";

  const parseNumericVersion = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  // Small, deterministic hash for long version strings (e.g. build IDs)
  // Returns an unsigned 32-bit integer as a string.
  const hashToUint32String = (input) => {
    const str = String(input || "");
    let hash = 2166136261; // FNV-1a base
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return String(hash >>> 0);
  };

  const fetchJsonNoStore = async (url) => {
    const res = await fetch(`${url}?ts=${Date.now()}&r=${Math.random()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // Clear guards on fresh browser sessions to allow new builds to work
  const currentSession = Date.now().toString();
  if (!sessionStorage.getItem(SESSION_MARKER_KEY)) {
    sessionStorage.setItem(SESSION_MARKER_KEY, currentSession);
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    sessionStorage.removeItem(VERSION_REDIRECT_GUARD_KEY);
    sessionStorage.removeItem(PRECLEAN_GUARD_KEY);
    sessionStorage.removeItem(FORCE_RELOAD_KEY);
  }

  const normalizeAssetPath = (p) => `/${String(p || "").replace(/^\/+/, "")}`;

  async function unregisterAllServiceWorkers() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
  }

  async function clearCacheStorage() {
    if (!("caches" in window)) return;
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch {
      // ignore
    }
  }

  async function cleanupCachingArtifacts() {
    await unregisterAllServiceWorkers();
    await clearCacheStorage();
  }

  async function fetchManifestEntry() {
    const manifest = await fetchJsonNoStore(BUILD_MANIFEST_URL);
    if (!manifest) return null;
    const entry = pickAppEntry(manifest);
    if (!entry || !entry.file) return null;

    const buildId = `${entry.file}|${Array.isArray(entry.css) ? entry.css.join(",") : ""}`;
    // Use a short version token for URL/localStorage; still uniquely changes per build.
    const versionToken = hashToUint32String(buildId);
    return { entry, buildId, versionToken };
  }

  /**
   * Version check with aggressive cache busting.
   * Returns true if we're about to redirect/reload.
   */
  async function ensureLatestVersion() {
    try {
      const url = new URL(window.location.href);

      // Explicit reset flow: clear SW/caches even if the app bundle never boots.
      if (url.searchParams.get("resetApp") === "1") {
        const returnTo = url.searchParams.get("returnTo") || "/";
        await cleanupCachingArtifacts();
        window.location.replace(returnTo);
        return true;
      }

      // Prevent infinite reload loops
      if (sessionStorage.getItem(FORCE_RELOAD_KEY) === "1") {
        sessionStorage.removeItem(FORCE_RELOAD_KEY);
        return false;
      }

      // Prefer version.json if it has a real buildTime; otherwise fall back to build manifest.
      const data = await fetchJsonNoStore(VERSION_URL);
      const versionFromJson = data
        ? String(
            data.buildTime && data.buildTime !== "__BUILD_TIME__"
              ? data.buildTime
              : ""
          )
        : "";

      const manifestInfo = await fetchManifestEntry();
      const serverVersion = versionFromJson || (manifestInfo ? manifestInfo.versionToken : "");
      if (!serverVersion) return false;

      const storedVersion = (() => {
        try {
          return localStorage.getItem(VERSION_KEY) || "";
        } catch {
          return "";
        }
      })();

      // Prefer the server token if it differs.
      // If numeric tokens exist, keep the higher one (helps in multi-edge environments).
      const storedNum = parseNumericVersion(storedVersion);
      const serverNum = parseNumericVersion(serverVersion);
      const pinnedVersion =
        storedNum !== null && serverNum !== null
          ? String(Math.max(storedNum, serverNum))
          : serverVersion;

      if (!pinnedVersion) return false;

      // Always update localStorage to the highest version
      try {
        localStorage.setItem(VERSION_KEY, pinnedVersion);
      } catch {
        // ignore
      }

      // Check if URL already has correct version param
      const currentV = url.searchParams.get("v");
      if (currentV === pinnedVersion) return false;

      // Guard by pinned version so we never loop within a session
      const guardedVersion = sessionStorage.getItem(VERSION_REDIRECT_GUARD_KEY);
      if (guardedVersion === pinnedVersion) return false;
      
      // We have a version mismatch - need to update
      console.info(`[Bootstrap] Version mismatch: URL=${currentV || 'none'} → ${pinnedVersion}. Clearing caches...`);
      
      // Set guard BEFORE any async operations
      sessionStorage.setItem(VERSION_REDIRECT_GUARD_KEY, pinnedVersion);
      sessionStorage.setItem(FORCE_RELOAD_KEY, "1");
      
      // Clear all caches before redirect to ensure fresh load
      await cleanupCachingArtifacts();

      // Redirect with new version param to bust CDN cache
      url.searchParams.set("v", pinnedVersion);
      window.location.replace(url.pathname + url.search + url.hash);
      return true;
    } catch (e) {
      console.warn("[Bootstrap] Version check error:", e);
      return false;
    }
  }

  function injectStylesheets(cssFiles, buildId) {
    if (!Array.isArray(cssFiles)) return;
    cssFiles.forEach((cssFile) => {
      const href = `${normalizeAssetPath(cssFile)}?v=${encodeURIComponent(buildId)}`;
      if (document.querySelector(`link[rel="stylesheet"][href^="${normalizeAssetPath(cssFile)}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function injectModuleScript(file, buildId) {
    const src = `${normalizeAssetPath(file)}?v=${encodeURIComponent(buildId)}`;
    const s = document.createElement("script");
    s.type = "module";
    s.src = src;
    document.body.appendChild(s);
  }

  function pickAppEntry(manifest) {
    const keys = Object.keys(manifest || {});
    // Prefer the explicit app entry we configured in vite config.
    const mainKey = keys.find((k) => k.endsWith("src/main.tsx"));
    if (mainKey) return manifest[mainKey];

    // Fallback: first entry that looks like a TS/TSX entry.
    const anyKey = keys.find((k) => /\.(ts|tsx)$/.test(k));
    return anyKey ? manifest[anyKey] : null;
  }

  async function boot() {
    try {
      // STEP 1: Always check version first and redirect if needed
      const redirected = await ensureLatestVersion();
      if (redirected) return; // Stop - page is redirecting

      // STEP 2: Pre-clean once per session if old SW/caches exist
      try {
        if (sessionStorage.getItem(PRECLEAN_GUARD_KEY) !== "1") {
          sessionStorage.setItem(PRECLEAN_GUARD_KEY, "1");

          let hasSW = false;
          let hasCaches = false;

          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            hasSW = regs.length > 0;
          }

          if ("caches" in window) {
            const keys = await window.caches.keys();
            hasCaches = keys.length > 0;
          }

          if (hasSW || hasCaches) {
            console.info("[Bootstrap] Found stale SW/caches, cleaning up...");
            await cleanupCachingArtifacts();
            window.location.reload();
            return;
          }
        }
      } catch {
        // ignore
      }

      // STEP 3: Fetch build manifest and inject app
      const manifestInfo = await fetchManifestEntry();
      if (!manifestInfo) throw new Error("manifest missing entry.file");

      const entry = manifestInfo.entry;
      const buildId = manifestInfo.buildId;
      const previousBuildId = localStorage.getItem(BUILD_ID_KEY);

      // If build changed since last load, clear SW + caches and reload ONCE.
      if (previousBuildId && previousBuildId !== buildId && sessionStorage.getItem(RELOAD_GUARD_KEY) !== "1") {
        console.info(`[Bootstrap] Build ID changed, reloading...`);
        sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        localStorage.setItem(BUILD_ID_KEY, buildId);
        await cleanupCachingArtifacts();
        window.location.reload();
        return;
      }

      localStorage.setItem(BUILD_ID_KEY, buildId);
      injectStylesheets(entry.css, buildId);
      injectModuleScript(entry.file, buildId);
    } catch (e) {
      console.warn("[Bootstrap] Error, falling back to dev mode:", e);
      // Dev fallback: Vite serves source modules directly, so load the standard entry.
      injectModuleScript("/src/main.tsx", String(Date.now()));
    }
  }

  boot();
})();
