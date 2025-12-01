import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ManagerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManagerDetailsDialog = ({ open, onOpenChange }: ManagerDetailsDialogProps) => {
  const { user } = useAuth();

  const { data: manager, isLoading } = useQuery({
    queryKey: ["manager-details", user?.id],
    queryFn: async () => {
      // Get employee's location
      const { data: employee } = await supabase
        .from("employees")
        .select("location_id, locations(name)")
        .eq("user_id", user?.id)
        .single();

      if (!employee) return null;

      // Get manager (user with manager role at same location)
      const { data: companyUsers } = await supabase
        .from("company_users")
        .select("user_id, company_role")
        .eq("company_role", "manager")
        .limit(1)
        .single();

      if (!companyUsers) return null;

      // Get manager profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", companyUsers.user_id)
        .single();

      if (error) throw error;
      return { ...profile, location: employee.locations };
    },
    enabled: open && !!user?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manager Details</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : manager ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={manager.avatar_url} />
                <AvatarFallback className="text-lg">
                  {manager.full_name?.[0] || "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{manager.full_name}</h3>
                <p className="text-sm text-muted-foreground">Location Manager</p>
              </div>
            </div>

            <div className="space-y-3">
              {manager.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${manager.email}`} className="text-primary hover:underline">
                    {manager.email}
                  </a>
                </div>
              )}

              {manager.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{manager.location.name}</span>
                </div>
              )}
            </div>

            {manager.email && (
              <Button asChild className="w-full">
                <a href={`mailto:${manager.email}`}>Send Email</a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No manager assigned
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
