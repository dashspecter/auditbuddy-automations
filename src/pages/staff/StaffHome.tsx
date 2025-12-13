import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Wallet, MessageSquare, ArrowRight, ListTodo, Gift } from "lucide-react";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { ManagerApprovalsSection } from "@/components/staff/ManagerApprovalsSection";
import { ManagerDashboardStats } from "@/components/staff/ManagerDashboardStats";
import { ManagerAuditStats } from "@/components/staff/ManagerAuditStats";
import { ManagerAuditsCard } from "@/components/staff/ManagerAuditsCard";
import { OfferedShiftsCard } from "@/components/staff/OfferedShiftsCard";
import { useMyTasks } from "@/hooks/useTasks";
import { ClockInOutButtons } from "@/components/staff/ClockInOutButtons";
import { StaffLocationLeaderboard } from "@/components/staff/StaffLocationLeaderboard";
import { PendingTestsCard } from "@/components/staff/PendingTestsCard";
import { StaffNotificationsCard } from "@/components/staff/StaffNotificationsCard";

const StaffHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const { data: myTasks = [] } = useMyTasks();
  const [employee, setEmployee] = useState<any>(null);
  const [todayShift, setTodayShift] = useState<any>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ thisWeek: 0, thisMonth: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [companyRole, setCompanyRole] = useState<string | null>(null);

  // Count active (non-completed) tasks
  const activeTaskCount = myTasks.filter(t => t.status !== 'completed').length;

  // Check platform role, company role, and employee role for manager access
  const isManager = roleData?.isManager || roleData?.isAdmin || 
    companyRole === 'company_admin' || companyRole === 'company_owner' ||
    employee?.role?.toLowerCase() === 'manager';

  useEffect(() => {
    // ProtectedRoute handles auth redirects - just load data when user is present
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load employee data
      const { data: empData, error } = await supabase
        .from("employees")
        .select("*, locations(name)")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee:", error);
        toast.error("Failed to load data");
        return;
      }

      if (empData) {
        // Check if employee is deactivated
        if (empData.status === "inactive") {
          toast.error("Your account has been deactivated. Please contact your manager.");
          await supabase.auth.signOut();
          navigate("/staff-login");
          return;
        }
        
        setEmployee(empData);
        await loadShifts(empData.id);
        
        // Check company role for manager features
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("company_role")
          .eq("user_id", user?.id)
          .eq("company_id", empData.company_id)
          .maybeSingle();
        
        if (companyUserData) {
          setCompanyRole(companyUserData.company_role);
        }
      }
    } catch (error: any) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadShifts = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: assignmentsData, error } = await supabase
      .from("shift_assignments")
      .select(`
        id,
        staff_id,
        shift_id,
        approval_status,
        shifts:shift_id (
          id,
          shift_date,
          start_time,
          end_time,
          role,
          location_id,
          locations:location_id (
            name
          )
        )
      `)
      .eq("staff_id", employeeId)
      .in("approval_status", ["approved", "pending"])
      .gte("shifts.shift_date", today)
      .order("shift_date", { foreignTable: "shifts", ascending: true })
      .limit(10);

    if (error) {
      console.error("Error loading shifts:", error);
      return;
    }

    if (assignmentsData && assignmentsData.length > 0) {
      const todayShiftData = assignmentsData.find((s: any) => s.shifts?.shift_date === today);
      const upcomingShiftsData = assignmentsData.filter((s: any) => s.shifts?.shift_date > today);
      
      setTodayShift(todayShiftData);
      setUpcomingShifts(upcomingShiftsData);
      
      // Calculate earnings for this week
      await calculateWeeklyEarnings(employeeId);
    } else {
      setTodayShift(null);
      setUpcomingShifts([]);
    }
  };

  const calculateWeeklyEarnings = async (employeeId: string) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: weekAssignments } = await supabase
      .from("shift_assignments")
      .select(`
        id,
        staff_id,
        shift_id,
        approval_status,
        shifts:shift_id (
          shift_date,
          start_time,
          end_time
        )
      `)
      .eq("staff_id", employeeId)
      .eq("approval_status", "approved")
      .gte("shifts.shift_date", weekStartStr);

    let weeklyTotal = 0;
    weekAssignments?.forEach((assignment: any) => {
      if (assignment.shifts) {
        const [startHour, startMin] = assignment.shifts.start_time.split(':').map(Number);
        const [endHour, endMin] = assignment.shifts.end_time.split(':').map(Number);
        const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
        weeklyTotal += hours * (employee?.hourly_rate || 15);
      }
    });

    setEarnings({ thisWeek: weeklyTotal, thisMonth: 0 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-8">
        <div className="px-4 pt-4">
          <p className="text-sm opacity-90 mb-1">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="text-2xl font-bold mb-1">
            {greeting()}, {employee?.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm opacity-90">{employee?.role} • {employee?.locations?.name}</p>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-6 mt-4">
        {/* Notifications for all users */}
        <StaffNotificationsCard />
        
        {/* Manager Dashboard */}
        {isManager && (
          <>
            <ManagerAuditsCard />
            <ManagerDashboardStats />
            <ManagerAuditStats />
            <ManagerApprovalsSection />
            <OfferedShiftsCard />
          </>
        )}
        
        {/* Today's Shift Card - Only for non-managers */}
        {!isManager && todayShift ? (
          <Card className="p-4 shadow-lg border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-muted-foreground">TODAY'S SHIFT</span>
              </div>
              <Badge variant={todayShift.approval_status === "pending" ? "secondary" : "default"}>
                {todayShift.approval_status === "pending" ? "Pending Approval" : "Confirmed"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="text-3xl font-bold">{todayShift.shifts.start_time.slice(0, 5)}</div>
                <div className="text-xs text-muted-foreground">Start</div>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-3xl font-bold">{todayShift.shifts.end_time.slice(0, 5)}</div>
                <div className="text-xs text-muted-foreground">End</div>
              </div>
            </div>
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                {todayShift.shifts.role}
              </Badge>
              {todayShift.shifts.locations?.name && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{todayShift.shifts.locations.name}</span>
                </div>
              )}
            </div>
            {todayShift.approval_status === "approved" && (
              <ClockInOutButtons 
                todayShift={todayShift} 
                employee={employee} 
                onRefresh={loadData}
              />
            )}
            {todayShift.approval_status === "pending" && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Awaiting manager approval
              </div>
            )}
          </Card>
        ) : !isManager ? (
          <Card className="p-6 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No shift scheduled for today</p>
            <Button variant="link" className="mt-2" onClick={() => navigate("/staff/shift-pool")}>
              Browse available shifts
            </Button>
          </Card>
        ) : null}

        {/* Quick Stats Grid - Only for non-managers */}
        {!isManager && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/staff/schedule")}>
              <Calendar className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{upcomingShifts.length}</div>
              <div className="text-xs text-muted-foreground">Upcoming Shifts</div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/staff/earnings")}>
              <Wallet className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{earnings.thisWeek} Lei</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </Card>
          </div>
        )}

        {/* Upcoming Shifts - Only for non-managers */}
        {!isManager && upcomingShifts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Upcoming Shifts</h2>
              <Button variant="link" size="sm" onClick={() => navigate("/staff/schedule")}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {upcomingShifts.slice(0, 3).map((assignment: any) => (
                <Card key={assignment.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(assignment.shifts.shift_date), "EEE, MMM d")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.shifts.start_time.slice(0, 5)} - {assignment.shifts.end_time.slice(0, 5)}
                      </div>
                    </div>
                    <Badge variant="outline">{assignment.shifts.role}</Badge>
                  </div>
                  {assignment.shifts.locations?.name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{assignment.shifts.locations.name}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tests - Only shown when employee has a shift today */}
        {employee && todayShift && <PendingTestsCard employeeId={employee.id} />}

        {/* Location Leaderboard */}
        {employee && (
          <StaffLocationLeaderboard
            locationId={employee.location_id}
            currentEmployeeId={employee.id}
          />
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/scan-voucher")}>
              <Gift className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">Enter Voucher</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/shift-pool")}>
              <Clock className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">Claim Shift</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/time-off")}>
              <Calendar className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">Request Time Off</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/messages")}>
              <MessageSquare className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">Messages</span>
            </Button>
            <Button 
              variant="outline" 
              className={`h-auto py-4 flex-col touch-target relative ${activeTaskCount > 0 ? "border-primary bg-primary/5" : ""}`}
              onClick={() => navigate("/staff/tasks")}
            >
              {activeTaskCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeTaskCount}
                </Badge>
              )}
              <ListTodo className={`h-6 w-6 mb-2 ${activeTaskCount > 0 ? "text-primary" : "text-primary"}`} />
              <span className="text-xs">My Tasks</span>
            </Button>
          </div>
        </div>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffHome;
