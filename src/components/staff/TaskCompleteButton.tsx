import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCompleteButtonProps {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onPress: () => void;
  className?: string;
}

/**
 * Mobile-robust completion control.
 * This is the ONLY interactive target; the inner indicator is purely visual.
 */
export function TaskCompleteButton({
  checked,
  disabled,
  ariaLabel,
  onPress,
  className,
}: TaskCompleteButtonProps) {
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
        className,
      )}
      onPointerDown={(e) => {
        // Prevent parent rows/cards from seeing pointerdown (mobile Safari can be quirky)
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        // Extra iOS reliability
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-sm border border-primary ring-offset-background",
          checked ? "bg-primary text-primary-foreground" : "bg-background text-transparent",
          disabled ? "opacity-50" : "opacity-100",
        )}
      >
        <Check className={cn("h-4 w-4 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
      </span>
    </button>
  );
}
