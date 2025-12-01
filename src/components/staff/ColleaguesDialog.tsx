import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ColleaguesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ColleaguesDialog = ({ open, onOpenChange }: ColleaguesDialogProps) => {
  const { user } = useAuth();

  const { data: colleagues, isLoading } = useQuery({
    queryKey: ["colleagues-at-work", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current employee
      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("location_id")
        .eq("user_id", user?.id)
        .single();

      if (!currentEmployee) return [];

      // Get all employees working today at same location
      const { data, error } = await supabase
        .from("shift_assignments")
        .select(`
          *,
          shifts!inner(shift_date, start_time, end_time, location_id),
          employees!inner(id, full_name, avatar_url, role)
        `)
        .eq("shifts.shift_date", today)
        .eq("shifts.location_id", currentEmployee.location_id)
        .neq("employees.user_id", user?.id);

      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Colleagues at Work Today</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : colleagues && colleagues.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {colleagues.map((colleague: any) => (
              <div key={colleague.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar>
                  <AvatarImage src={colleague.employees.avatar_url} />
                  <AvatarFallback>{colleague.employees.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{colleague.employees.full_name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {colleague.employees.role}
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{colleague.shifts.start_time}</p>
                  <p>{colleague.shifts.end_time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No colleagues scheduled today
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
