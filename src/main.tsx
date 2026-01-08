import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { registerSW } from "virtual:pwa-register";

// Build timestamp injected at build time for cache busting
declare const __BUILD_TIME__: string;
const CURRENT_BUILD = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";

const isSafeInternalPath = (path: string) => path.startsWith("/");

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
    const serverVersion = data.buildTime || data.version || "";

    // Skip in development (placeholder value)
    if (!serverVersion || serverVersion === "__BUILD_TIME__") {
      return false;
    }

    const storedVersion = localStorage.getItem(VERSION_KEY);

    // First visit - just store the version
    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, serverVersion);
      return false;
    }

    // Same version - no action needed
    if (storedVersion === serverVersion) {
      return false;
    }

    // Version mismatch detected - clear caches and reload
    console.info(`[BuildGuard] Version mismatch: ${storedVersion} → ${serverVersion}. Clearing caches...`);

    // Mark that we're about to reload to prevent loops
    sessionStorage.setItem(RELOAD_KEY, "1");

    // Clear Cache Storage (service worker caches)
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }

    // Request service worker update and unregister old ones
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(async (r) => {
        await r.update();
        // Force the waiting SW to activate
        if (r.waiting) {
          r.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }));
    }

    // Update stored version before reload
    localStorage.setItem(VERSION_KEY, serverVersion);

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

const setupPWAUpdates = () => {
  // PWA: keep the app up to date and avoid users being stuck on old cached UI.
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Force an update check on load and then periodically.
      registration?.update();
      window.setInterval(() => registration?.update(), 30 * 60 * 1000);
    },
    onNeedRefresh() {
      // Apply the update immediately (no prompt).
      updateSW(true);
    },
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.warn("PWA registration error", err);
    },
  });

  // When a new service worker takes control, fix "old view" issues by doing a one-time
  // hard refresh early on app start. If it happens later, show the non-blocking toast
  // to avoid users losing unsaved in-progress form state.
  const bootMs = Date.now();
  const hardRefresh = () => {
    const returnTo = encodeURIComponent(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    window.location.replace(`/?resetApp=1&returnTo=${returnTo}`);
  };

  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) return; // ignore first install

      // Only do this once per session to avoid reload loops.
      const alreadyAutoRefreshed =
        sessionStorage.getItem("pwa:auto-refreshed") === "1";

      // If an update takes control shortly after launch, hard refresh immediately.
      const isEarly = Date.now() - bootMs < 5000;
      if (isEarly && !alreadyAutoRefreshed) {
        sessionStorage.setItem("pwa:auto-refreshed", "1");
        hardRefresh();
        return;
      }

      // Otherwise, show the non-blocking "Update ready" toast.
      sessionStorage.setItem("pwa:update-ready", "1");
      window.dispatchEvent(new CustomEvent("pwa:update-ready"));
    });
  }
};

(async () => {
  await resetAppCacheIfRequested();

  // Check build version before anything else - may trigger reload
  const reloading = await checkBuildVersion();
  if (reloading) return; // Stop execution, page is reloading

  restoreDeepLinkIfNeeded();
  setupPWAUpdates();

  // Remove the pre-boot fallback as soon as JS is running.
  document.getElementById("boot-fallback")?.remove();

  createRoot(document.getElementById("root")!).render(<App />);
})();


