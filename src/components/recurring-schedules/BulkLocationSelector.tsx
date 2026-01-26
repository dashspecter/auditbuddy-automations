import { useState } from 'react';
import { Check, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Location {
  id: string;
  name: string;
  city?: string | null;
}

interface BulkLocationSelectorProps {
  locations: Location[];
  selectedLocationIds: string[];
  onSelectionChange: (locationIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select location picker for bulk scheduling.
 * Allows creating the same schedule for multiple locations at once.
 */
export const BulkLocationSelector = ({
  locations,
  selectedLocationIds,
  onSelectionChange,
  disabled = false,
}: BulkLocationSelectorProps) => {
  const [open, setOpen] = useState(false);

  const toggleLocation = (locationId: string) => {
    if (selectedLocationIds.includes(locationId)) {
      onSelectionChange(selectedLocationIds.filter((id) => id !== locationId));
    } else {
      onSelectionChange([...selectedLocationIds, locationId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(locations.map((l) => l.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedLocations = locations.filter((l) =>
    selectedLocationIds.includes(l.id)
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
            disabled={disabled}
          >
            <MapPin className="h-4 w-4 mr-2 shrink-0" />
            {selectedLocationIds.length === 0 ? (
              <span className="text-muted-foreground">Select locations...</span>
            ) : selectedLocationIds.length === 1 ? (
              <span>{selectedLocations[0]?.name}</span>
            ) : (
              <span>{selectedLocationIds.length} locations selected</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium">Select Locations</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={selectAll}>
                All
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                None
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                  onClick={() => toggleLocation(location.id)}
                >
                  <Checkbox
                    checked={selectedLocationIds.includes(location.id)}
                    onCheckedChange={() => toggleLocation(location.id)}
                  />
                  <span className="text-sm flex-1 truncate">
                    {location.name}
                    {location.city && (
                      <span className="text-muted-foreground"> - {location.city}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedLocationIds.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {selectedLocations.map((location) => (
            <Badge
              key={location.id}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => toggleLocation(location.id)}
            >
              {location.name}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
