import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClockInToggleSettingsProps {
  company: any;
}

export function ClockInToggleSettings({ company }: ClockInToggleSettingsProps) {
  const [clockInEnabled, setClockInEnabled] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (company?.clock_in_enabled !== undefined) {
      setClockInEnabled(company.clock_in_enabled);
    }
  }, [company]);

  const updateSettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('companies')
        .update({ clock_in_enabled: enabled })
        .eq('id', company.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success("Clock-in/out settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleToggle = (checked: boolean) => {
    setClockInEnabled(checked);
    updateSettingMutation.mutate(checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Clock-In / Clock-Out
        </CardTitle>
        <CardDescription>
          Control whether employees need to clock in and out for attendance tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="clock-in-enabled">Enable clock-in/out for employees</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, employees must clock in/out via mobile app or kiosk
            </p>
          </div>
          <Switch
            id="clock-in-enabled"
            checked={clockInEnabled}
            onCheckedChange={handleToggle}
            disabled={updateSettingMutation.isPending}
          />
        </div>
        
        {!clockInEnabled && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Clock-in/out is disabled.</strong> Payroll will be calculated based on scheduled shifts instead of actual attendance. 
              Employees will not see the clock-in button on their mobile app.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
