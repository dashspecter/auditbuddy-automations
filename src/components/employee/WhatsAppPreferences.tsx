import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Clock, Shield } from "lucide-react";
import { useEmployeeMessagingPrefs, useUpsertEmployeeMessagingPrefs } from "@/hooks/useWhatsApp";
import { validatePhoneForWhatsApp, normalizeToE164, maskPhone } from "@/lib/phoneUtils";
import { toast } from "sonner";

interface WhatsAppPreferencesProps {
  employeeId: string;
  employeePhone?: string;
}

export function WhatsAppPreferences({ employeeId, employeePhone }: WhatsAppPreferencesProps) {
  const { data: prefs, isLoading } = useEmployeeMessagingPrefs(employeeId);
  const upsert = useUpsertEmployeeMessagingPrefs();

  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [language, setLanguage] = useState("en");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [maxPerDay, setMaxPerDay] = useState("20");

  useEffect(() => {
    if (prefs) {
      setPhone(prefs.phone_e164 || "");
      setOptIn(prefs.whatsapp_opt_in || false);
      setLanguage(prefs.language || "en");
      setQuietStart(prefs.quiet_hours_start || "22:00");
      setQuietEnd(prefs.quiet_hours_end || "07:00");
      setMaxPerDay(String(prefs.max_messages_per_day || 20));
    } else if (employeePhone) {
      setPhone(normalizeToE164(employeePhone));
    }
  }, [prefs, employeePhone]);

  const handleSave = () => {
    const validation = validatePhoneForWhatsApp(phone);
    if (optIn && !validation.valid) {
      toast.error(validation.error || "Invalid phone number");
      return;
    }

    upsert.mutate({
      employee_id: employeeId,
      phone_e164: validation.normalized || phone,
      whatsapp_opt_in: optIn,
      opt_in_at: optIn && !prefs?.whatsapp_opt_in ? new Date().toISOString() : prefs?.opt_in_at,
      opt_in_source: prefs?.opt_in_source || "manual",
      opted_out_at: !optIn ? new Date().toISOString() : null,
      language,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      max_messages_per_day: parseInt(maxPerDay) || 20,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          WhatsApp Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone */}
        <div>
          <Label htmlFor="wa-phone">WhatsApp Phone (E.164)</Label>
          <Input
            id="wa-phone"
            placeholder="+40712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {phone && (
            <p className="text-xs text-muted-foreground mt-1">
              Display: {maskPhone(phone)}
            </p>
          )}
        </div>

        {/* Opt-in */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              WhatsApp Opt-in
            </Label>
            <p className="text-xs text-muted-foreground">
              Employee consents to receive WhatsApp notifications
            </p>
          </div>
          <Switch checked={optIn} onCheckedChange={setOptIn} />
        </div>

        {optIn && (
          <>
            {/* Language */}
            <div>
              <Label>Preferred Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ro">Română</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Quiet Hours
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Until</Label>
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Max per day */}
            <div>
              <Label>Max Messages Per Day</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(e.target.value)}
              />
            </div>
          </>
        )}

        {prefs?.opt_in_at && optIn && (
          <p className="text-xs text-muted-foreground">
            Opted in: {new Date(prefs.opt_in_at).toLocaleDateString()}
          </p>
        )}
        {prefs?.opted_out_at && !optIn && (
          <p className="text-xs text-muted-foreground">
            Opted out: {new Date(prefs.opted_out_at).toLocaleDateString()}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={upsert.isPending}
          className="w-full"
          size="sm"
        >
          {upsert.isPending ? "Saving..." : "Save WhatsApp Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
