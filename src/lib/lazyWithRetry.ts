import { lazy, ComponentType } from "react";

/**
 * Wraps React.lazy() to handle chunk load failures after deployments.
 * When Vite rebuilds, old chunk filenames become 404s.
 * This wrapper catches the import error and reloads the page once
 * to fetch the fresh index.html with correct chunk URLs.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const hasReloaded = sessionStorage.getItem("chunk-reload");

    try {
      const component = await componentImport();
      // Success — clear any stale flag
      sessionStorage.removeItem("chunk-reload");
      return component;
    } catch (error) {
      if (!hasReloaded) {
        // First failure: set flag and reload to get fresh assets
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        // Return a no-op component while the reload happens
        return { default: (() => null) as unknown as T };
      }
      // Already reloaded once — genuine error, let error boundary handle it
      sessionStorage.removeItem("chunk-reload");
      throw error;
    }
  });
}
