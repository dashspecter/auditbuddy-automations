import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffVisibilitySettingsProps {
  company: any;
}

export function StaffVisibilitySettings({ company }: StaffVisibilitySettingsProps) {
  const [hideEarnings, setHideEarnings] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (company?.hide_earnings_from_staff !== undefined) {
      setHideEarnings(company.hide_earnings_from_staff);
    }
  }, [company]);

  const updateSettingMutation = useMutation({
    mutationFn: async (hide: boolean) => {
      const { error } = await supabase
        .from('companies')
        .update({ hide_earnings_from_staff: hide })
        .eq('id', company.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success("Staff visibility settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleToggle = (checked: boolean) => {
    setHideEarnings(checked);
    updateSettingMutation.mutate(checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hideEarnings ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          Staff Dashboard Visibility
        </CardTitle>
        <CardDescription>
          Control what information employees can see on their mobile dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hide-earnings">Hide earnings from staff</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, employees will not see their earnings information on the mobile app
            </p>
          </div>
          <Switch
            id="hide-earnings"
            checked={hideEarnings}
            onCheckedChange={handleToggle}
            disabled={updateSettingMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}