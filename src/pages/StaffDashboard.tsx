import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShiftWeekView } from "@/components/workforce/ShiftWeekView";
import { Calendar, Clock, MapPin, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/staff-login");
      return;
    }

    loadEmployeeData();
  }, [user, navigate]);

  const loadEmployeeData = async () => {
    try {
      // Get employee record
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*, locations(name)")
        .eq("user_id", user?.id)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Get upcoming shift assignments
      const today = new Date().toISOString().split('T')[0];
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("shift_assignments")
        .select(`
          *,
          shifts!inner(
            *,
            locations(name)
          )
        `)
        .eq("staff_id", empData.id)
        .gte("shifts.shift_date", today)
        .order("shift_date", { foreignTable: "shifts", ascending: true })
        .limit(5);

      if (assignmentsError) throw assignmentsError;
      setUpcomingShifts(assignmentsData || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff-login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{employee?.full_name}</h1>
              <p className="text-sm text-muted-foreground">{employee?.role}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{employee?.locations?.name}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{employee?.role}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div>{employee?.email}</div>
                <div className="text-muted-foreground">{employee?.phone}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
            <CardDescription>Your scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming shifts assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge>{assignment.shifts.role}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(assignment.shifts.shift_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>
                              {assignment.shifts.start_time.slice(0, 5)} - {assignment.shifts.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span>{assignment.shifts.locations?.name}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={assignment.status === "assigned" ? "default" : "secondary"}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week View - shows all shifts at location (read-only for staff) */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Overview</CardTitle>
            <CardDescription>View all shifts at your location</CardDescription>
          </CardHeader>
          <CardContent>
            <ShiftWeekView />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
