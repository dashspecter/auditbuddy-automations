import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialog = ({
  open,
  onOpenChange,
  children,
  className,
}: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("max-h-[96vh]", className)}>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[600px] max-h-[90vh]", className)}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogHeader = ({
  children,
  className,
}: ResponsiveDialogHeaderProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerHeader className={cn("text-left", className)}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
};

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogTitle = ({
  children,
  className,
}: ResponsiveDialogTitleProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
};

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogDescription = ({
  children,
  className,
}: ResponsiveDialogDescriptionProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
};

interface ResponsiveDialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogBody = ({
  children,
  className,
}: ResponsiveDialogBodyProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ScrollArea className="flex-1 overflow-auto max-h-[calc(96vh-180px)]">
        <div className={cn("px-4 pb-4", className)}>{children}</div>
      </ScrollArea>
    );
  }

  return (
    <div className={cn("overflow-y-auto max-h-[calc(90vh-180px)] pr-1", className)}>
      {children}
    </div>
  );
};

interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogFooter = ({
  children,
  className,
}: ResponsiveDialogFooterProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerFooter className={cn("pt-2 border-t bg-background", className)}>
        {children}
      </DrawerFooter>
    );
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
};

interface ResponsiveDialogCloseProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export const ResponsiveDialogClose = ({
  children,
  className,
  asChild,
}: ResponsiveDialogCloseProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerClose className={className} asChild={asChild}>
        {children}
      </DrawerClose>
    );
  }

  return (
    <DialogClose className={className} asChild={asChild}>
      {children}
    </DialogClose>
  );
};
