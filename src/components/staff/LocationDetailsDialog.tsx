import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationDetailsDialog = ({ open, onOpenChange }: LocationDetailsDialogProps) => {
  const { user } = useAuth();

  const { data: location, isLoading } = useQuery({
    queryKey: ["location-details", user?.id],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from("employees")
        .select("locations(*)")
        .eq("user_id", user?.id)
        .single();

      if (!employee) return null;
      return employee.locations;
    },
    enabled: open && !!user?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Location Details</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : location ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{location.name}</h3>
              {location.address && (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{location.address}</p>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Location Type</p>
                  <p className="text-muted-foreground">{location.type || "Standard"}</p>
                </div>
              </div>
            </div>

            {location.address && (
              <Button asChild className="w-full">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No location assigned
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
