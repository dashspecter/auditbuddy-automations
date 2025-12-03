import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoClockoutSettingsProps {
  company: any;
}

export function AutoClockoutSettings({ company }: AutoClockoutSettingsProps) {
  const [delayMinutes, setDelayMinutes] = useState<number>(30);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (company?.auto_clockout_delay_minutes !== undefined) {
      setDelayMinutes(company.auto_clockout_delay_minutes);
    }
  }, [company]);

  const updateDelayMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const { error } = await supabase
        .from('companies')
        .update({ auto_clockout_delay_minutes: minutes })
        .eq('id', company.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success("Auto clock-out delay updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleSave = () => {
    if (delayMinutes >= 0 && delayMinutes !== company?.auto_clockout_delay_minutes) {
      updateDelayMutation.mutate(delayMinutes);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Auto Clock-Out Settings
        </CardTitle>
        <CardDescription>
          Automatically clock out employees who forget to clock out after their shift ends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delay-minutes">Minutes after shift end</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="delay-minutes"
              type="number"
              min={0}
              max={480}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Employees will be automatically clocked out {delayMinutes} minutes after their scheduled shift end time if they haven't clocked out manually.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={delayMinutes === company?.auto_clockout_delay_minutes || updateDelayMutation.isPending}
        >
          {updateDelayMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
