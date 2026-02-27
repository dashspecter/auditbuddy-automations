import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Calendar, Plus, Umbrella, Info } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const StaffTimeOff = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState({ total: 25, used: 0, remaining: 25 });
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; reason: string | null }>({ open: false, reason: null });
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
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
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    setRequests(data || []);
  };

  const calculateBalance = async (employeeId: string, totalDays: number) => {
    const currentYear = new Date().getFullYear();
    const { data } = await supabase
      .from("time_off_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("start_date", `${currentYear}-01-01`)
      .lte("end_date", `${currentYear}-12-31`);

    const used = data?.reduce((total, req) => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0) || 0;

    setBalance({ total: totalDays, used, remaining: totalDays - used });
  };

  const submitRequest = async () => {
    try {
      console.log("Submitting time off request:", { employee, formData });
      
      const { data, error } = await supabase
        .from("time_off_requests")
        .insert([{
          employee_id: employee.id,
          company_id: employee.company_id,
          ...formData,
          status: "pending"
        }])
        .select();

      if (error) {
        console.error("Time off request error:", error);
        throw error;
      }

      console.log("Time off request created:", data);
      toast.success(t('staffTimeOff.requestSubmitted'));
      setDialogOpen(false);
      setFormData({ start_date: "", end_date: "", request_type: "vacation", reason: "" });
      loadData();
    } catch (error: any) {
      console.error("Submit request error:", error);
      toast.error(error?.message || t('staffTimeOff.failedSubmit'));
    }
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
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full touch-target">
                <Plus className="h-4 w-4 mr-2" />
                {t('staffTimeOff.requestTimeOff')}
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  <Label>{t('staffTimeOff.startDate')}</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div>
                  <Label>{t('staffTimeOff.endDate')}</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
                </div>
                <div>
                  <Label>{t('staffTimeOff.reason')}</Label>
                  <Textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                </div>
                <Button className="w-full" onClick={submitRequest}>{t('staffTimeOff.submitRequest')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                    {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
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
