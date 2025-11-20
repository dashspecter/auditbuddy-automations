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
    let isAtTopOnStart = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate if we're at the very top
      isAtTopOnStart = container.scrollTop === 0;
      if (isAtTopOnStart) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Immediately bail if we didn't start at top or if we're no longer at top
      if (!isAtTopOnStart || container.scrollTop > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const distance = touchY - startY.current;

      // Only handle downward pulls (positive distance)
      if (distance > 0 && distance < threshold * 2) {
        setIsPulling(true);
        setPullDistance(distance);
        // Prevent default scroll when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      } else if (distance <= 0) {
        // User is scrolling up, reset
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing && isAtTopOnStart) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setPullDistance(0);
      isAtTopOnStart = false;
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
