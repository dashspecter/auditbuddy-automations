import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { PendingApprovalsSection } from "@/components/staff/PendingApprovalsSection";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Umbrella, Info, X } from "lucide-react";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const StaffTimeOff = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: company } = useCompany();
  const isManagerOrAbove = !!(
    roleData?.isAdmin ||
    roleData?.isManager ||
    company?.userRole === 'company_owner' ||
    company?.userRole === 'company_admin'
  );
  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState({ total: 25, used: 0, remaining: 25 });
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; reason: string | null }>({ open: false, reason: null });
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    request_type: "vacation",
    reason: ""
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("id, company_id, annual_vacation_days, vacation_year_start_month")
        .eq("user_id", user?.id)
        .single();

      if (empData) {
        setEmployee(empData);
        await loadRequests(empData.id);
        await calculateBalance(empData.id, empData.annual_vacation_days || 25);
      }
    } catch (error) {
      toast.error(t('staffTimeOff.failedLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequests = async (employeeId: string) => {
    const { data } = await supabase
      .from("time_off_requests")
      .select("*, time_off_request_dates(date)")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    setRequests(data || []);
  };

  const calculateBalance = async (employeeId: string, totalDays: number) => {
    const currentYear = new Date().getFullYear();
    
    // Count actual selected dates from child table
    const { data, error } = await supabase
      .from("time_off_request_dates")
      .select("date, request_id")
      .eq("company_id", employee?.company_id || '')
      .gte("date", `${currentYear}-01-01`)
      .lte("date", `${currentYear}-12-31`);

    // Also verify these belong to approved requests for this employee
    const { data: approvedRequests } = await supabase
      .from("time_off_requests")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("start_date", `${currentYear}-01-01`)
      .lte("end_date", `${currentYear}-12-31`);

    const approvedIds = new Set(approvedRequests?.map(r => r.id) || []);
    const uniqueDates = new Set(
      (data || [])
        .filter(d => approvedIds.has(d.request_id))
        .map(d => d.date)
    );
    const used = uniqueDates.size;

    setBalance({ total: totalDays, used, remaining: totalDays - used });
  };

  const submitRequest = async () => {
    if (selectedDates.length === 0) {
      toast.error(t('staffTimeOff.selectAtLeastOneDate', 'Please select at least one date'));
      return;
    }

    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = format(sortedDates[0], 'yyyy-MM-dd');
      const endDate = format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd');
      const dateStrings = sortedDates.map(d => format(d, 'yyyy-MM-dd'));

      const { data, error } = await supabase
        .from("time_off_requests")
        .insert([{
          employee_id: employee.id,
          company_id: employee.company_id,
          start_date: startDate,
          end_date: endDate,
          request_type: formData.request_type,
          reason: formData.reason || null,
          status: "pending"
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert individual date rows
      const dateRows = dateStrings.map(d => ({
        request_id: data.id,
        date: d,
        company_id: employee.company_id,
      }));
      const { error: datesError } = await supabase
        .from("time_off_request_dates")
        .insert(dateRows);
      if (datesError) throw datesError;

      toast.success(t('staffTimeOff.requestSubmitted'));
      setDialogOpen(false);
      setSelectedDates([]);
      setFormData({ request_type: "vacation", reason: "" });
      loadData();
    } catch (error: any) {
      toast.error(error?.message || t('staffTimeOff.failedSubmit'));
    }
  };

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => d.getTime() !== dateToRemove.getTime()));
  };

  const formatRequestDates = (request: any) => {
    const dates = request.time_off_request_dates;
    if (dates && dates.length > 0) {
      const sorted = [...dates].sort((a: any, b: any) => a.date.localeCompare(b.date));
      if (sorted.length <= 3) {
        return sorted.map((d: any) => format(new Date(d.date + 'T00:00:00'), "MMM d")).join(", ");
      }
      return `${format(new Date(sorted[0].date + 'T00:00:00'), "MMM d")} … ${format(new Date(sorted[sorted.length - 1].date + 'T00:00:00'), "MMM d")} (${sorted.length} days)`;
    }
    // Fallback to range
    return `${format(new Date(request.start_date), "MMM d")} - ${format(new Date(request.end_date), "MMM d, yyyy")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">{t('staffTimeOff.title')}</h1>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSelectedDates([]); setFormData({ request_type: "vacation", reason: "" }); } }}>
            <DialogTrigger asChild>
              <Button className="w-full touch-target">
                <Plus className="h-4 w-4 mr-2" />
                {t('staffTimeOff.requestTimeOff')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('staffTimeOff.newRequest')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>{t('staffTimeOff.type')}</Label>
                  <Select value={formData.request_type} onValueChange={(value) => setFormData({...formData, request_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{t('staffTimeOff.vacation')}</SelectItem>
                      <SelectItem value="sick">{t('staffTimeOff.sickLeave')}</SelectItem>
                      <SelectItem value="personal">{t('staffTimeOff.personalDay')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('staffTimeOff.selectDates', 'Select your vacation dates')}</Label>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className={cn("p-3 pointer-events-auto rounded-md border mt-2")}
                  />
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[...selectedDates]
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date) => (
                          <Badge key={date.toISOString()} variant="secondary" className="gap-1 text-xs">
                            {format(date, "MMM d")}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeDate(date)}
                            />
                          </Badge>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'} selected
                  </p>
                </div>
                <div>
                  <Label>{t('staffTimeOff.reason')}</Label>
                  <Textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                </div>
                <Button className="w-full" onClick={submitRequest} disabled={selectedDates.length === 0}>
                  {t('staffTimeOff.submitRequest')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Approvals for Managers */}
      {isManagerOrAbove && <PendingApprovalsSection />}

      {/* Balance Summary */}
      <div className="px-4 py-4">
        <Card className="p-4 bg-gradient-accent text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Umbrella className="h-6 w-6" />
            <h2 className="font-semibold">{t('staffTimeOff.vacationBalance')} {new Date().getFullYear()}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold">{balance.total}</div>
              <div className="text-sm opacity-90">{t('staffTimeOff.totalDays')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{balance.used}</div>
              <div className="text-sm opacity-90">{t('staffTimeOff.used')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{balance.remaining}</div>
              <div className="text-sm opacity-90">{t('staffTimeOff.remaining')}</div>
            </div>
          </div>
        </Card>

        <div className="flex items-start gap-2 mt-3 px-1">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t('staffTimeOff.verifyWithHR', 'Always verify with HR — updates can take up to 10 days.')}
          </p>
        </div>
      </div>

      {/* Requests List */}
      <div className="px-4 pb-4">
        <h2 className="font-semibold mb-3">{t('staffTimeOff.requestHistory')}</h2>
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium capitalize">{request.request_type}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatRequestDates(request)}
                  </div>
                </div>
                {request.status === "rejected" && request.rejection_reason ? (
                  <Badge 
                    variant="destructive" 
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => setRejectionDialog({ open: true, reason: request.rejection_reason })}
                  >
                    {request.status}
                  </Badge>
                ) : (
                  <Badge variant={getStatusColor(request.status) as any}>
                    {request.status}
                  </Badge>
                )}
              </div>
              {request.reason && (
                <p className="text-sm text-muted-foreground">{request.reason}</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => setRejectionDialog({ ...rejectionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('staffTimeOff.rejectionReason')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{rejectionDialog.reason || t('staffTimeOff.noReasonProvided')}</p>
        </DialogContent>
      </Dialog>

      <StaffBottomNav />
    </div>
  );
};

export default StaffTimeOff;
