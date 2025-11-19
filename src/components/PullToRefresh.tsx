import { ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
}: PullToRefreshProps) => {
  const { containerRef, isPulling, pullDistance, isRefreshing, isTriggered } =
    usePullToRefresh({
      onRefresh,
      threshold,
      disabled,
    });

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull to refresh indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-40",
          isPulling || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
          transform: isRefreshing ? `translateY(${threshold}px)` : `translateY(${pullDistance}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-2 p-4 bg-background/95 backdrop-blur-sm rounded-b-lg shadow-lg">
          {isRefreshing ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Refreshing...</span>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "transition-transform duration-200",
                  isTriggered ? "rotate-180" : "rotate-0"
                )}
              >
                <ArrowDown className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {isTriggered ? 'Release to refresh' : 'Pull to refresh'}
              </span>
              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content with padding to prevent overlap */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isRefreshing ? `translateY(${threshold}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
