import { useAppVisibility } from "@/hooks/useAppVisibility";

/**
 * Mount once (inside QueryClientProvider + AuthProvider) to keep data/session fresh
 * when the user returns to the tab/app.
 */
export function AppVisibilityManager() {
  useAppVisibility();
  return null;
}
