import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { LogOut, User, Mail, Phone, MapPin, Calendar, ChevronRight, Wallet, TrendingUp, Trophy, AlertTriangle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";
import { useMyWarningsStats } from "@/hooks/useMyWarnings";
import { useCompanyContext } from "@/contexts/CompanyContext";

const StaffProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasModule } = useCompanyContext();
  const [employee, setEmployee] = useState<any>(null);
  const [earnings, setEarnings] = useState({ thisWeek: 0, thisMonth: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hideEarnings, setHideEarnings] = useState(false);

  // Get performance data
  const { data: performanceScores } = useEmployeePerformance();
  const myPerformanceScore = employee && performanceScores 
    ? performanceScores.find(s => s.employee_id === employee.id)?.overall_score 
    : null;

  // Get warnings stats
  const { stats: warningsStats } = useMyWarningsStats();
  
  // Module checks
  const hasWastageModule = hasModule('wastage');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*, locations(name)")
        .eq("user_id", user?.id)
        .single();

      setEmployee(empData);
      
      if (empData) {
        await calculateEarnings(empData.id, empData.hourly_rate || 15);
        
        // Check company settings for hiding earnings
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("hide_earnings_from_staff")
          .eq("id", empData.company_id)
          .maybeSingle();
        
        console.log("[StaffProfile] Company settings check:", {
          companyId: empData.company_id,
          companyData,
          companyError,
          hide_earnings_from_staff: companyData?.hide_earnings_from_staff
        });
        
        if (companyData) {
          setHideEarnings(companyData.hide_earnings_from_staff === true);
        }
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEarnings = async (employeeId: string, hourlyRate: number) => {
    // Calculate this week's earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: weekAssignments } = await supabase
      .from("shift_assignments")
      .select(`
        shifts:shift_id (
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
        weeklyTotal += hours * hourlyRate;
      }
    });

    // Calculate this month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const { data: monthAssignments } = await supabase
      .from("shift_assignments")
      .select(`
        shifts:shift_id (
          start_time,
          end_time
        )
      `)
      .eq("staff_id", employeeId)
      .eq("approval_status", "approved")
      .gte("shifts.shift_date", monthStartStr);

    let monthlyTotal = 0;
    monthAssignments?.forEach((assignment: any) => {
      if (assignment.shifts) {
        const [startHour, startMin] = assignment.shifts.start_time.split(':').map(Number);
        const [endHour, endMin] = assignment.shifts.end_time.split(':').map(Number);
        const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
        monthlyTotal += hours * hourlyRate;
      }
    });

    setEarnings({ thisWeek: weeklyTotal, thisMonth: monthlyTotal });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error('[StaffProfile] Sign out error:', e);
    }
    navigate("/auth", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Menu items - only navigate to pages that exist
  const menuItems = [
    ...(!hideEarnings ? [{ icon: Wallet, label: "My Earnings", path: "/staff/earnings" }] : []),
    ...(hasWastageModule ? [{ icon: Trash2, label: "My Waste Entries", path: "/staff/waste" }] : []),
    { icon: AlertTriangle, label: "My Warnings", path: "/staff/warnings", badge: warningsStats.unseen > 0 ? warningsStats.unseen : undefined },
    { icon: Calendar, label: "My Availability", action: () => toast.info("Availability settings coming soon") },
    { icon: User, label: "Personal Information", action: () => toast.info("Personal information editing coming soon") },
    { icon: MapPin, label: "Emergency Contacts", action: () => toast.info("Emergency contacts editing coming soon") },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-8">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-20 w-20 rounded-full bg-primary-foreground/20 flex items-center justify-center text-3xl font-bold">
              {employee?.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{employee?.full_name}</h1>
              <p className="text-sm opacity-90">{employee?.role}</p>
              <p className="text-sm opacity-90">{employee?.locations?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-6">
        {/* Score Card */}
        <Card 
          className="p-4 shadow-lg cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => navigate("/staff/score")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">My Performance Score</div>
                <div className="text-2xl font-bold">{myPerformanceScore !== null ? myPerformanceScore.toFixed(1) : '--'}</div>
                <div className="text-xs text-muted-foreground">View Breakdown</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Earnings Card - Only show if not hidden */}
        {!hideEarnings && (
          <Card className="p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Earnings Overview
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-accent/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">This Week</div>
                <div className="text-2xl font-bold">{earnings.thisWeek.toFixed(0)} Lei</div>
              </div>
              <div className="bg-accent/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">This Month</div>
                <div className="text-2xl font-bold">{earnings.thisMonth.toFixed(0)} Lei</div>
              </div>
            </div>
            <Button 
              variant="link" 
              className="w-full mt-3 text-sm"
              onClick={() => navigate("/staff/earnings")}
            >
              View Detailed Earnings <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        )}

        {/* Contact Info Card */}
        <Card className="p-4 shadow-lg">
          <h2 className="font-semibold mb-3">Contact Information</h2>
          <div className="space-y-3">
            {employee?.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{employee.email}</span>
              </div>
            )}
            {employee?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{employee.phone}</span>
              </div>
            )}
            {employee?.hire_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  Joined {format(new Date(employee.hire_date), "MMMM yyyy")}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Menu Items */}
        <div>
          <h2 className="font-semibold mb-3 px-1">Settings</h2>
          <Card className="divide-y">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if ('path' in item && item.path) {
                    navigate(item.path);
                  } else if ('action' in item && item.action) {
                    item.action();
                  }
                }}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors touch-target"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span>{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 font-medium">
                      {item.badge}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </Card>
        </div>

        {/* Logout Button */}
        <Button 
          variant="destructive" 
          className="w-full touch-target"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffProfile;
