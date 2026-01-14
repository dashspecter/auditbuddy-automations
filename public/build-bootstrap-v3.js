/*
  Stable build bootstrap loader.
  - Works even if index.html is stale-cached: it always fetches the latest build manifest with no-store.
  - If it detects a new build, it unregisters any existing service workers and clears Cache Storage, then reloads once.

  This file lives in /public so it is served as-is (not hashed), keeping index.html stable.

  v3: Renamed file again to bust any edge/CDN caches that might ignore no-store headers.
*/

(function () {
  const BUILD_MANIFEST_URL = "/build-manifest.json";
  const BUILD_ID_KEY = "app_build_manifest_id";
  const RELOAD_GUARD_KEY = "bootstrap:reloaded";
  const SESSION_MARKER_KEY = "bootstrap:session";
  const PRECLEAN_GUARD_KEY = "bootstrap:precleaned";

  // Clear reload guard on fresh browser sessions to allow new builds to reload
  const currentSession = Date.now().toString();
  if (!sessionStorage.getItem(SESSION_MARKER_KEY)) {
    sessionStorage.setItem(SESSION_MARKER_KEY, currentSession);
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
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
      // Pre-clean once per session: if an old service worker or Cache Storage exists,
      // wipe them and reload to avoid stale UI/bundle mismatches.
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
            await cleanupCachingArtifacts();
            window.location.reload();
            return;
          }
        }
      } catch {
        // ignore
      }

      const res = await fetch(`${BUILD_MANIFEST_URL}?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);

      const manifest = await res.json();
      const entry = pickAppEntry(manifest);
      if (!entry || !entry.file) throw new Error("manifest missing entry.file");

      const buildId = `${entry.file}|${Array.isArray(entry.css) ? entry.css.join(",") : ""}`;
      const previousBuildId = localStorage.getItem(BUILD_ID_KEY);

      // If build changed since last load, clear SW + caches and reload ONCE.
      if (previousBuildId && previousBuildId !== buildId && sessionStorage.getItem(RELOAD_GUARD_KEY) !== "1") {
        sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        localStorage.setItem(BUILD_ID_KEY, buildId);
        await cleanupCachingArtifacts();
        window.location.reload();
        return;
      }

      localStorage.setItem(BUILD_ID_KEY, buildId);
      injectStylesheets(entry.css, buildId);
      injectModuleScript(entry.file, buildId);
    } catch {
      // Dev fallback: Vite serves source modules directly, so load the standard entry.
      injectModuleScript("/src/main.tsx", String(Date.now()));
    }
  }

  boot();
})();
