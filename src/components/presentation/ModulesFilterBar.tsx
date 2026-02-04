import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type CategoryFilter = "All" | "Operations" | "Quality" | "People" | "Assets" | "Finance" | "AI";

const categories: CategoryFilter[] = ["All", "Operations", "Quality", "People", "Assets", "Finance", "AI"];

const categoryIcons: Record<CategoryFilter, string> = {
  All: "🎯",
  Operations: "📊",
  Quality: "✅",
  People: "👥",
  Assets: "🔧",
  Finance: "💰",
  AI: "🤖",
};

// ============================================================================
// FILTER BAR COMPONENT
// ============================================================================

interface ModulesFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  showRecommended: boolean;
  onShowRecommendedChange: (show: boolean) => void;
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  resultCount: number;
}

export const ModulesFilterBar = ({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  showRecommended,
  onShowRecommendedChange,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  resultCount,
}: ModulesFilterBarProps) => {
  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b py-4 -mx-6 lg:-mx-10 xl:-mx-12 px-6 lg:px-10 xl:px-12 space-y-4">
      {/* Top Row: Search + Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Show Recommended Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={showRecommended}
              onCheckedChange={onShowRecommendedChange}
            />
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Recommended bundle
            </span>
          </label>

          {/* Expand/Collapse Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExpandAll}
              className="text-xs gap-1.5"
              disabled={allExpanded}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCollapseAll}
              className="text-xs gap-1.5"
              disabled={!allExpanded}
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Collapse all
            </Button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              activeCategory === category
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{categoryIcons[category]}</span>
            {category}
          </button>
        ))}
        
        {/* Results count */}
        <Badge variant="outline" className="ml-auto text-xs">
          {resultCount} module{resultCount !== 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
};
