import { Badge } from "@/components/ui/badge";
import { Camera, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/hooks/useEvidencePackets";

interface EvidenceStatusBadgeProps {
  status: EvidenceStatus | "none";
  className?: string;
  size?: "sm" | "default";
}

export function EvidenceStatusBadge({ status, className, size = "default" }: EvidenceStatusBadgeProps) {
  const isSmall = size === "sm";

  if (status === "none") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-muted-foreground/30 text-muted-foreground gap-1",
          isSmall && "text-[10px] px-1.5 py-0",
          className
        )}
      >
        <Camera className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        No proof
      </Badge>
    );
  }

  if (status === "draft") {
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1", isSmall && "text-[10px] px-1.5 py-0", className)}
      >
        <Camera className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        Draft
      </Badge>
    );
  }

  if (status === "submitted") {
    return (
      <Badge
        className={cn(
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1",
          isSmall && "text-[10px] px-1.5 py-0",
          className
        )}
      >
        <Clock className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        Pending review
      </Badge>
    );
  }

  if (status === "approved") {
    return (
      <Badge
        className={cn(
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1",
          isSmall && "text-[10px] px-1.5 py-0",
          className
        )}
      >
        <CheckCircle className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        Proof approved
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge
        variant="destructive"
        className={cn("gap-1", isSmall && "text-[10px] px-1.5 py-0", className)}
      >
        <XCircle className={cn("shrink-0", isSmall ? "h-2.5 w-2.5" : "h-3 w-3")} />
        Proof rejected
      </Badge>
    );
  }

  return null;
}
