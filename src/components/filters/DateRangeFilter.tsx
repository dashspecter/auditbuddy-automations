import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, subWeeks, startOfYear } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateRangePreset = 
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "custom";

interface DateRangeFilterProps {
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  className?: string;
  showPresets?: boolean;
  defaultPreset?: DateRangePreset;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export const DateRangeFilter = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
  showPresets = true,
  defaultPreset = "last_7_days",
}: DateRangeFilterProps) => {
  const [preset, setPreset] = useState<DateRangePreset>(defaultPreset);

  const handlePresetChange = (value: DateRangePreset) => {
    setPreset(value);
    const now = new Date();

    switch (value) {
      case "today":
        onDateFromChange(now);
        onDateToChange(now);
        break;
      case "last_7_days":
        onDateFromChange(subWeeks(now, 1));
        onDateToChange(now);
        break;
      case "last_30_days":
        onDateFromChange(subMonths(now, 1));
        onDateToChange(now);
        break;
      case "this_month":
        onDateFromChange(startOfMonth(now));
        onDateToChange(endOfMonth(now));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        onDateFromChange(startOfMonth(lastMonth));
        onDateToChange(endOfMonth(lastMonth));
        break;
      case "last_3_months":
        onDateFromChange(subMonths(now, 3));
        onDateToChange(now);
        break;
      case "this_year":
        onDateFromChange(startOfYear(now));
        onDateToChange(now);
        break;
      case "custom":
        // Keep current dates for custom
        break;
    }
  };

  const handleClearDates = () => {
    onDateFromChange(undefined);
    onDateToChange(undefined);
    setPreset("custom");
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showPresets && (
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal min-w-[130px]",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                onDateFromChange(date);
                setPreset("custom");
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">-</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal min-w-[130px]",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                onDateToChange(date);
                setPreset("custom");
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDates}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
