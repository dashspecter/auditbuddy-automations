import { useLocations } from "@/hooks/useLocations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const LocationSelector = ({
  value,
  onValueChange,
  placeholder = "Select location",
  disabled = false,
}: LocationSelectorProps) => {
  const { data: locations, isLoading } = useLocations();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {locations?.map((location) => (
          <SelectItem key={location.id} value={location.name}>
            {location.name}
            {location.city && ` - ${location.city}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
