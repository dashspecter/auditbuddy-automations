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
 * If different, clears caches and reloads once.
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
    // Prevent infinite reload loops
    if (sessionStorage.getItem(RELOAD_KEY) === "1") {
      sessionStorage.removeItem(RELOAD_KEY);
      return false;
    }

    // Fetch version.json with cache disabled to always get the latest
    const res = await fetch("/version.json", { cache: "no-store" });
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

    // If the server looks older than what we already have, do not downgrade.
    if (pinnedVersion === storedVersion) {
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

    // Hard reload to get fresh assets
    window.location.reload();
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


