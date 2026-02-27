import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Umbrella, Calendar, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VacationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VacationDetailsDialog = ({ open, onOpenChange }: VacationDetailsDialogProps) => {
  const { user } = useAuth();

  const { data: vacationData, isLoading } = useQuery({
    queryKey: ["vacation-details", user?.id],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id, annual_vacation_days")
        .eq("user_id", user?.id)
        .single();

      if (!employee) return null;

      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      // Get approved time off requests for this year
      const { data: timeOffRequests, error } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("status", "approved")
        .gte("start_date", startOfYear)
        .lte("end_date", endOfYear);

      if (error) throw error;

      // Calculate used days
      const usedDays = timeOffRequests?.reduce((total, request) => {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0) || 0;

      const totalDays = employee.annual_vacation_days || 21;
      const remaining = totalDays - usedDays;

      return {
        totalDays,
        usedDays,
        remaining,
        upcomingRequests: timeOffRequests?.filter((r: any) => 
          new Date(r.start_date) > new Date()
        ) || []
      };
    },
    enabled: open && !!user?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vacation Days</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : vacationData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {vacationData.totalDays}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Days</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {vacationData.usedDays}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Used</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {vacationData.remaining}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Remaining</div>
              </div>
            </div>

            {/* Upcoming Time Off */}
            {vacationData.upcomingRequests.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Time Off
                </h4>
                <div className="space-y-2">
                  {vacationData.upcomingRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{request.request_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Approved</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Umbrella className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Plan ahead</p>
                  <p>Use the Requests tab to submit new vacation requests or modify existing ones.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No vacation data available
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
