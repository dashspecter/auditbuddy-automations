import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StaffGreeting } from "@/components/staff/StaffGreeting";
import { TodayShiftCard } from "@/components/staff/TodayShiftCard";
import { UpcomingShiftsList } from "@/components/staff/UpcomingShiftsList";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [todayShift, setTodayShift] = useState<any>(null);
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

      // Get shift assignments
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
        .limit(10);

      if (assignmentsError) throw assignmentsError;
      
      const allShifts = assignmentsData || [];
      const todayShiftData = allShifts.find(s => s.shifts.shift_date === today);
      const upcomingShiftsData = allShifts.filter(s => s.shifts.shift_date > today);
      
      setTodayShift(todayShiftData);
      setUpcomingShifts(upcomingShiftsData);
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

  const shiftsToday = todayShift ? 1 : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Logout */}
      <header className="bg-card border-b sticky top-0 z-10 px-4 py-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout} 
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </header>

      {/* Greeting Section */}
      <StaffGreeting 
        employeeName={employee?.full_name || ""} 
        shiftsToday={shiftsToday}
      />

      {/* Today's Shift Card */}
      <TodayShiftCard shift={todayShift} />

      {/* Upcoming Shifts List */}
      <UpcomingShiftsList shifts={upcomingShifts} />

      {/* Bottom Navigation */}
      <StaffBottomNav />
    </div>
  );
};

export default StaffDashboard;
