/**
 * PWA Service Worker Registration & Update Handler
 * Uses workbox-window for robust lifecycle management.
 */
import { toast } from "sonner";

let deferredPrompt: Event | null = null;

// Capture the beforeinstallprompt event for programmatic install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent("pwa:installable"));
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent("pwa:installed"));
});

export function getDeferredPrompt() {
  return deferredPrompt;
}

export async function triggerInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;
    deferredPrompt = null;
    return outcome === "accepted";
  } catch {
    return false;
  }
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Only register in production builds
  if (import.meta.env.DEV) return;

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");

    wb.addEventListener("waiting", () => {
      toast.info("A new version is available", {
        duration: Infinity,
        action: {
          label: "Update now",
          onClick: () => {
            wb.messageSkipWaiting();
            window.location.reload();
          },
        },
      });
    });

    wb.addEventListener("controlling", () => {
      // New SW controlling - page will reload via the toast action
    });

    await wb.register();
  } catch (err) {
    console.warn("[PWA] Service worker registration failed:", err);
  }
}
