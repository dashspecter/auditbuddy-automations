import { useRef, useCallback } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCompleteButtonProps {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onPress: () => void;
  className?: string;
}

// Debounce window in ms to prevent double-fire on iOS
const DEBOUNCE_MS = 500;

/**
 * Mobile-robust completion control with iOS debounce protection.
 * This is the ONLY interactive target; the inner indicator is purely visual.
 * 
 * Uses a timestamp ref to prevent double-firing within 500ms on iOS where
 * multiple event types (pointerdown, touchend, click) can all fire.
 */
export function TaskCompleteButton({
  checked,
  disabled,
  ariaLabel,
  onPress,
  className,
}: TaskCompleteButtonProps) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) {
      // Ignore rapid duplicate taps
      return;
    }
    lastTapRef.current = now;
    onPress();
  }, [onPress]);

  return (
    <button
      type="button"
      data-no-row-click="1"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "relative z-30 h-11 w-11 flex items-center justify-center touch-manipulation select-none",
        "active:bg-accent/30 rounded-lg transition-colors",
        className,
      )}
      onPointerDown={(e) => {
        // Prevent parent rows/cards from seeing pointerdown
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        // Extra iOS reliability - prevent default to avoid ghost clicks
        e.stopPropagation();
        // Some iOS versions need the tap triggered here
        if (!disabled) {
          handleTap();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        // handleTap has debounce, so calling from both touchend and click is safe
        if (!disabled) {
          handleTap();
        }
      }}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-sm border border-primary ring-offset-background pointer-events-none",
          checked ? "bg-primary text-primary-foreground" : "bg-background text-transparent",
          disabled ? "opacity-50" : "opacity-100",
        )}
      >
        <Check className={cn("h-4 w-4 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
      </span>
    </button>
  );
}
