import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Clock, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface StaffCheckpointsCardProps {
  employeeId: string;
  companyId: string;
  locationId: string;
}

export function StaffCheckpointsCard({ employeeId, companyId, locationId }: StaffCheckpointsCardProps) {
  const navigate = useNavigate();

  // Fetch active form assignments for this location
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["staff-checkpoints", companyId, locationId],
    queryFn: async () => {
      // Get all active assignments for employee's location
      const { data, error } = await supabase
        .from("location_form_templates")
        .select(`
          *,
          form_templates(name, category, type),
          locations!location_form_templates_location_id_fkey(name)
        `)
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!locationId,
  });

  // Fetch today's submissions for these assignments
  const { data: todaySubmissions } = useQuery({
    queryKey: ["staff-checkpoint-submissions", companyId, locationId],
    queryFn: async () => {
      if (!assignments?.length) return [];
      const today = new Date();
      const { data, error } = await supabase
        .from("form_submissions")
        .select("id, location_form_template_id, status, data, created_at, submitted_at")
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .gte("created_at", format(today, "yyyy-MM-dd") + "T00:00:00")
        .lte("created_at", format(today, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!assignments?.length,
  });

  if (isLoading || !assignments?.length) return null;

  // Calculate checkpoint status per assignment
  const checkpointStatus = assignments.map((a: any) => {
    const overrides = (a.overrides as any) || {};
    const checkpointTimes: string[] = overrides.checkpointTimes || [];
    const submissions = todaySubmissions?.filter(s => s.location_form_template_id === a.id) || [];
    
    // For each checkpoint time, check if there's a submission covering it
    const now = new Date();
    const currentTime = format(now, "HH:mm");
    
    const timeStatuses = checkpointTimes.map(time => {
      // Check if this time has been submitted
      const hasSubmission = submissions.some(s => {
        const data = s.data as any;
        if (data?.grid) {
          const day = now.getDate();
          return data.grid[day]?.[time] && Object.values(data.grid[day][time]).some((v: any) => v !== "" && v !== null);
        }
        return false;
      });
      
      const isPast = time <= currentTime;
      const isDue = !hasSubmission && isPast;
      const isUpcoming = !hasSubmission && !isPast;
      
      return { time, hasSubmission, isDue, isUpcoming };
    });

    const completedCount = timeStatuses.filter(t => t.hasSubmission).length;
    const dueCount = timeStatuses.filter(t => t.isDue).length;
    const totalCount = checkpointTimes.length;

    return {
      ...a,
      checkpointTimes,
      timeStatuses,
      completedCount,
      dueCount,
      totalCount,
    };
  }).filter(a => a.totalCount > 0); // Only show assignments with checkpoint times

  if (!checkpointStatus.length) return null;

  const totalDue = checkpointStatus.reduce((sum, a) => sum + a.dueCount, 0);

  return (
    <Card className={`p-4 shadow-lg ${totalDue > 0 ? "border-orange-400/50 bg-orange-50/30 dark:bg-orange-950/10" : "border-primary/20"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Checkpoints</span>
        </div>
        {totalDue > 0 && (
          <Badge variant="destructive" className="text-xs">
            {totalDue} due
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {checkpointStatus.map((a) => (
          <div key={a.id} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{(a as any).form_templates?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {a.timeStatuses.map((ts) => (
                  <div
                    key={ts.time}
                    className={`flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 ${
                      ts.hasSubmission
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : ts.isDue
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ts.hasSubmission ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : ts.isDue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {ts.time}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground ml-2">
              {a.completedCount}/{a.totalCount}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 gap-2"
        onClick={() => navigate("/staff/checkpoints")}
      >
        <QrCode className="h-4 w-4" />
        Scan QR to Complete
        <ChevronRight className="h-3 w-3 ml-auto" />
      </Button>
    </Card>
  );
}
