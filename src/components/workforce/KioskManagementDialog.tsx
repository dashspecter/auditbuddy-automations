import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/hooks/useLocations";
import { useDepartments } from "@/hooks/useDepartments";
import { 
  useAttendanceKiosks, 
  useCreateKiosk, 
  useDeleteKiosk 
} from "@/hooks/useAttendanceKiosks";
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Tablet, 
  MapPin,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface KioskManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KioskManagementDialog = ({
  open,
  onOpenChange,
}: KioskManagementDialogProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [deviceName, setDeviceName] = useState("Attendance Kiosk");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { data: locations = [] } = useLocations();
  const { data: departments = [] } = useDepartments();
  const { data: kiosks = [], isLoading } = useAttendanceKiosks();
  const createKiosk = useCreateKiosk();
  const deleteKiosk = useDeleteKiosk();

  const handleCreate = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }
    
    await createKiosk.mutateAsync({
      locationId: selectedLocation,
      deviceName,
      departmentId: selectedDepartment || undefined,
    });
    
    setSelectedLocation("");
    setSelectedDepartment("");
    setDeviceName("Attendance Kiosk");
  };

  const getKioskUrl = (kiosk: any) => {
    // Prefer custom_slug over device_token for cleaner URLs
    const identifier = kiosk.custom_slug || kiosk.device_token;
    return `${window.location.origin}/kiosk/${identifier}`;
  };

  const copyUrl = (kiosk: any) => {
    navigator.clipboard.writeText(getKioskUrl(kiosk));
    setCopiedId(kiosk.id);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openKiosk = (kiosk: any) => {
    window.open(getKioskUrl(kiosk), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Attendance Kiosks</DialogTitle>
          <DialogDescription>
            Register devices as attendance kiosks for your locations. 
            Each kiosk displays a dynamic QR code that employees scan to check in/out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new kiosk */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register New Kiosk
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department (optional)</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Device Name</Label>
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., Front Desk Tablet"
                />
              </div>
            </div>
            <Button 
              className="mt-4 w-full" 
              onClick={handleCreate}
              disabled={createKiosk.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createKiosk.isPending ? "Creating..." : "Create Kiosk"}
            </Button>
          </Card>

          {/* Existing kiosks */}
          <div>
            <h3 className="font-semibold mb-3">Registered Kiosks</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : kiosks.length === 0 ? (
              <Card className="p-8 text-center">
                <Tablet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No kiosks registered yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {kiosks.map((kiosk) => (
                  <Card key={kiosk.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Tablet className="h-4 w-4 text-primary" />
                          <span className="font-medium">{kiosk.device_name}</span>
                          <Badge variant={kiosk.is_active ? "default" : "secondary"}>
                            {kiosk.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3" />
                          {kiosk.locations?.name}
                        </div>
                        {(kiosk as any).custom_slug && (
                          <div className="text-xs font-mono text-primary/70 mb-2">
                            /kiosk/{(kiosk as any).custom_slug}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Registered: {format(new Date(kiosk.registered_at), "MMM d, yyyy")}
                          {kiosk.last_active_at && (
                            <> • Last active: {format(new Date(kiosk.last_active_at), "MMM d, h:mm a")}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyUrl(kiosk)}
                        >
                          {copiedId === kiosk.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openKiosk(kiosk)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteKiosk.mutate(kiosk.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Register a kiosk for each location where you want attendance tracking</li>
              <li>Open the kiosk URL on a tablet or dedicated device at the location</li>
              <li>The kiosk displays a QR code that refreshes every 30 seconds</li>
              <li>Employees scan the QR code with their phone to check in/out</li>
              <li>The dynamic QR prevents screenshots and ensures physical presence</li>
            </ol>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
