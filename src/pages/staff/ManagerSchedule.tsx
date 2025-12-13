import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { format, addDays, startOfWeek } from "date-fns";

const ManagerSchedule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [managerLocations, setManagerLocations] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    // ProtectedRoute handles auth - just load data when user exists
    if (user) {
      loadData();
    }
  }, [user, selectedDate, selectedLocation]);

  const loadData = async () => {
    try {
      // Get employee to get company_id and primary location
      const { data: empData } = await supabase
        .from("employees")
        .select("id, company_id, location_id, locations(id, name)")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!empData) return;

      // Load manager's assigned locations (primary + additional)
      const { data: additionalLocations } = await supabase
        .from("staff_locations")
        .select("location_id, locations(id, name)")
        .eq("staff_id", empData.id);

      // Combine primary and additional locations
      const allLocations: any[] = [];
      
      // Add primary location
      if (empData.locations) {
        allLocations.push({ id: empData.locations.id, name: empData.locations.name });
      }
      
      // Add additional locations
      if (additionalLocations) {
        additionalLocations.forEach((loc: any) => {
          if (loc.locations && !allLocations.find(l => l.id === loc.locations.id)) {
            allLocations.push({ id: loc.locations.id, name: loc.locations.name });
          }
        });
      }
      
      setManagerLocations(allLocations);

      // Set default location to manager's primary location on first load
      if (selectedLocation === null && empData.location_id) {
        setSelectedLocation(empData.location_id);
      }

      // Load shifts for selected week
      const weekEnd = addDays(weekStart, 6);
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          *,
          shift_assignments(
            id,
            staff_id,
            approval_status,
            employees(
              full_name,
              avatar_url,
              role
            )
          ),
          locations(name)
        `)
        .eq("company_id", empData.company_id)
        .gte("shift_date", format(weekStart, "yyyy-MM-dd"))
        .lte("shift_date", format(weekEnd, "yyyy-MM-dd"))
        .order("start_time", { ascending: true });
      
      // Filter by location if not "all"
      if (selectedLocation !== "all") {
        shiftsQuery = shiftsQuery.eq("location_id", selectedLocation);
      }
      
      const { data: shiftsData } = await shiftsQuery;

      if (shiftsData) {
        setShifts(shiftsData);
      }

      // Load location operating schedules (only if specific location selected)
      if (selectedLocation !== "all") {
        const { data: schedulesData } = await supabase
          .from("location_operating_schedules")
          .select("*")
          .eq("location_id", selectedLocation)
          .order("day_of_week", { ascending: true });

        if (schedulesData) {
          setSchedules(schedulesData);
        }
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter((shift) => shift.shift_date === dateStr);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      Manager: "bg-blue-500",
      Server: "bg-teal-500",
      Bartender: "bg-orange-500",
      Host: "bg-purple-500",
      Chef: "bg-yellow-500",
      "Line Cook": "bg-pink-500",
      Dishwasher: "bg-cyan-500",
    };
    return colors[role] || "bg-gray-500";
  };

  const getOperatingHours = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return "24/7";
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time.slice(0, 5)} - ${schedule.close_time.slice(0, 5)}`;
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
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-4">
        <div className="px-4 pt-4">
          <h1 className="text-2xl font-bold mb-4">Who's Working</h1>
          
          {/* Date Navigation */}
          <Card className="bg-white/10 border-white/20 p-3 mb-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="text-primary-foreground hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="text-primary-foreground hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </Card>

          {/* Location Selector */}
          {managerLocations.length > 1 ? (
            <Select
              value={selectedLocation || ""}
              onValueChange={(value) => setSelectedLocation(value)}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <SelectValue placeholder="Select location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {managerLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm opacity-90 text-center flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" />
              {managerLocations.find(l => l.id === selectedLocation)?.name}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Daily Shifts */}
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          
          return (
            <div key={day.toString()} className={isToday ? "bg-primary/5 -mx-4 px-4 py-3 rounded-lg" : ""}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "EEE, MMM d")}
                  </span>
                  <Badge variant="outline" className="text-sm font-medium px-2 py-1">
                    <Users className="h-4 w-4 mr-1" />
                    {dayShifts.length}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {getOperatingHours(day)}
                </span>
              </div>
              
              <div className="space-y-2">
                {dayShifts.length === 0 ? (
                  <Card className="p-3 text-center text-sm text-muted-foreground">
                    No shifts scheduled
                  </Card>
                ) : (
                  dayShifts.map((shift) => (
                    <Card
                      key={shift.id}
                      className={`p-3 ${getRoleColor(shift.role)}/10 border-l-4`}
                      style={{ borderLeftColor: getRoleColor(shift.role).replace("bg-", "").replace("500", "#") }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {shift.shift_assignments && shift.shift_assignments.length > 0 ? (
                            shift.shift_assignments.map((assignment: any) => (
                              <div key={assignment.id} className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold">
                                    {assignment.employees?.full_name?.charAt(0)}
                                  </div>
                                  <span className="text-base font-semibold">
                                    {assignment.employees?.full_name}
                                  </span>
                                </div>
                                <Badge variant={assignment.approval_status === "approved" ? "default" : "secondary"} className="text-xs font-medium">
                                  {assignment.approval_status}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <span className="text-base text-muted-foreground italic font-medium">Unassigned</span>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="font-medium">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                            <Badge variant="outline" className="text-xs font-medium">
                              {shift.role}
                            </Badge>
                            {selectedLocation === "all" && shift.locations?.name && (
                              <Badge variant="secondary" className="text-xs font-medium">
                                {shift.locations.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* Create Shift Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate("/workforce/shifts")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Shift
        </Button>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default ManagerSchedule;
