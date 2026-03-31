/**
 * PWA Install Prompt Handler
 * Service worker registration is handled by the bootstrap script.
 * This file only manages the install prompt for Add to Home Screen.
 */

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
