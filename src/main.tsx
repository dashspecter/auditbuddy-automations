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

const isSafeInternalPath = (path: string) =>
  path.startsWith("/") && !path.startsWith("//") && !path.includes("resetApp");

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
  try {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get("redirect");
    if (!redirect) return;

    const target = decodeURIComponent(redirect);
    if (isSafeInternalPath(target)) {
      window.history.replaceState(null, "", target);
    }
  } catch {
    // no-op
  }
};

(async () => {
  await resetAppCacheIfRequested();
  restoreDeepLinkIfNeeded();

  // Hide fallback — do NOT remove it from DOM to avoid React reconciliation races
  const bootFallback = document.getElementById("boot-fallback");
  if (bootFallback) {
    bootFallback.style.display = "none";
  }

  createRoot(document.getElementById("root")!).render(<App />);
})();
