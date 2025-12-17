import { useState } from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateCmmsWorkOrder } from "@/hooks/useCmmsWorkOrders";
import { useLocations } from "@/hooks/useLocations";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NewWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId?: string;
  locationId?: string;
}

export function NewWorkOrderDialog({ open, onOpenChange, assetId, locationId }: NewWorkOrderDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const createWorkOrder = useCreateCmmsWorkOrder();
  const { data: locations } = useLocations();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [type, setType] = useState<string>("reactive");
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 2));
  const [selectedLocationId, setSelectedLocationId] = useState(locationId || "");

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    
    if (!selectedLocationId && !assetId) {
      toast({ title: "Select an asset or location", variant: "destructive" });
      return;
    }

    try {
      const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1) as 'Low' | 'Medium' | 'High' | 'Urgent';
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1) as 'Reactive' | 'Preventive' | 'Inspection' | 'Calibration';
      
      await createWorkOrder.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: capitalizedPriority,
        type: capitalizedType,
        due_at: dueDate.toISOString(),
        asset_id: assetId || undefined,
        location_id: selectedLocationId || undefined,
        created_by: user?.id || '',
      });
      
      toast({ title: "Work order created" });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: "Failed to create work order", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setType("reactive");
    setDueDate(addDays(new Date(), 2));
    setSelectedLocationId(locationId || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Work Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Replace compressor gauge"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location {!assetId && '*'}</Label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reactive">Reactive</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or task..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createWorkOrder.isPending}>
            {createWorkOrder.isPending ? "Creating..." : "Create Work Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
