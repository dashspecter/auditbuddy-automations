import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({ content, className, side = "top" }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className={cn("h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0 inline-block", className)} />
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs text-xs leading-relaxed p-3 z-[200]"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
