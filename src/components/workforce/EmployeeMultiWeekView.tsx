import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isWithinInterval, parseISO, getISOWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Palmtree, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShifts } from "@/hooks/useShifts";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";

interface EmployeeMultiWeekViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  employeeAvatarUrl?: string | null;
  locationId?: string;
  initialWeekStart: Date;
  onCreateShift: (date: Date) => void;
  onEditShift: (shift: any) => void;
}

export const EmployeeMultiWeekView = ({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  employeeRole,
  employeeAvatarUrl,
  locationId,
  initialWeekStart,
  onCreateShift,
  onEditShift,
}: EmployeeMultiWeekViewProps) => {
  const { t } = useTranslation();
  const [weekSpan, setWeekSpan] = useState<2 | 4>(2);
  const [rangeStart, setRangeStart] = useState(() => startOfWeek(initialWeekStart, { weekStartsOn: 1 }));

  const rangeEnd = addDays(rangeStart, 7 * weekSpan - 1);

  const { data: shifts = [] } = useShifts(
    locationId && locationId !== "all" ? locationId : undefined,
    format(rangeStart, "yyyy-MM-dd"),
    format(rangeEnd, "yyyy-MM-dd")
  );

  const { data: timeOffRequests = [] } = useTimeOffRequests(
    format(rangeStart, "yyyy-MM-dd"),
    format(rangeEnd, "yyyy-MM-dd")
  );

  // Filter shifts for this employee only
  const employeeShifts = useMemo(
    () =>
      shifts.filter((s) =>
        s.shift_assignments?.some(
          (sa: any) => sa.staff_id === employeeId && sa.approval_status === "approved"
        )
      ),
    [shifts, employeeId]
  );

  // Build weeks array
  const weeks = useMemo(() => {
    const result: { weekStart: Date; weekNumber: number; days: Date[] }[] = [];
    for (let w = 0; w < weekSpan; w++) {
      const ws = addWeeks(rangeStart, w);
      result.push({
        weekStart: ws,
        weekNumber: getISOWeek(ws),
        days: Array.from({ length: 7 }, (_, i) => addDays(ws, i)),
      });
    }
    return result;
  }, [rangeStart, weekSpan]);

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return employeeShifts.filter((s) => s.shift_date === dateStr);
  };

  const getTimeOffForDay = (date: Date) => {
    return timeOffRequests.find(
      (req) =>
        req.employee_id === employeeId &&
        req.status === "approved" &&
        isWithinInterval(date, {
          start: parseISO(req.start_date),
          end: parseISO(req.end_date),
        })
    );
  };

  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employeeAvatarUrl || undefined} />
              <AvatarFallback>
                {employeeName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-lg">{employeeName}</SheetTitle>
              {employeeRole && (
                <p className="text-sm text-muted-foreground">{employeeRole}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Navigation + span toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setRangeStart(subWeeks(rangeStart, weekSpan))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(rangeStart, "MMM dd")} – {format(rangeEnd, "MMM dd, yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setRangeStart(addWeeks(rangeStart, weekSpan))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <ToggleGroup
            type="single"
            value={String(weekSpan)}
            onValueChange={(v) => v && setWeekSpan(Number(v) as 2 | 4)}
          >
            <ToggleGroupItem value="2" className="text-xs px-3">2W</ToggleGroupItem>
            <ToggleGroupItem value="4" className="text-xs px-3">4W</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 bg-muted/50 border-b">
            <div className="p-2 border-r text-xs font-medium text-muted-foreground flex items-center">
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              Week
            </div>
            {dayHeaders.map((d) => (
              <div key={d} className="p-2 border-r last:border-r-0 text-xs font-medium text-center text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {weeks.map((week) => (
            <div key={week.weekNumber} className="grid grid-cols-8 border-b last:border-b-0">
              {/* Week label */}
              <div className="p-2 border-r bg-muted/30 flex items-center justify-center">
                <Badge variant="outline" className="text-xs font-medium">
                  W{week.weekNumber}
                </Badge>
              </div>

              {/* Day cells */}
              {week.days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === todayStr;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const dayShifts = getShiftsForDay(day);
                const timeOff = getTimeOffForDay(day);

                return (
                  <div
                    key={dateStr}
                    className={`p-1.5 border-r last:border-r-0 min-h-[72px] cursor-pointer hover:bg-accent/30 transition-colors ${
                      isToday ? "bg-primary/10 ring-1 ring-inset ring-primary/20" : isWeekend ? "bg-muted/20" : ""
                    }`}
                    onClick={() => {
                      if (!timeOff && dayShifts.length === 0) {
                        onCreateShift(day);
                      }
                    }}
                  >
                    {/* Date number */}
                    <div className={`text-[10px] mb-1 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </div>

                    {timeOff ? (
                      <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] p-1 rounded text-center">
                        <Palmtree className="h-3 w-3 mx-auto mb-0.5" />
                        <span className="capitalize">{timeOff.request_type || "Off"}</span>
                      </div>
                    ) : dayShifts.length > 0 ? (
                      dayShifts.map((shift) => (
                        <Tooltip key={shift.id}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditShift(shift);
                              }}
                              className="text-[10px] p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow mb-0.5"
                              style={{
                                backgroundColor: `${(shift as any).employee_roles?.color || "#6366f1"}20`,
                                borderColor: (shift as any).employee_roles?.color || "#6366f1",
                              }}
                            >
                              <div className="font-medium truncate">{shift.role}</div>
                              <div className="text-muted-foreground">
                                {shift.start_time?.slice(0, 5)}-{shift.end_time?.slice(0, 5)}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{shift.role}: {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}</p>
                            {shift.locations?.name && <p className="text-xs">📍 {shift.locations.name}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-[calc(100%-16px)] opacity-0 hover:opacity-40 transition-opacity">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {employeeShifts.length} shift{employeeShifts.length !== 1 ? "s" : ""} in {weekSpan} weeks
          </span>
          {timeOffRequests.filter((r) => r.employee_id === employeeId && r.status === "approved").length > 0 && (
            <span className="flex items-center gap-1">
              <Palmtree className="h-3.5 w-3.5 text-red-500" />
              {timeOffRequests.filter((r) => r.employee_id === employeeId && r.status === "approved").length} time-off day(s)
            </span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
