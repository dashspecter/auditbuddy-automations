import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffNav } from "@/components/staff/StaffNav";
import { ChevronLeft, ChevronRight, RefreshCw, Share } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";

const StaffSchedule = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user, weekStart]);

  const loadData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (empData) {
        setEmployee(empData);
        await loadWeekShifts(empData.id);
      }
    } catch (error) {
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeekShifts = async (employeeId: string) => {
    const weekEnd = addDays(weekStart, 6);
    const { data } = await supabase
      .from("shift_assignments")
      .select(`*, shifts!inner(*, locations(name))`)
      .eq("staff_id", employeeId)
      .gte("shifts.shift_date", weekStart.toISOString().split('T')[0])
      .lte("shifts.shift_date", weekEnd.toISOString().split('T')[0])
      .order("shift_date", { foreignTable: "shifts", ascending: true });

    setShifts(data || []);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), "yyyy-MM-dd");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">My Schedule</h1>
          
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="font-semibold">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="px-4 py-4 space-y-3">
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const isToday = dayStr === today;
          const dayShifts = shifts.filter(s => s.shifts.shift_date === dayStr);

          return (
            <Card 
              key={dayStr} 
              className={`p-4 ${isToday ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{format(day, "EEEE")}</div>
                  <div className="text-sm text-muted-foreground">{format(day, "MMM d")}</div>
                </div>
                {isToday && <Badge>Today</Badge>}
              </div>

              {dayShifts.length > 0 ? (
                <div className="space-y-2">
                  {dayShifts.map((assignment: any) => (
                    <div key={assignment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {assignment.shifts.start_time.slice(0, 5)} - {assignment.shifts.end_time.slice(0, 5)}
                        </span>
                        <Badge variant="secondary">{assignment.shifts.role}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.shifts.locations?.name}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Share className="h-3 w-3 mr-1" />
                          Offer
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Swap
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No shifts scheduled
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <StaffNav />
    </div>
  );
};

export default StaffSchedule;
