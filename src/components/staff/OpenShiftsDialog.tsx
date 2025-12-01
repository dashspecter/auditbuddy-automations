import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OpenShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OpenShiftsDialog = ({ open, onOpenChange }: OpenShiftsDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: openShifts, isLoading } = useQuery({
    queryKey: ["open-shifts", user?.id],
    queryFn: async () => {
      // Get employee's location
      const { data: employee } = await supabase
        .from("employees")
        .select("id, location_id")
        .eq("user_id", user?.id)
        .single();

      if (!employee) return [];

      const today = new Date().toISOString().split('T')[0];
      
      // Get shifts without assignments at same location
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select(`
          *,
          locations(name),
          shift_assignments(id)
        `)
        .eq("location_id", employee.location_id)
        .gte("shift_date", today)
        .order("shift_date", { ascending: true })
        .limit(20);

      if (error) throw error;

      // Filter shifts with no assignments or open slots
      return shifts?.filter((shift: any) => 
        !shift.shift_assignments || shift.shift_assignments.length < (shift.required_staff || 1)
      ) || [];
    },
    enabled: open && !!user?.id,
  });

  const claimShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!employee) throw new Error("Employee not found");

      const { error } = await supabase
        .from("shift_assignments")
        .insert([{
          shift_id: shiftId,
          staff_id: employee.id,
          assigned_by: user?.id || "",
          status: "pending"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift claimed! Awaiting manager approval");
      queryClient.invalidateQueries({ queryKey: ["open-shifts"] });
    },
    onError: (error: any) => {
      toast.error("Failed to claim shift: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open Shifts</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : openShifts && openShifts.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {openShifts.map((shift: any) => (
              <div key={shift.id} className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(shift.shift_date), "EEE, MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{shift.start_time} - {shift.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{shift.locations?.name}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">Open</Badge>
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => claimShift.mutate(shift.id)}
                  disabled={claimShift.isPending}
                >
                  {claimShift.isPending ? "Claiming..." : "Claim Shift"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No open shifts available
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
