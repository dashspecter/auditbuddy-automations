import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Palmtree } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateTimeOffRequest } from "@/hooks/useTimeOffRequests";
import { toast } from "sonner";

interface AddTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; full_name: string }>;
  defaultEmployeeId?: string;
  defaultDate?: Date;
}

export const AddTimeOffDialog = ({ 
  open, 
  onOpenChange, 
  employees,
  defaultEmployeeId,
  defaultDate 
}: AddTimeOffDialogProps) => {
  const { t } = useTranslation();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [requestType, setRequestType] = useState<string>("vacation");
  const [reason, setReason] = useState("");
  
  const createTimeOff = useCreateTimeOffRequest();

  useEffect(() => {
    if (open) {
      setEmployeeId(defaultEmployeeId || "");
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setRequestType("vacation");
      setReason("");
    }
  }, [open, defaultEmployeeId, defaultDate]);

  const handleSubmit = async () => {
    if (!employeeId || !startDate || !endDate) {
      toast.error(t('workforce.components.addTimeOffDialog.fillRequired'));
      return;
    }

    if (endDate < startDate) {
      toast.error(t('workforce.components.addTimeOffDialog.endDateAfterStart'));
      return;
    }

    try {
      await createTimeOff.mutateAsync({
        employee_id: employeeId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        status: "approved",
        request_type: requestType,
        reason: reason || null,
        rejection_reason: null,
      });
      
      toast.success(t('workforce.components.addTimeOffDialog.addedSuccess'));
      onOpenChange(false);
    } catch (error: any) {
      toast.error(t('workforce.components.addTimeOffDialog.addFailed') + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-green-600" />
            {t('workforce.components.addTimeOffDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('workforce.components.addTimeOffDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('workforce.components.addTimeOffDialog.employee')} *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={t('workforce.components.addTimeOffDialog.selectEmployee')} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('workforce.components.addTimeOffDialog.type')} *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">{t('workforce.components.addTimeOffDialog.types.vacation')}</SelectItem>
                <SelectItem value="sick">{t('workforce.components.addTimeOffDialog.types.sick')}</SelectItem>
                <SelectItem value="personal">{t('workforce.components.addTimeOffDialog.types.personal')}</SelectItem>
                <SelectItem value="unpaid">{t('workforce.components.addTimeOffDialog.types.unpaid')}</SelectItem>
                <SelectItem value="other">{t('workforce.components.addTimeOffDialog.types.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('workforce.components.addTimeOffDialog.startDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : t('workforce.components.addTimeOffDialog.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('workforce.components.addTimeOffDialog.endDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : t('workforce.components.addTimeOffDialog.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('workforce.components.addTimeOffDialog.reason')}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('workforce.components.addTimeOffDialog.reasonPlaceholder')}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={createTimeOff.isPending || !employeeId || !startDate || !endDate}
          >
            {createTimeOff.isPending ? t('workforce.components.addTimeOffDialog.adding') : t('workforce.components.addTimeOffDialog.addTimeOff')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};