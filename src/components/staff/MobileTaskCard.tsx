import { useRef, useCallback, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTaskCardProps {
  /** Unique task ID for dedup guard */
  taskId: string;
  /** Whether task is checked (optimistic or server) */
  checked: boolean;
  /** Whether completion is disabled */
  disabled?: boolean;
  /** Called when user taps completion zone */
  onComplete: () => void;
  /** Called when user taps details zone (right side on mobile, whole card minus checkbox on desktop) */
  onDetailsClick?: () => void;
  /** Log function for debug overlay */
  logTap?: (msg: string) => void;
  /** Card content (rendered in details zone) */
  children: ReactNode;
  /** Additional card className */
  className?: string;
  /** Whether to show priority border on left */
  priorityBorder?: "high" | "medium" | "low" | "default";
}

// Debounce window to prevent iOS double-fire
const DEBOUNCE_MS = 500;

/**
 * iOS-proof task card with split tap zones:
 * - Mobile: Left 45% = completion zone, Right 55% = details zone
 * - Desktop: Small checkbox + rest of card clickable for details
 * 
 * The completion zone is the ONLY interactive completion control on mobile,
 * preventing accidental navigation when trying to complete tasks.
 */
export function MobileTaskCard({
  taskId,
  checked,
  disabled,
  onComplete,
  onDetailsClick,
  logTap,
  children,
  className,
  priorityBorder = "default",
}: MobileTaskCardProps) {
  const isMobile = useIsMobile();
  const lastTapRef = useRef<{ id: string; ts: number }>({ id: "", ts: 0 });

  const log = useCallback(
    (msg: string) => {
      logTap?.(msg);
    },
    [logTap]
  );

  const handleComplete = useCallback(() => {
    if (disabled) {
      log(`[complete blocked disabled] ${taskId}`);
      return;
    }

    const now = Date.now();
    // Debounce: ignore if same task within 500ms
    if (lastTapRef.current.id === taskId && now - lastTapRef.current.ts < DEBOUNCE_MS) {
      log(`[complete debounced] ${taskId}`);
      return;
    }
    lastTapRef.current = { id: taskId, ts: now };

    log(`[complete zone tap] ${taskId}`);
    onComplete();
  }, [taskId, disabled, onComplete, log]);

  const handleDetailsClick = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      // Guard: ignore clicks from completion zone
      if ((e.target as HTMLElement)?.closest?.('[data-no-row-click="1"]')) {
        log(`[details click ignored - completion zone] ${taskId}`);
        return;
      }
      log(`[details zone tap] ${taskId}`);
      onDetailsClick?.();
    },
    [taskId, onDetailsClick, log]
  );

  const borderClass =
    priorityBorder === "high"
      ? "border-l-4 border-l-destructive"
      : priorityBorder === "medium"
      ? "border-l-4 border-l-orange-500"
      : priorityBorder === "default"
      ? "border-l-4 border-l-primary"
      : "";

  // Visual checkbox indicator (non-interactive on mobile)
  const CheckIndicator = (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-sm border border-primary ring-offset-background pointer-events-none shrink-0",
        checked ? "bg-primary text-primary-foreground" : "bg-background text-transparent",
        disabled ? "opacity-50" : "opacity-100"
      )}
    >
      <Check className={cn("h-4 w-4 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
    </span>
  );

  if (isMobile) {
    // Mobile: Split tap zones
    return (
      <Card className={cn("relative overflow-hidden", borderClass, className)}>
        {/* Completion Zone: Left 45% */}
        <button
          type="button"
          data-no-row-click="1"
          role="checkbox"
          aria-checked={checked}
          aria-label="Complete task"
          disabled={disabled}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[45%] z-40",
            "flex items-center justify-center",
            "touch-manipulation select-none",
            "active:bg-primary/10 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
            log(`[complete zone pointerdown] ${taskId}`);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            // Primary handler for iOS
            handleComplete();
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Fallback handler - debounce will prevent double-fire
            handleComplete();
          }}
        >
          {/* Visual hint: larger tap area indicator on left edge */}
          <div className="absolute left-3 flex items-center justify-center">
            {CheckIndicator}
          </div>
        </button>

        {/* Details Zone: Right 55% + visual content */}
        <div
          className="relative pl-14 pr-4 py-4 cursor-pointer min-h-[60px]"
          onClick={handleDetailsClick}
          onPointerDown={() => log(`[details zone pointerdown] ${taskId}`)}
        >
          {children}
        </div>
      </Card>
    );
  }

  // Desktop: Traditional checkbox + clickable card
  return (
    <Card
      className={cn("overflow-hidden cursor-pointer hover:bg-accent/10 transition-colors", borderClass, className)}
      onClick={handleDetailsClick}
      onPointerDown={() => log(`[row pointerdown] ${taskId}`)}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Desktop Checkbox Button */}
        <button
          type="button"
          data-no-row-click="1"
          role="checkbox"
          aria-checked={checked}
          aria-label="Complete task"
          disabled={disabled}
          className={cn(
            "relative z-30 h-11 w-11 flex items-center justify-center touch-manipulation select-none",
            "active:bg-accent/30 rounded-lg transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
        >
          {CheckIndicator}
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Card>
  );
}
