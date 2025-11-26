import { useSwipeable } from "react-swipeable";
import { useState, useRef, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SwipeableListItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  deleteThreshold?: number;
  className?: string;
  disabled?: boolean;
}

export const SwipeableListItem = ({
  children,
  onDelete,
  onSwipeLeft,
  onSwipeRight,
  deleteThreshold = 120,
  className,
  disabled = false,
}: SwipeableListItemProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [deleteTriggered, setDeleteTriggered] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (disabled) return;
      
      setIsSwiping(true);
      const deltaX = eventData.deltaX;
      
      // Allow swipe left for delete (negative deltaX)
      if (onDelete && deltaX < 0) {
        // Clamp the swipe to not go beyond delete threshold + 50px
        const clampedOffset = Math.max(deltaX, -(deleteThreshold + 50));
        setSwipeOffset(clampedOffset);
        
        // Trigger delete animation if past threshold
        if (Math.abs(clampedOffset) >= deleteThreshold && !deleteTriggered) {
          setDeleteTriggered(true);
        } else if (Math.abs(clampedOffset) < deleteThreshold && deleteTriggered) {
          setDeleteTriggered(false);
        }
      }
    },
    onSwiped: (eventData) => {
      if (disabled) return;
      
      setIsSwiping(false);
      const deltaX = eventData.deltaX;
      const absDeltaX = Math.abs(deltaX);

      // Handle delete swipe (left)
      if (onDelete && deltaX < 0 && absDeltaX >= deleteThreshold) {
        setSwipeOffset(-deleteThreshold);
        setTimeout(() => {
          onDelete();
        }, 150);
        return;
      }

      // Handle custom swipe actions
      if (onSwipeLeft && deltaX < -50 && !onDelete) {
        onSwipeLeft();
      } else if (onSwipeRight && deltaX > 50) {
        onSwipeRight();
      }

      // Reset position
      setSwipeOffset(0);
      setDeleteTriggered(false);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10,
  });

  const handleDeleteClick = () => {
    if (onDelete && !disabled) {
      onDelete();
    }
  };

  return (
    <div className={cn("relative overflow-hidden touch-pan-y", className)} ref={itemRef}>
      {/* Delete button background */}
      {onDelete && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-end px-4 transition-colors",
            deleteTriggered ? "bg-destructive" : "bg-destructive/80"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            className="text-destructive-foreground hover:bg-destructive-foreground/20 min-h-[44px] min-w-[44px]"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content */}
      <div
        {...handlers}
        className={cn(
          "relative bg-background transition-transform",
          isSwiping ? "duration-75" : "duration-300 ease-out",
          deleteTriggered && "scale-[0.98]"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
