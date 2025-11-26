import { useLocations } from "@/hooks/useLocations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

interface LocationMultiSelectorProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const LocationMultiSelector = ({
  value,
  onValueChange,
  placeholder = "Select locations",
  disabled = false,
}: LocationMultiSelectorProps) => {
  const { data: locations, isLoading } = useLocations();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const selectedLocations = locations?.filter((loc) => value.includes(loc.id)) || [];

  const toggleLocation = (locationId: string) => {
    if (value.includes(locationId)) {
      onValueChange(value.filter((id) => id !== locationId));
    } else {
      onValueChange([...value, locationId]);
    }
  };

  const removeLocation = (locationId: string) => {
    onValueChange(value.filter((id) => id !== locationId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {value.length === 0 ? placeholder : `${value.length} location(s) selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search locations..." />
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {locations?.map((location) => (
                <CommandItem
                  key={location.id}
                  value={location.name}
                  onSelect={() => toggleLocation(location.id)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      value.includes(location.id) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {location.name}
                  {location.city && <span className="ml-2 text-muted-foreground">- {location.city}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((location) => (
            <Badge key={location.id} variant="secondary" className="gap-1">
              {location.name}
              <button
                type="button"
                onClick={() => removeLocation(location.id)}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
