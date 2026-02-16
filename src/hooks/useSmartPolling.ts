import { useState, useEffect, useCallback } from 'react';

interface SmartPollingOptions {
  /** Polling interval when page is visible/active (ms). Default: 5000 */
  activeInterval?: number;
  /** Polling interval when page is hidden/backgrounded (ms). Default: 60000 */
  backgroundInterval?: number;
  /** Whether polling is enabled at all. Default: true */
  enabled?: boolean;
}

/**
 * Returns a dynamic refetchInterval that slows down when the page is not visible.
 * This dramatically reduces connection pressure on the database.
 *
 * Usage:
 *   const refetchInterval = useSmartPolling({ activeInterval: 5000, backgroundInterval: 60000 });
 *   useQuery({ ..., refetchInterval });
 */
export function useSmartPolling({
  activeInterval = 5000,
  backgroundInterval = 60000,
  enabled = true,
}: SmartPollingOptions = {}) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!enabled) return false as const;
  return isVisible ? activeInterval : backgroundInterval;
}
