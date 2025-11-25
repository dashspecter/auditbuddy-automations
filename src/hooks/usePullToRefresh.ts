import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !containerRef.current) return;

    const container = containerRef.current;
    let touchStartY = 0;
    let isValidPullGesture = false;
    let didScrollDuringGesture = false;
    const ACTIVATION_THRESHOLD = 50; // Increased from 30 to make it harder to accidentally trigger
    const STRICT_TOP_THRESHOLD = 0; // Must be exactly at top

    const handleTouchStart = (e: TouchEvent) => {
      // Must be exactly at the top with no tolerance
      const isExactlyAtTop = container.scrollTop === STRICT_TOP_THRESHOLD;
      
      if (isExactlyAtTop) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
        isValidPullGesture = true;
        didScrollDuringGesture = false;
      } else {
        isValidPullGesture = false;
        didScrollDuringGesture = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // If not a valid gesture from the start, ignore completely
      if (!isValidPullGesture) {
        return;
      }

      // If user has scrolled at all during this gesture, invalidate it permanently
      if (container.scrollTop > STRICT_TOP_THRESHOLD) {
        didScrollDuringGesture = true;
        setIsPulling(false);
        setPullDistance(0);
        isValidPullGesture = false;
        return;
      }

      // If we detected scrolling earlier in this gesture, don't allow pull
      if (didScrollDuringGesture) {
        return;
      }

      const touchY = e.touches[0].clientY;
      const distance = touchY - startY.current;

      // Negative distance = scrolling up, immediately cancel
      if (distance < 0) {
        setIsPulling(false);
        setPullDistance(0);
        isValidPullGesture = false;
        return;
      }

      // Only activate after significant downward pull
      if (distance > ACTIVATION_THRESHOLD && distance < threshold * 2.5) {
        setIsPulling(true);
        setPullDistance(distance - ACTIVATION_THRESHOLD);
        // Prevent default scroll when actively pulling
        e.preventDefault();
      } else if (distance <= ACTIVATION_THRESHOLD) {
        // Below threshold, don't show indicator
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      // Only trigger if:
      // 1. Valid pull gesture from start
      // 2. No scrolling happened during gesture
      // 3. Still at exact top
      // 4. Sufficient pull distance
      // 5. Not already refreshing
      const shouldRefresh = 
        isValidPullGesture &&
        !didScrollDuringGesture &&
        container.scrollTop === STRICT_TOP_THRESHOLD &&
        pullDistance >= (threshold - ACTIVATION_THRESHOLD) &&
        !isRefreshing;

      if (shouldRefresh) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      // Reset all state
      setIsPulling(false);
      setPullDistance(0);
      isValidPullGesture = false;
      didScrollDuringGesture = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, onRefresh, isRefreshing, disabled]);

  return {
    containerRef,
    isPulling: isPulling && pullDistance > 0,
    pullDistance,
    isRefreshing,
    isTriggered: pullDistance >= threshold,
  };
};
