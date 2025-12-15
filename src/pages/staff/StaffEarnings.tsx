import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Wallet, TrendingUp, Clock, Calendar, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const StaffEarnings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [earnings, setEarnings] = useState({
    thisWeek: 0,
    thisMonth: 0,
    hoursWeek: 0,
    hoursMonth: 0,
    tips: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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

      if (empData) {
        // Check if earnings are hidden for this company
        const { data: companyData } = await supabase
          .from("companies")
          .select("hide_earnings_from_staff")
          .eq("id", empData.company_id)
          .maybeSingle();
        
        if (companyData?.hide_earnings_from_staff) {
          toast.error("Earnings information is not available");
          navigate("/staff");
          return;
        }
        
        setEmployee(empData);
        await calculateEarnings(empData);
      }
    } catch (error) {
      toast.error("Failed to load earnings");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEarnings = async (emp: any) => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const hourlyRate = emp.hourly_rate || 15;

    // Get this week's approved shift assignments
    const { data: weekAssignments } = await supabase
      .from("shift_assignments")
      .select(`
        shifts:shift_id (
          shift_date,
          start_time,
          end_time
        )
      `)
      .eq("staff_id", emp.id)
      .eq("approval_status", "approved");

    // Filter week assignments by date and calculate hours
    let hoursWeek = 0;
    weekAssignments?.forEach((assignment: any) => {
      if (assignment.shifts) {
        const shiftDate = new Date(assignment.shifts.shift_date);
        if (shiftDate >= weekStart && shiftDate <= weekEnd) {
          const [startHour, startMin] = assignment.shifts.start_time.split(':').map(Number);
          const [endHour, endMin] = assignment.shifts.end_time.split(':').map(Number);
          const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
          hoursWeek += hours;
        }
      }
    });

    // Get this month's approved shift assignments
    const { data: monthAssignments } = await supabase
      .from("shift_assignments")
      .select(`
        shifts:shift_id (
          shift_date,
          start_time,
          end_time
        )
      `)
      .eq("staff_id", emp.id)
      .eq("approval_status", "approved");

    // Filter month assignments by date and calculate hours
    let hoursMonth = 0;
    monthAssignments?.forEach((assignment: any) => {
      if (assignment.shifts) {
        const shiftDate = new Date(assignment.shifts.shift_date);
        if (shiftDate >= monthStart && shiftDate <= monthEnd) {
          const [startHour, startMin] = assignment.shifts.start_time.split(':').map(Number);
          const [endHour, endMin] = assignment.shifts.end_time.split(':').map(Number);
          const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
          hoursMonth += hours;
        }
      }
    });

    setEarnings({
      thisWeek: hoursWeek * hourlyRate,
      thisMonth: hoursMonth * hourlyRate,
      hoursWeek,
      hoursMonth,
      tips: 0 // Would come from tips tracking
    });
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
          <h1 className="text-xl font-bold">Earnings</h1>
        </div>
      </div>

      <TooltipProvider>
        <div className="px-4 py-4 space-y-4">
          {/* Current Period Card */}
          <Card className="p-6 bg-gradient-accent text-primary-foreground">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5" />
              <span className="text-sm opacity-90">This Week</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help opacity-70 hover:opacity-100" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-background text-foreground">
                  <p className="font-semibold mb-1">Weekly Earnings</p>
                  <p className="text-xs"><strong>Formula:</strong> Hours Worked × Hourly Rate</p>
                  <p className="text-xs mt-1"><strong>Source:</strong> Your shift assignments where you clocked in this week</p>
                  <p className="text-xs mt-1"><strong>Your Rate:</strong> {employee?.hourly_rate || 15} Lei/hr</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-4xl font-bold mb-2">
              {earnings.thisWeek.toFixed(2)} Lei
            </div>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{earnings.hoursWeek.toFixed(1)} hours</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{employee?.hourly_rate || 15} Lei/hr</span>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 hover:text-primary" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Monthly Earnings</p>
                    <p className="text-xs">Total from all shifts you worked this month</p>
                    <p className="text-xs mt-1"><strong>Formula:</strong> Monthly Hours × Your Rate</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold">
                {earnings.thisMonth.toFixed(2)} Lei
              </div>
              <div className="text-xs text-muted-foreground">This Month</div>
              <div className="text-xs text-muted-foreground mt-1">
                {earnings.hoursMonth.toFixed(1)} hours
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-5 w-5 text-primary" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 hover:text-primary" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Tips</p>
                    <p className="text-xs">Tips tracking coming soon. Ask your manager about recorded tips.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold">
                {earnings.tips.toFixed(2)} Lei
              </div>
              <div className="text-xs text-muted-foreground">Tips This Week</div>
            </Card>
          </div>

          {/* Breakdown */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">This Week Breakdown</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground/70 hover:text-primary" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Breakdown Details</p>
                  <p className="text-xs"><strong>Base Pay:</strong> Hours × Hourly Rate</p>
                  <p className="text-xs"><strong>Tips:</strong> From tips tracking system</p>
                  <p className="text-xs mt-1">This is estimated gross pay before any deductions.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Pay</span>
                <span className="font-medium">{earnings.thisWeek.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tips</span>
                <span className="font-medium">{earnings.tips.toFixed(2)} Lei</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold">Gross Total</span>
                <span className="font-bold text-lg">{(earnings.thisWeek + earnings.tips).toFixed(2)} Lei</span>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Earnings are calculated based on scheduled shift hours for shifts where you clocked in. 
              Final amounts may vary. Check your paystubs for official records.
            </p>
          </Card>
        </div>
      </TooltipProvider>

      <StaffBottomNav />
    </div>
  );
};

export default StaffEarnings;
