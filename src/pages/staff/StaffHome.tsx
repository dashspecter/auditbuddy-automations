import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Wallet, MessageSquare, ArrowRight, ListTodo, Gift, Trophy, FileText } from "lucide-react";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { ManagerApprovalsSection } from "@/components/staff/ManagerApprovalsSection";
import { ManagerDashboardStats } from "@/components/staff/ManagerDashboardStats";
import { ManagerAuditStats } from "@/components/staff/ManagerAuditStats";
import { ManagerAuditsCard } from "@/components/staff/ManagerAuditsCard";
import { OfferedShiftsCard } from "@/components/staff/OfferedShiftsCard";
import { useMyTasks } from "@/hooks/useTasks";
import { ClockInOutButtons } from "@/components/staff/ClockInOutButtons";
import { StaffLocationLeaderboard } from "@/components/staff/StaffLocationLeaderboard";
import { ActiveTasksCard } from "@/components/staff/ActiveTasksCard";
import { PendingTestsCard } from "@/components/staff/PendingTestsCard";
import { StaffNotificationsCard } from "@/components/staff/StaffNotificationsCard";
import { CheckerAuditsCard } from "@/components/staff/CheckerAuditsCard";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";

const StaffHome = () => {
  const { t } = useTranslation();
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
  const [additionalLocationsCount, setAdditionalLocationsCount] = useState(0);
  const [hideEarnings, setHideEarnings] = useState(false);
  const [clockInEnabled, setClockInEnabled] = useState(true);

  // Redirect desktop users to dashboard - staff pages are mobile-only
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);
  
  // Date range for performance - this month
  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd')
    };
  }, []);
  
  // Get performance data for this month
  const { data: performanceScores } = useEmployeePerformance(dateRange.start, dateRange.end);
  const myPerformanceScore = employee && performanceScores 
    ? performanceScores.find(s => s.employee_id === employee.id)?.overall_score 
    : null;

  // Count active (non-completed) tasks
  const activeTaskCount = myTasks.filter(t => t.status !== 'completed').length;

  // Check platform role, company role, and employee role for manager access
  const isManager = roleData?.isManager || roleData?.isAdmin || 
    companyRole === 'company_admin' || companyRole === 'company_owner' ||
    employee?.role?.toLowerCase() === 'manager';

  // Check if user is a checker (can create/complete audits)
  const isChecker = roleData?.isChecker;

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
        toast.error(t('staffHome.failedLoadData'));
        return;
      }

      if (empData) {
        // Check if employee is deactivated
        if (empData.status === "inactive") {
          toast.error(t('staffHome.accountDeactivated'));
          await supabase.auth.signOut();
          navigate("/staff-login");
          return;
        }
        
        setEmployee(empData);
        await loadShifts(empData.id);
        
        // Check additional locations count
        const { count: additionalCount } = await supabase
          .from("staff_locations")
          .select("*", { count: 'exact', head: true })
          .eq("staff_id", empData.id);
        
        setAdditionalLocationsCount(additionalCount || 0);
        
        // Check company settings for hiding earnings and clock-in
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("hide_earnings_from_staff, clock_in_enabled")
          .eq("id", empData.company_id)
          .maybeSingle();
        
        console.log("[StaffHome] Company settings check:", {
          companyId: empData.company_id,
          companyData,
          companyError,
          hide_earnings_from_staff: companyData?.hide_earnings_from_staff,
          clock_in_enabled: companyData?.clock_in_enabled
        });
        
        if (companyData) {
          setHideEarnings(companyData.hide_earnings_from_staff === true);
          setClockInEnabled(companyData.clock_in_enabled !== false);
        }
        
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
      toast.error(t('staffHome.failedLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadShifts = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // First get assignments for this employee
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
      .in("approval_status", ["approved", "pending"]);

    if (error) {
      console.error("Error loading shifts:", error);
      return;
    }

    // Filter client-side for today and upcoming shifts
    const validAssignments = (assignmentsData || []).filter(
      (a: any) => a.shifts && a.shifts.shift_date >= today
    );
    
    // Sort by shift date
    validAssignments.sort((a: any, b: any) => 
      a.shifts.shift_date.localeCompare(b.shifts.shift_date)
    );

    if (validAssignments.length > 0) {
      const todayShiftData = validAssignments.find((s: any) => s.shifts?.shift_date === today);
      const upcomingShiftsData = validAssignments.filter((s: any) => s.shifts?.shift_date > today);
      
      setTodayShift(todayShiftData || null);
      setUpcomingShifts(upcomingShiftsData.slice(0, 10));
      
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
    if (hour < 12) return t('staffHome.greeting.morning');
    if (hour < 18) return t('staffHome.greeting.afternoon');
    return t('staffHome.greeting.evening');
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
          <p className="text-sm opacity-90">
            {employee?.role} • {additionalLocationsCount > 0 ? t('staffHome.allLocations') : employee?.locations?.name}
          </p>
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

        {/* Checker Audits Card - Show for checker role users who aren't managers */}
        {!isManager && isChecker && <CheckerAuditsCard />}
        
        {/* Active Tasks - Prominent display for non-managers */}
        {!isManager && <ActiveTasksCard />}

        {/* Today's Shift Card - Only for non-managers */}
        {!isManager && todayShift ? (
          <Card className="p-4 shadow-lg border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-muted-foreground">{t('staffHome.todaysShift')}</span>
              </div>
              <Badge variant={todayShift.approval_status === "pending" ? "secondary" : "default"}>
                {todayShift.approval_status === "pending" ? t('staffHome.pendingApproval') : t('staffHome.confirmed')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="text-3xl font-bold">{todayShift.shifts.start_time.slice(0, 5)}</div>
                <div className="text-xs text-muted-foreground">{t('staffHome.start')}</div>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-3xl font-bold">{todayShift.shifts.end_time.slice(0, 5)}</div>
                <div className="text-xs text-muted-foreground">{t('staffHome.end')}</div>
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
            {todayShift.approval_status === "approved" && clockInEnabled && (
              <ClockInOutButtons 
                todayShift={todayShift} 
                employee={employee} 
                onRefresh={loadData}
              />
            )}
            {todayShift.approval_status === "approved" && !clockInEnabled && (
              <div className="text-sm text-muted-foreground text-center py-2 bg-muted rounded-md">
                {t('staffHome.shiftConfirmed', 'Shift confirmed - clock-in not required')}
              </div>
            )}
            {todayShift.approval_status === "pending" && (
              <div className="text-sm text-muted-foreground text-center py-2">
                {t('staffHome.awaitingApproval')}
              </div>
            )}
          </Card>
        ) : !isManager ? (
          <Card className="p-6 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('staffHome.noShiftToday')}</p>
            <Button variant="link" className="mt-2" onClick={() => navigate("/staff/shift-pool")}>
              {t('staffHome.browseShifts')}
            </Button>
          </Card>
        ) : null}

        {/* Quick Stats Grid - Only for non-managers */}
        {!isManager && (
          <div className={`grid gap-3 ${hideEarnings ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <Card className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/staff/schedule")}>
              <Calendar className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{upcomingShifts.length}</div>
              <div className="text-xs text-muted-foreground">{t('staffHome.upcomingShifts')}</div>
            </Card>
            {!hideEarnings && (
              <Card className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/staff/earnings")}>
                <Wallet className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold">{earnings.thisWeek} Lei</div>
                <div className="text-xs text-muted-foreground">{t('staffHome.thisWeek')}</div>
              </Card>
            )}
            <Card className="p-4 cursor-pointer hover:bg-accent/5 transition-colors">
              <Trophy className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{myPerformanceScore !== null ? myPerformanceScore.toFixed(1) : '--'}</div>
              <div className="text-xs text-muted-foreground">{t('staffHome.myScore')}</div>
            </Card>
          </div>
        )}

        {/* Upcoming Shifts - Only for non-managers */}
        {!isManager && upcomingShifts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{t('staffHome.upcomingShifts')}</h2>
              <Button variant="link" size="sm" onClick={() => navigate("/staff/schedule")}>
                {t('staffHome.viewAll')} <ArrowRight className="h-3 w-3 ml-1" />
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
          <h2 className="font-semibold mb-3">{t('staffHome.quickActions')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/documents")}>
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">{t('staffHome.documents')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/scan-voucher")}>
              <Gift className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">{t('staffHome.enterVoucher')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/shift-pool")}>
              <Clock className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">{t('staffHome.claimShift')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col touch-target" onClick={() => navigate("/staff/time-off")}>
              <Calendar className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs">{t('staffHome.requestTimeOff')}</span>
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
              <span className="text-xs">{t('staffHome.myTasks')}</span>
            </Button>
          </div>
        </div>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffHome;
