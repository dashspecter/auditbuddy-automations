import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, Sparkles, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleV2 } from "./modulesData";

// ============================================================================
// MATURITY PATH COMPONENT
// ============================================================================

type MaturityStage = "Setup" | "Adopt" | "Optimize";

interface MaturityPathProps {
  activeStage: MaturityStage;
}

const stages: MaturityStage[] = ["Setup", "Adopt", "Optimize"];

const MaturityPath = ({ activeStage }: MaturityPathProps) => {
  const activeIndex = stages.indexOf(activeStage);
  
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => {
        const isActive = index <= activeIndex;
        const isCurrent = index === activeIndex;
        
        return (
          <div key={stage} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {stage}
            </div>
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 rounded-full transition-all",
                  isActive ? "bg-primary/40" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// CATEGORY COLORS
// ============================================================================

const categoryColors: Record<string, string> = {
  Operations: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Quality: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  People: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Assets: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Finance: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  AI: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

// ============================================================================
// MODULE CARD V2 COMPONENT
// ============================================================================

interface ModuleCardV2Props {
  module: ModuleV2;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ModuleCardV2 = ({ module, isExpanded, onToggle }: ModuleCardV2Props) => {
  const Icon = module.icon;
  const categoryColor = categoryColors[module.category] || "bg-muted text-muted-foreground";
  
  const visibleOutputs = module.outputs.slice(0, 4);
  const remainingOutputs = module.outputs.length - 4;
  
  const visibleRoles = module.bestFor.slice(0, 3);
  const remainingRoles = module.bestFor.length - 3;

  return (
    <Card 
      id={module.id}
      className={cn(
        "scroll-mt-24 h-full transition-all duration-300 group",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "border-2 hover:border-primary/30",
        isExpanded && "ring-2 ring-primary/20"
      )}
    >
      <CardContent className="p-5 space-y-4">
        {/* Top Row: Icon, Category, Optional Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Large Icon Badge */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 shrink-0 group-hover:from-primary/15 group-hover:to-primary/10 transition-all">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            
            {/* Category Chip */}
            <Badge 
              variant="outline" 
              className={cn("text-[10px] font-medium border", categoryColor)}
            >
              {module.category}
            </Badge>
          </div>
          
          {/* Kiosk Ready + Optional Badges */}
          <div className="flex items-center gap-2">
            {module.kioskReady && (
              <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
                <Monitor className="h-3 w-3 mr-1" />
                Kiosk-ready
              </Badge>
            )}
            {module.optional && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Optional
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground leading-tight">
          {module.name}
        </h3>

        {/* Value Statement */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {module.summary}
        </p>

        {/* Highlights */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Highlights
          </h4>
          <ul className="space-y-1.5">
            {module.highlights.slice(0, 4).map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outputs Chips */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Outputs
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {visibleOutputs.map((output, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-normal bg-muted/50">
                {output}
              </Badge>
            ))}
            {remainingOutputs > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal bg-muted/50">
                +{remainingOutputs} more
              </Badge>
            )}
          </div>
        </div>

        {/* Best For Chips */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Best for
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {visibleRoles.map((role, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {role}
              </Badge>
            ))}
            {remainingRoles > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                +{remainingRoles} more
              </Badge>
            )}
          </div>
        </div>

        {/* Maturity Path */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Maturity Path
            </span>
            <MaturityPath activeStage={module.maturityStage} />
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                isExpanded && "bg-primary/10 text-primary"
              )}
            >
              {isExpanded ? "Hide details" : "Show details"}
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} 
              />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* How Teams Use It */}
            <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/50">
              <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                What teams usually do with this
              </h5>
              <ul className="space-y-1.5">
                {module.details.howTeamsUseIt.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-primary">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sample Artifacts */}
            <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
              <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Sample Report Card
              </h5>
              <div className="text-sm text-muted-foreground space-y-1">
                {module.details.sampleArtifacts.map((artifact, i) => (
                  <p key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {artifact}
                  </p>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
