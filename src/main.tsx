import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { registerSW } from "virtual:pwa-register";

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

  // When a new service worker takes control, reload to ensure fresh chunks.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
};

(async () => {
  await resetAppCacheIfRequested();
  restoreDeepLinkIfNeeded();
  setupPWAUpdates();

  createRoot(document.getElementById("root")!).render(<App />);
})();

