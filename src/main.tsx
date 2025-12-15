import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log("ServiceWorker registration successful:", registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      },
      (error) => {
        console.log("ServiceWorker registration failed:", error);
      }
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);

