import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StaffNav } from "@/components/staff/StaffNav";
import { DollarSign, TrendingUp, Clock, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

const StaffEarnings = () => {
  const { user } = useAuth();
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

    // Get attendance logs for calculation
    const { data: weekLogs } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("staff_id", emp.id)
      .gte("check_in_at", weekStart.toISOString())
      .lte("check_in_at", weekEnd.toISOString());

    const { data: monthLogs } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("staff_id", emp.id)
      .gte("check_in_at", monthStart.toISOString())
      .lte("check_in_at", monthEnd.toISOString());

    const calculateHours = (logs: any[]) => {
      return logs?.reduce((total, log) => {
        if (log.check_out_at) {
          const hours = (new Date(log.check_out_at).getTime() - new Date(log.check_in_at).getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
        return total;
      }, 0) || 0;
    };

    const hoursWeek = calculateHours(weekLogs || []);
    const hoursMonth = calculateHours(monthLogs || []);
    const hourlyRate = emp.hourly_rate || 15;

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

      <div className="px-4 py-4 space-y-4">
        {/* Current Period Card */}
        <Card className="p-6 bg-gradient-accent text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm opacity-90">This Week</span>
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
            <Calendar className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold">
              {earnings.thisMonth.toFixed(2)} Lei
            </div>
            <div className="text-xs text-muted-foreground">This Month</div>
            <div className="text-xs text-muted-foreground mt-1">
              {earnings.hoursMonth.toFixed(1)} hours
            </div>
          </Card>

          <Card className="p-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold">
              {earnings.tips.toFixed(2)} Lei
            </div>
            <div className="text-xs text-muted-foreground">Tips This Week</div>
          </Card>
        </div>

        {/* Breakdown */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">This Week Breakdown</h3>
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
            <strong>Note:</strong> Earnings shown are estimates based on scheduled hours. 
            Final amounts may vary. Check your paystubs for official records.
          </p>
        </Card>
      </div>

      <StaffNav />
    </div>
  );
};

export default StaffEarnings;
