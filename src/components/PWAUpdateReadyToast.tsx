import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows a non-blocking prompt when an app update takes control.
 * We avoid auto-reloading to prevent users losing unsaved form input.
 */
export function PWAUpdateReadyToast() {
  useEffect(() => {
    const show = () => {
      // Clear the flag to avoid repeat prompts
      sessionStorage.removeItem("pwa:update-ready");
      toast("Update ready", {
        description: "A new version is available. Refresh when you're ready.",
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
        duration: Infinity,
      });
    };

    // If the update event fired before React mounted, still show the prompt.
    if (sessionStorage.getItem("pwa:update-ready") === "1") {
      show();
    }

    const handler = () => show();
    window.addEventListener("pwa:update-ready", handler as EventListener);
    return () => window.removeEventListener("pwa:update-ready", handler as EventListener);
  }, []);

  return null;
}
