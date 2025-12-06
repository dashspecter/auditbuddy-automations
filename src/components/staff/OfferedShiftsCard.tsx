import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandHeart, ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";

export const OfferedShiftsCard = () => {
  const navigate = useNavigate();

  const { data: offeredShifts = [], isLoading } = useQuery({
    queryKey: ["offered-shifts-manager"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get manager's company
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id, location_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!empData) return [];

      // Get offered shifts (shifts that staff have put up for grabs)
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          notes,
          employees:staff_id (
            full_name,
            role
          ),
          shifts:shift_id!inner (
            id,
            shift_date,
            start_time,
            end_time,
            role,
            locations:location_id (
              name
            )
          )
        `)
        .eq("status", "offered")
        .gte("shifts.shift_date", today)
        .order("shift_date", { foreignTable: "shifts", ascending: true })
        .limit(5);

      if (error) {
        console.error("Error loading offered shifts:", error);
        return [];
      }

      return data || [];
    },
  });

  if (isLoading) {
    return null;
  }

  if (offeredShifts.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <HandHeart className="h-4 w-4 text-amber-500" />
          Offered Shifts
        </h3>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
          {offeredShifts.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {offeredShifts.slice(0, 3).map((assignment: any) => {
          const shiftDate = new Date(assignment.shifts.shift_date);
          const isShiftToday = isToday(shiftDate);
          
          return (
            <div 
              key={assignment.id} 
              className={`p-2 rounded-lg border text-sm ${
                isShiftToday 
                  ? "bg-amber-500/10 border-amber-500/30" 
                  : "bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{assignment.employees?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(shiftDate, "EEE, MMM d")} • {assignment.shifts.start_time.slice(0, 5)} - {assignment.shifts.end_time.slice(0, 5)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {assignment.shifts.role}
                    </Badge>
                    {assignment.shifts.locations?.name && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {assignment.shifts.locations.name}
                      </span>
                    )}
                  </div>
                </div>
                {isShiftToday && (
                  <Badge className="bg-amber-500 text-white text-[10px] shrink-0">Today</Badge>
                )}
              </div>
              {assignment.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate">
                  "{assignment.notes}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {offeredShifts.length > 3 && (
        <Button 
          variant="link" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => navigate("/staff/shift-pool")}
        >
          View All ({offeredShifts.length}) <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        Staff-offered shifts awaiting claim
      </p>
    </Card>
  );
};