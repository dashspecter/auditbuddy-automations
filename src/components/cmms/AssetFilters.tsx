import { useState } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/hooks/useLocations";
import { useCmmsAssetCategories } from "@/hooks/useCmmsAssets";

export interface AssetFilterValues {
  locationId?: string;
  categoryId?: string;
  status?: string;
  criticality?: string;
}

interface AssetFiltersProps {
  filters: AssetFilterValues;
  onFiltersChange: (filters: AssetFilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: "Operational", label: "Operational" },
  { value: "Under Maintenance", label: "Under Maintenance" },
  { value: "Out of Service", label: "Out of Service" },
];

const CRITICALITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

export function AssetFilters({ filters, onFiltersChange }: AssetFiltersProps) {
  const { data: locations } = useLocations();
  const { data: categories } = useCmmsAssetCategories();

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = (key: keyof AssetFilterValues) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getLocationName = (id?: string) => locations?.find(l => l.id === id)?.name;
  const getCategoryName = (id?: string) => categories?.find(c => c.id === id)?.name;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Location Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={filters.locationId ? "secondary" : "outline"} 
            size="sm" 
            className="h-7 text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            Location
            {filters.locationId && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {getLocationName(filters.locationId)}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover">
          {locations?.map((location) => (
            <DropdownMenuItem
              key={location.id}
              onClick={() => onFiltersChange({ ...filters, locationId: location.id })}
            >
              {location.name}
            </DropdownMenuItem>
          ))}
          {(!locations || locations.length === 0) && (
            <DropdownMenuItem disabled>No locations available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Category Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={filters.categoryId ? "secondary" : "outline"} 
            size="sm" 
            className="h-7 text-xs"
          >
            Category
            {filters.categoryId && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {getCategoryName(filters.categoryId)}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover">
          {categories?.map((category) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => onFiltersChange({ ...filters, categoryId: category.id })}
            >
              {category.name}
            </DropdownMenuItem>
          ))}
          {(!categories || categories.length === 0) && (
            <DropdownMenuItem disabled>No categories available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={filters.status ? "secondary" : "outline"} 
            size="sm" 
            className="h-7 text-xs"
          >
            Status
            {filters.status && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.status}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, status: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Criticality Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={filters.criticality ? "secondary" : "outline"} 
            size="sm" 
            className="h-7 text-xs"
          >
            Criticality
            {filters.criticality && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.criticality}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover">
          {CRITICALITY_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, criticality: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs text-destructive hover:text-destructive"
          onClick={clearAllFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
}
