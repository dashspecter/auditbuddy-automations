import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n

// Build timestamp injected at build time for cache busting
declare const __BUILD_TIME__: string;
const CURRENT_BUILD = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";

// Non-UI build identifier for debugging stale deploys
console.info(
  "%c[Dashspect Build]",
  "color: #f97316; font-weight: bold;",
  `ID: ${CURRENT_BUILD} | Loaded: ${new Date().toISOString()}`
);

const isSafeInternalPath = (path: string) => path.startsWith("/");

/**
 * Required SW + Cache cleanup: neutralize stale service workers and their caches.
 * Does NOT touch localStorage/sessionStorage beyond a one-session guard.
 */
const cleanupServiceWorkersAndCaches = async () => {
  const GUARD_KEY = "sw:cleanup-done";
  if (sessionStorage.getItem(GUARD_KEY) === "1") return;
  sessionStorage.setItem(GUARD_KEY, "1");

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // no-op
  }

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch {
    // no-op
  }
};

const resetAppCacheIfRequested = async () => {
  try {
    const url = new URL(window.location.href);
    const shouldReset = url.searchParams.get("resetApp") === "1";
    if (!shouldReset) return;

    const returnToRaw = url.searchParams.get("returnTo");
    const returnTo =
      returnToRaw && isSafeInternalPath(returnToRaw) ? returnToRaw : "/";

    // Unregister service workers and clear Cache Storage.
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }

    // Avoid a reset loop by navigating without the reset parameters.
    window.location.replace(returnTo);
  } catch {
    // no-op
  }
};

/**
 * Build version guard: ensures the app always loads the latest build.
 * Fetches /version.json (never cached) and compares against localStorage.
 * If a NEWER version is detected, clears caches and reloads once.
 * 
 * STALE UI PREVENTION: This is our final defense against old UI.
 * The bootstrap script handles this too, but this catches edge cases
 * where the bootstrap might have missed something.
 */
const checkBuildVersion = async (): Promise<boolean> => {
  const VERSION_KEY = "app_build_version";
  const RELOAD_KEY = "app_build_reload_pending";

  const parseNumericVersion = (v: string | null): number | null => {
    if (!v) return null;
    const s = String(v).trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  try {
    // Prevent infinite reload loops - this key is set before reload
    if (sessionStorage.getItem(RELOAD_KEY) === "1") {
      sessionStorage.removeItem(RELOAD_KEY);
      return false;
    }

    // Fetch version.json with aggressive cache busting
    const res = await fetch(`/version.json?ts=${Date.now()}&r=${Math.random()}`, { 
      cache: "no-store",
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    if (!res.ok) {
      console.warn("[BuildGuard] Failed to fetch version.json:", res.status);
      return false;
    }

    const data = await res.json();
    const serverVersion: string = String(data.buildTime || data.version || "");

    // Skip in development (placeholder value)
    if (!serverVersion || serverVersion === "__BUILD_TIME__") {
      return false;
    }

    const storedVersion = localStorage.getItem(VERSION_KEY);

    // Pin to the newest version we've ever seen (prevents bouncing between edge caches)
    const storedNum = parseNumericVersion(storedVersion);
    const serverNum = parseNumericVersion(serverVersion);
    
    // If we can parse both as numbers, use the higher one
    // This prevents "downgrade" loops when different CDN edges serve different versions
    const pinnedVersion =
      storedNum !== null && serverNum !== null
        ? String(Math.max(storedNum, serverNum))
        : storedVersion || serverVersion;

    // First visit - just store the version
    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, pinnedVersion);
      return false;
    }

    // Same version - no action needed
    if (storedVersion === pinnedVersion) {
      return false;
    }

    // Version mismatch detected - clear caches and reload
    console.info(
      `[BuildGuard] Version mismatch: ${storedVersion} → ${pinnedVersion}. Clearing caches...`
    );

    // Mark that we're about to reload to prevent loops
    sessionStorage.setItem(RELOAD_KEY, "1");

    // Clear Cache Storage (service worker caches)
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }

    // Unregister any existing service workers (stale SW can serve old bundles)
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // Update stored version before reload
    localStorage.setItem(VERSION_KEY, pinnedVersion);

    // Update URL with version param to bust CDN cache
    const url = new URL(window.location.href);
    if (url.searchParams.get("v") !== pinnedVersion) {
      url.searchParams.set("v", pinnedVersion);
      window.location.replace(url.pathname + url.search + url.hash);
    } else {
      // If URL already has correct version, just reload
      window.location.reload();
    }
    return true;
  } catch (err) {
    console.warn("[BuildGuard] Error checking version:", err);
    return false;
  }
};

const restoreDeepLinkIfNeeded = () => {
  // Deep-link fallback: when a host serves /404.html and we redirect to /?redirect=...
  // restore the intended client-side route.
  try {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get("redirect");
    if (!redirect) return;

    const target = decodeURIComponent(redirect);
    // Only allow internal paths.
    if (isSafeInternalPath(target)) {
      window.history.replaceState(null, "", target);
    }
  } catch {
    // no-op
  }
};

(async () => {
  // Neutralize any previously-installed SW/caches before doing anything else.
  await cleanupServiceWorkersAndCaches();

  await resetAppCacheIfRequested();

  // Check build version before anything else - may trigger reload
  const reloading = await checkBuildVersion();
  if (reloading) return; // Stop execution, page is reloading

  restoreDeepLinkIfNeeded();

  // Remove the pre-boot fallback as soon as JS is running.
  document.getElementById("boot-fallback")?.remove();

  createRoot(document.getElementById("root")!).render(<App />);
})();


