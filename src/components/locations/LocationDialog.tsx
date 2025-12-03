import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCreateLocation, useUpdateLocation, Location } from "@/hooks/useLocations";
import { useLocationOperatingSchedules, useSaveLocationOperatingSchedules } from "@/hooks/useLocationOperatingSchedules";
import { Clock, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Geocode an address to coordinates
const geocodeAddress = async (address?: string, city?: string): Promise<{ latitude: number; longitude: number } | null> => {
  const searchQuery = [address, city].filter(Boolean).join(', ');
  if (!searchQuery) return null;
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      { headers: { 'User-Agent': 'DashspectApp/1.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.length === 0) return null;
    
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
};

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  manager_id: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export const LocationDialog = ({ open, onOpenChange, location }: LocationDialogProps) => {
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const saveSchedules = useSaveLocationOperatingSchedules();
  const { data: existingSchedules } = useLocationOperatingSchedules(location?.id);

  const [operatingHours, setOperatingHours] = useState<
    Record<number, { open_time: string; close_time: string; is_closed: boolean }>
  >({});

  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0) {
      const scheduleMap = existingSchedules.reduce((acc, schedule) => {
        acc[schedule.day_of_week] = {
          open_time: schedule.open_time,
          close_time: schedule.close_time,
          is_closed: schedule.is_closed,
        };
        return acc;
      }, {} as Record<number, { open_time: string; close_time: string; is_closed: boolean }>);
      setOperatingHours(scheduleMap);
    } else {
      // Default: Open 9-5 on weekdays
      const defaultSchedule = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day.value] = {
          open_time: "09:00",
          close_time: "17:00",
          is_closed: day.value >= 5, // Weekend closed by default
        };
        return acc;
      }, {} as Record<number, { open_time: string; close_time: string; is_closed: boolean }>);
      setOperatingHours(defaultSchedule);
    }
  }, [existingSchedules, open]);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      type: "",
      manager_id: null,
      status: "active",
    },
  });

  // Update form when location changes
  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name || "",
        address: location.address || "",
        city: location.city || "",
        type: location.type || "",
        manager_id: location.manager_id || null,
        status: location.status || "active",
      });
    } else {
      form.reset({
        name: "",
        address: "",
        city: "",
        type: "",
        manager_id: null,
        status: "active",
      });
    }
  }, [location, form, open]);

  const [isGeocoding, setIsGeocoding] = useState(false);

  const onSubmit = async (data: LocationFormValues) => {
    let locationId = location?.id;
    
    // Auto-geocode the address
    setIsGeocoding(true);
    let coordinates: { latitude: number; longitude: number } | null = null;
    
    if (data.address || data.city) {
      coordinates = await geocodeAddress(data.address, data.city);
      if (coordinates) {
        toast.success("Location coordinates detected from address");
      }
    }
    setIsGeocoding(false);
    
    const locationData = {
      ...data,
      ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
    };
    
    if (location) {
      await updateLocation.mutateAsync({ id: location.id, ...locationData });
    } else {
      const result = await createLocation.mutateAsync(locationData as any);
      locationId = result.id;
    }

    // Save operating schedules
    if (locationId) {
      const schedules = Object.entries(operatingHours).map(([day, hours]) => ({
        day_of_week: parseInt(day),
        ...hours,
      }));
      await saveSchedules.mutateAsync({ locationId, schedules });
    }

    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add New Location"}</DialogTitle>
          <DialogDescription>
            {location
              ? "Update location details below."
              : "Fill in the details to add a new location."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Downtown Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="New York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Restaurant, Retail, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Operating Hours</h3>
              </div>
              
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center gap-4">
                  <div className="w-24 font-medium text-sm">{day.label}</div>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={operatingHours[day.value]?.open_time || "09:00"}
                      onChange={(e) =>
                        setOperatingHours({
                          ...operatingHours,
                          [day.value]: {
                            ...operatingHours[day.value],
                            open_time: e.target.value,
                          },
                        })
                      }
                      disabled={operatingHours[day.value]?.is_closed}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={operatingHours[day.value]?.close_time || "17:00"}
                      onChange={(e) =>
                        setOperatingHours({
                          ...operatingHours,
                          [day.value]: {
                            ...operatingHours[day.value],
                            close_time: e.target.value,
                          },
                        })
                      }
                      disabled={operatingHours[day.value]?.is_closed}
                      className="w-32"
                    />
                    <div className="flex items-center gap-2 ml-auto">
                      <Switch
                        checked={!operatingHours[day.value]?.is_closed}
                        onCheckedChange={(checked) =>
                          setOperatingHours({
                            ...operatingHours,
                            [day.value]: {
                              ...operatingHours[day.value],
                              is_closed: !checked,
                            },
                          })
                        }
                      />
                      <span className="text-sm text-muted-foreground w-16">
                        {operatingHours[day.value]?.is_closed ? "Closed" : "Open"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createLocation.isPending || updateLocation.isPending || saveSchedules.isPending || isGeocoding}
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting location...
                  </>
                ) : location ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
