import { useRef, useCallback, useEffect } from "react";

/**
 * Returns a debounced version of the given callback.
 * The timer is cleared on unmount so no stale writes fire.
 * Call `.flush()` on the returned function to force-fire immediately (e.g. before submit).
 */
export function useDebouncedSave<T extends (...args: any[]) => void>(
  callback: T,
  delayMs = 800
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCb = useRef(callback);
  const latestArgs = useRef<any[] | null>(null);

  // Always keep the latest callback ref
  latestCb.current = callback;

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      latestArgs.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        latestCb.current(...args);
        latestArgs.current = null;
        timerRef.current = null;
      }, delayMs);
    },
    [delayMs]
  ) as T & { flush: () => void };

  // Attach flush helper
  (debounced as any).flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (latestArgs.current) {
        latestCb.current(...latestArgs.current);
        latestArgs.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}
