import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShiftRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShiftRequestDialog = ({ open, onOpenChange }: ShiftRequestDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("vacation");

  // Vacation Request State
  const [vacationStartDate, setVacationStartDate] = useState<Date>();
  const [vacationEndDate, setVacationEndDate] = useState<Date>();
  const [vacationType, setVacationType] = useState("vacation");
  const [vacationReason, setVacationReason] = useState("");

  // Shift Change State
  const [changeReason, setChangeReason] = useState("");

  const submitVacationRequest = useMutation({
    mutationFn: async () => {
      if (!vacationStartDate || !vacationEndDate) {
        throw new Error("Please select start and end dates");
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id, company_id")
        .eq("user_id", user?.id)
        .single();

      if (!employee) throw new Error("Employee not found");

      const { error } = await supabase
        .from("time_off_requests")
        .insert([{
          employee_id: employee.id,
          company_id: employee.company_id,
          start_date: format(vacationStartDate, "yyyy-MM-dd"),
          end_date: format(vacationEndDate, "yyyy-MM-dd"),
          request_type: vacationType,
          reason: vacationReason,
          status: "pending"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacation request submitted!");
      setVacationStartDate(undefined);
      setVacationEndDate(undefined);
      setVacationReason("");
      queryClient.invalidateQueries({ queryKey: ["vacation-details"] });
    },
    onError: (error: any) => {
      toast.error("Failed to submit request: " + error.message);
    },
  });

  const submitShiftChange = useMutation({
    mutationFn: async () => {
      if (!changeReason.trim()) {
        throw new Error("Please provide a reason for the shift change");
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id, company_id, full_name")
        .eq("user_id", user?.id)
        .single();

      if (!employee) throw new Error("Employee not found");

      // Create a notification/alert for managers
      const { error } = await supabase
        .from("alerts")
        .insert([{
          company_id: employee.company_id,
          title: "Shift Change Request",
          message: `${employee.full_name} has requested a shift change: ${changeReason}`,
          severity: "info",
          category: "workforce",
          source: "staff_request"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift change request submitted!");
      setChangeReason("");
    },
    onError: (error: any) => {
      toast.error("Failed to submit request: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Request</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vacation">Vacation</TabsTrigger>
            <TabsTrigger value="shift-change">Shift Change</TabsTrigger>
          </TabsList>

          <TabsContent value="vacation" className="space-y-4">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={vacationType} onValueChange={setVacationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal Day</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !vacationStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {vacationStartDate ? format(vacationStartDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={vacationStartDate}
                      onSelect={setVacationStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !vacationEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {vacationEndDate ? format(vacationEndDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={vacationEndDate}
                      onSelect={setVacationEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={vacationReason}
                onChange={(e) => setVacationReason(e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => submitVacationRequest.mutate()}
              disabled={submitVacationRequest.isPending}
            >
              {submitVacationRequest.isPending ? "Submitting..." : "Submit Vacation Request"}
            </Button>
          </TabsContent>

          <TabsContent value="shift-change" className="space-y-4">
            <div className="space-y-2">
              <Label>Change Request Details</Label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Describe the shift change you need (which shift, what change, why)..."
                rows={5}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => submitShiftChange.mutate()}
              disabled={submitShiftChange.isPending}
            >
              {submitShiftChange.isPending ? "Submitting..." : "Submit Shift Change Request"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
