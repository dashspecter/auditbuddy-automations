import { useLocations } from "@/hooks/useLocations";
import { useTerminology } from "@/hooks/useTerminology";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface LocationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  locationCounts?: Record<string, number>;
  allowAll?: boolean;
  id?: string;
}

export const LocationSelector = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  locationCounts,
  allowAll = false,
  id,
}: LocationSelectorProps) => {
  const { location: locationTerm, locations: locationsTerm } = useTerminology();
  const locationLabel = locationTerm();
  const locationsLabel = locationsTerm();
  const locationLabelLower = locationLabel.toLowerCase();
  const { data: locations, isLoading } = useLocations();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? `Select ${locationLabelLower}`} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <SelectItem value="__all__">{`All ${locationsLabel}`}</SelectItem>
        )}
        {locations?.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <div className="flex items-center justify-between w-full gap-2">
              <span>
                {location.name}
                {location.city && ` - ${location.city}`}
              </span>
              {locationCounts && locationCounts[location.id] !== undefined && (
                <Badge variant="secondary" className="ml-auto">
                  {locationCounts[location.id]}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
