import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
  show?: boolean;
}

/**
 * A sticky action bar that appears at the bottom of the screen on mobile.
 * Use this for primary actions like Save, Submit, Create, etc.
 * 
 * On desktop, it renders as a normal flex container.
 * On mobile, it sticks to the bottom with safe area padding.
 */
export const StickyActionBar = ({
  children,
  className,
  show = true,
}: StickyActionBarProps) => {
  const isMobile = useIsMobile();

  if (!show) return null;

  if (isMobile) {
    return (
      <>
        {/* Spacer to prevent content from being hidden behind sticky bar */}
        <div className="h-20" />
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 bg-background border-t p-4 pb-safe",
            "flex items-center gap-3",
            className
          )}
          style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {children}
    </div>
  );
};

interface StickyActionBarContainerProps {
  children: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
  actionsClassName?: string;
}

/**
 * A container that wraps content and provides a sticky action bar on mobile.
 * 
 * @param children - The main content
 * @param actions - The action buttons to show in the sticky bar on mobile / inline on desktop
 */
export const StickyActionBarContainer = ({
  children,
  actions,
  className,
  actionsClassName,
}: StickyActionBarContainerProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {isMobile ? (
        <>
          {/* Spacer for mobile */}
          <div className="h-20" />
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-40 bg-background border-t p-4",
              "flex items-center justify-end gap-3",
              actionsClassName
            )}
            style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
          >
            {actions}
          </div>
        </>
      ) : (
        <div className={cn("flex items-center justify-end gap-3 mt-6", actionsClassName)}>
          {actions}
        </div>
      )}
    </div>
  );
};
