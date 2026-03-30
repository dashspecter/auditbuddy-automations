import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Palmtree, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateTimeOffRequest } from "@/hooks/useTimeOffRequests";
import { useTerminology } from "@/hooks/useTerminology";
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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [requestType, setRequestType] = useState<string>("vacation");
  const [reason, setReason] = useState("");
  
  const createTimeOff = useCreateTimeOffRequest();
  const t_ = useTerminology();

  useEffect(() => {
    if (open) {
      setEmployeeId(defaultEmployeeId || "");
      setSelectedDates(defaultDate ? [defaultDate] : []);
      setRequestType("vacation");
      setReason("");
    }
  }, [open, defaultEmployeeId, defaultDate]);

  const handleSubmit = async () => {
    if (!employeeId || selectedDates.length === 0) {
      toast.error(t('workforce.components.addTimeOffDialog.fillRequired'));
      return;
    }

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    try {
      await createTimeOff.mutateAsync({
        employee_id: employeeId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        status: "approved",
        request_type: requestType,
        reason: reason || null,
        rejection_reason: null,
        selected_dates: sortedDates.map(d => format(d, 'yyyy-MM-dd')),
      });
      
      toast.success(t('workforce.components.addTimeOffDialog.addedSuccess'));
      onOpenChange(false);
    } catch (error: any) {
      toast.error(t('workforce.components.addTimeOffDialog.addFailed') + error.message);
    }
  };

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => d.getTime() !== dateToRemove.getTime()));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-green-600" />
            {t('workforce.components.addTimeOffDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('workforce.components.addTimeOffDialog.description', `Add vacation or absence for a ${t_.employee().toLowerCase()}. This will be automatically approved.`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t_.employee()} *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${t_.employee().toLowerCase()}`} />
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

          <div className="space-y-2">
            <Label>{t('workforce.components.addTimeOffDialog.selectDates', 'Select Dates')} *</Label>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              className={cn("p-3 pointer-events-auto rounded-md border")}
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
            <p className="text-xs text-muted-foreground">
              {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'} selected
            </p>
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
            disabled={createTimeOff.isPending || !employeeId || selectedDates.length === 0}
          >
            {createTimeOff.isPending ? t('workforce.components.addTimeOffDialog.adding') : t('workforce.components.addTimeOffDialog.addTimeOff')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
