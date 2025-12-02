import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export const ManagerDashboardStats = () => {
  const navigate = useNavigate();
  const { data: todayStaff, isLoading: staffLoading } = useQuery({
    queryKey: ["today-working-staff"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          employees:staff_id (
            full_name,
            role,
            avatar_url
          ),
          shifts:shift_id (
            shift_date,
            start_time,
            end_time,
            role,
            locations:location_id (
              name
            )
          )
        `)
        .eq("approval_status", "approved")
        .eq("shifts.shift_date", today);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ["team-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get manager's company
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id, location_id")
        .eq("user_id", user.id)
        .single();
      
      if (!empData) return null;

      // Get total team members
      const { count: totalStaff } = await supabase
        .from("employees")
        .select("*", { count: 'exact', head: true })
        .eq("company_id", empData.company_id)
        .eq("status", "active");

      // Get upcoming shifts count
      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingShifts } = await supabase
        .from("shifts")
        .select("*", { count: 'exact', head: true })
        .eq("location_id", empData.location_id)
        .gte("shift_date", today);

      return {
        totalStaff: totalStaff || 0,
        upcomingShifts: upcomingShifts || 0,
        workingToday: todayStaff?.length || 0,
      };
    },
  });

  if (staffLoading || statsLoading) {
    return (
      <Card className="p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors touch-target"
          onClick={() => navigate("/staff/team")}
        >
          <Users className="h-4 w-4 text-primary mb-1" />
          <div className="text-xl font-bold">{teamStats?.totalStaff || 0}</div>
          <div className="text-[10px] text-muted-foreground">Team Size</div>
        </Card>
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors touch-target"
          onClick={() => navigate("/staff/manager-schedule")}
        >
          <Clock className="h-4 w-4 text-primary mb-1" />
          <div className="text-xl font-bold">{todayStaff?.length || 0}</div>
          <div className="text-[10px] text-muted-foreground">Working Today</div>
        </Card>
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors touch-target"
          onClick={() => navigate("/staff/manager-schedule")}
        >
          <Calendar className="h-4 w-4 text-primary mb-1" />
          <div className="text-xl font-bold">{teamStats?.upcomingShifts || 0}</div>
          <div className="text-[10px] text-muted-foreground">Upcoming</div>
        </Card>
      </div>

      {/* Who's Working Today */}
      {todayStaff && todayStaff.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Working Today
            </h3>
            <Badge variant="secondary">{todayStaff.length}</Badge>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayStaff.slice(0, 5).map((assignment: any) => (
              <div key={assignment.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <div className="flex-1">
                  <div className="font-medium">{assignment.employees?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.shifts?.start_time?.slice(0, 5)} - {assignment.shifts?.end_time?.slice(0, 5)} • {assignment.shifts?.role}
                  </div>
                </div>
                {assignment.shifts?.locations?.name && (
                  <Badge variant="outline" className="text-[10px]">
                    {assignment.shifts.locations.name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {todayStaff.length > 5 && (
            <div className="text-xs text-center text-muted-foreground mt-2">
              +{todayStaff.length - 5} more
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
