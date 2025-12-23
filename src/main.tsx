import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { registerSW } from "virtual:pwa-register";

// Deep-link fallback: when a host serves /404.html and we redirect to /?redirect=...
// restore the intended client-side route.
(() => {
  try {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get("redirect");
    if (!redirect) return;

    const target = decodeURIComponent(redirect);
    // Only allow internal paths.
    if (target.startsWith("/")) {
      window.history.replaceState(null, "", target);
    }
  } catch {
    // no-op
  }
})();

// PWA: ensure updated service worker takes control and reloads clients.
// Needed to avoid users being stuck on an old cached UI.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(<App />);

