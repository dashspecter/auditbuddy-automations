/**
 * Detects if the current hostname is the scouts subdomain.
 * Used to branch App.tsx into the scout portal experience.
 */
export function useIsScoutsDomain(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === 'scouts.dashspect.com' ||
    hostname.startsWith('scouts.') ||
    // Allow testing via query param in development
    (import.meta.env.DEV && new URLSearchParams(window.location.search).has('scout-portal'))
  );
}
