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
  restoreDeepLinkIfNeeded();
  setupPWAUpdates();

  // Remove the pre-boot fallback as soon as JS is running.
  document.getElementById("boot-fallback")?.remove();

  createRoot(document.getElementById("root")!).render(<App />);
})();


