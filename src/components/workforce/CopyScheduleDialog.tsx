import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarIcon, Copy, Loader2, Users, MapPin, ArrowRight } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useCopySchedule } from "@/hooks/useCopySchedule";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";

interface CopyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CopyScheduleDialog = ({ open, onOpenChange }: CopyScheduleDialogProps) => {
  const [sourceStartDate, setSourceStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sourceEndDate, setSourceEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [periodType, setPeriodType] = useState<"week" | "2weeks" | "month" | "custom">("week");
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  const { data: locations = [] } = useLocations();
  const { data: employees = [] } = useEmployees();
  const copySchedule = useCopySchedule();

  const handlePeriodTypeChange = (type: "week" | "2weeks" | "month" | "custom") => {
    setPeriodType(type);
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });

    switch (type) {
      case "week":
        setSourceStartDate(weekStart);
        setSourceEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case "2weeks":
        setSourceStartDate(weekStart);
        setSourceEndDate(addDays(endOfWeek(today, { weekStartsOn: 1 }), 7));
        break;
      case "month":
        setSourceStartDate(weekStart);
        setSourceEndDate(addDays(weekStart, 27)); // ~4 weeks
        break;
      case "custom":
        // Keep current dates for custom
        break;
    }
  };

  const handleCopy = async () => {
    await copySchedule.mutateAsync({
      sourceStartDate: format(sourceStartDate, "yyyy-MM-dd"),
      sourceEndDate: format(sourceEndDate, "yyyy-MM-dd"),
      numberOfCopies,
      locationId: selectedLocation === "all" ? undefined : selectedLocation,
      employeeId: selectedEmployee === "all" ? undefined : selectedEmployee,
      includeAssignments,
    });
    onOpenChange(false);
  };

  const periodDays = differenceInDays(sourceEndDate, sourceStartDate) + 1;
  const targetEndDate = addDays(sourceEndDate, periodDays * numberOfCopies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Schedule Forward
          </DialogTitle>
          <DialogDescription>
            Copy shifts from a source period to future dates. Perfect for repeating weekly patterns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Period Type */}
          <div className="space-y-2">
            <Label>Source Period</Label>
            <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Current Week</SelectItem>
                <SelectItem value="2weeks">Two Weeks</SelectItem>
                <SelectItem value="month">Four Weeks</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Display/Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !sourceStartDate && "text-muted-foreground"
                    )}
                    disabled={periodType !== "custom"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(sourceStartDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={sourceStartDate}
                    onSelect={(date) => date && setSourceStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !sourceEndDate && "text-muted-foreground"
                    )}
                    disabled={periodType !== "custom"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(sourceEndDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={sourceEndDate}
                    onSelect={(date) => date && setSourceEndDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Number of Copies */}
          <div className="space-y-2">
            <Label>Copy Forward</Label>
            <Select value={String(numberOfCopies)} onValueChange={(v) => setNumberOfCopies(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {periodType === "week" ? "week" : "period"}{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <MapPin className="h-3 w-3" />
                Location
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <Users className="h-3 w-3" />
                Employee
              </Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Include Assignments */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Include Staff Assignments</Label>
              <p className="text-xs text-muted-foreground">
                Copy approved assignments to new shifts
              </p>
            </div>
            <Switch checked={includeAssignments} onCheckedChange={setIncludeAssignments} />
          </div>

          {/* Preview */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Period: </span>
                <span className="font-medium">{periodDays} days</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Until: </span>
                <span className="font-medium">{format(targetEndDate, "MMM d, yyyy")}</span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={copySchedule.isPending}>
            {copySchedule.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
