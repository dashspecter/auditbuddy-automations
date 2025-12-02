import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffNav } from "@/components/staff/StaffNav";
import { Clock, MapPin, Wallet, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StaffShiftPool = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("my-location");
  const [selectedRole, setSelectedRole] = useState<string>("my-role");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("id, location_id, company_id, role")
        .eq("user_id", user?.id)
        .single();

      if (empData) {
        setEmployee(empData);
        await loadFilterOptions(empData);
        await loadOpenShifts(empData);
      }
    } catch (error) {
      toast.error("Failed to load shifts");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilterOptions = async (emp: any) => {
    // Load all locations in company
    const { data: locationsData } = await supabase
      .from("locations")
      .select("id, name")
      .eq("company_id", emp.company_id)
      .order("name");
    
    if (locationsData) setLocations(locationsData);

    // Load unique roles from shifts
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("role")
      .eq("location_id", emp.location_id);
    
    if (shiftsData) {
      const uniqueRoles = [...new Set(shiftsData.map((s: any) => s.role).filter(Boolean))];
      setRoles(uniqueRoles as string[]);
    }
  };

  const loadOpenShifts = async (emp: any) => {
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from("shifts")
      .select(`*, locations(name), shift_assignments(id)`)
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .limit(20);

    // Apply location filter
    if (selectedLocation === "my-location") {
      query = query.eq("location_id", emp.location_id);
    } else if (selectedLocation !== "all") {
      query = query.eq("location_id", selectedLocation);
    }

    const { data } = await query;

    let available = data?.filter((shift: any) => 
      !shift.shift_assignments || shift.shift_assignments.length < (shift.required_staff || 1)
    ) || [];

    // Apply role filter
    if (selectedRole === "my-role") {
      available = available.filter((shift: any) => shift.role === emp.role);
    } else if (selectedRole !== "all") {
      available = available.filter((shift: any) => shift.role === selectedRole);
    }
    
    setOpenShifts(available);
  };

  useEffect(() => {
    if (employee) {
      loadOpenShifts(employee);
    }
  }, [selectedLocation, selectedRole]);

  const claimShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from("shift_assignments")
        .insert([{
          shift_id: shiftId,
          staff_id: employee.id,
          assigned_by: employee.id
        }]);

      if (error) throw error;
      
      toast.success("Shift claimed! Awaiting approval");
      loadData();
    } catch (error: any) {
      console.error("Claim shift error:", error);
      toast.error(error.message || "Failed to claim shift");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">Available Shifts</h1>
          <div className="flex gap-2">
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Shifts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="my-location">My Location Only</SelectItem>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="my-role">My Role Only</SelectItem>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary">{openShifts.length} shifts available</Badge>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="px-4 py-4 space-y-3">
        {openShifts.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No open shifts available right now</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities</p>
          </Card>
        ) : (
          openShifts.map((shift: any) => (
            <Card key={shift.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-lg">
                    {format(new Date(shift.shift_date), "EEE, MMM d")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary">Open</Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.locations?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.role}</span>
                </div>
                {shift.hourly_rate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span>{shift.hourly_rate} Lei/hour</span>
                  </div>
                )}
              </div>

              <Button 
                className="w-full touch-target"
                onClick={() => claimShift(shift.id)}
              >
                Claim Shift
              </Button>
            </Card>
          ))
        )}
      </div>

      <StaffNav />
    </div>
  );
};

export default StaffShiftPool;
