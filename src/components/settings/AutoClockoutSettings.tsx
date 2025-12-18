import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.success(t('locations.autoClockout.updated'));
    },
    onError: (error) => {
      toast.error(t('locations.autoClockout.updateFailed') + ": " + error.message);
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
          {t('locations.autoClockout.title')}
        </CardTitle>
        <CardDescription>
          {t('locations.autoClockout.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delay-minutes">{t('locations.autoClockout.minutesAfterShift')}</Label>
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
            <span className="text-sm text-muted-foreground">{t('locations.autoClockout.minutes')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('locations.autoClockout.description', { minutes: delayMinutes })}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={delayMinutes === company?.auto_clockout_delay_minutes || updateDelayMutation.isPending}
        >
          {updateDelayMutation.isPending ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </CardContent>
    </Card>
  );
}
