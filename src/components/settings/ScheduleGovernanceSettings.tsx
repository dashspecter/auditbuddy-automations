import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Lock, AlertTriangle, Info, Clock, MapPin } from "lucide-react";
import { useUpdateCompany } from "@/hooks/useCompany";
import { useLocations } from "@/hooks/useLocations";
import { useWorkforcePolicy, useSaveWorkforcePolicy, WorkforcePolicy } from "@/hooks/useScheduleGovernance";
import { toast } from "sonner";

interface ScheduleGovernanceSettingsProps {
  company: any;
}

export const ScheduleGovernanceSettings = ({ company }: ScheduleGovernanceSettingsProps) => {
  const updateCompany = useUpdateCompany();
  const { data: locations = [] } = useLocations();
  const [selectedPolicyLocation, setSelectedPolicyLocation] = useState<string>("company");
  
  const locationId = selectedPolicyLocation === "company" ? undefined : selectedPolicyLocation;
  const { data: policy, isLoading: policyLoading } = useWorkforcePolicy(locationId);
  const savePolicy = useSaveWorkforcePolicy();
  
  const [localPolicy, setLocalPolicy] = useState<Partial<WorkforcePolicy>>({});
  
  // Sync local policy when remote policy loads
  const effectivePolicy = {
    unscheduled_clock_in_policy: localPolicy.unscheduled_clock_in_policy ?? policy?.unscheduled_clock_in_policy ?? 'allow',
    grace_minutes: localPolicy.grace_minutes ?? policy?.grace_minutes ?? 60,
    late_threshold_minutes: localPolicy.late_threshold_minutes ?? policy?.late_threshold_minutes ?? 15,
    early_leave_threshold_minutes: localPolicy.early_leave_threshold_minutes ?? policy?.early_leave_threshold_minutes ?? 15,
    block_publish_on_critical: localPolicy.block_publish_on_critical ?? policy?.block_publish_on_critical ?? false,
    require_reason_on_locked_edits: localPolicy.require_reason_on_locked_edits ?? policy?.require_reason_on_locked_edits ?? true,
  };

  const isGovernanceEnabled = company?.enable_schedule_governance ?? false;

  const handleToggleGovernance = () => {
    updateCompany.mutate({ enable_schedule_governance: !isGovernanceEnabled });
  };

  const handleSavePolicy = async () => {
    if (!company?.id) return;
    
    try {
      await savePolicy.mutateAsync({
        company_id: company.id,
        location_id: locationId || null,
        ...effectivePolicy,
      });
      setLocalPolicy({});
      toast.success("Workforce policy saved");
    } catch (err) {
      // Error handled by mutation
    }
  };

  const updateLocalPolicy = (key: keyof WorkforcePolicy, value: any) => {
    setLocalPolicy(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Schedule Governance</CardTitle>
              <CardDescription>
                Control schedule locking, change approvals, and attendance enforcement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="governance-toggle" className="text-base font-medium">
                  Enable Schedule Governance
                </Label>
                <Badge variant={isGovernanceEnabled ? "default" : "secondary"}>
                  {isGovernanceEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, schedules can be published and locked. Locked schedules require manager approval for changes.
              </p>
            </div>
            <Switch
              id="governance-toggle"
              checked={isGovernanceEnabled}
              onCheckedChange={handleToggleGovernance}
              disabled={updateCompany.isPending}
            />
          </div>

          {isGovernanceEnabled && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Governance is active</AlertTitle>
              <AlertDescription>
                When a schedule period is locked, any edits will create change requests requiring manager approval.
                This provides an audit trail and prevents unauthorized schedule modifications.
              </AlertDescription>
            </Alert>
          )}

          {!isGovernanceEnabled && (
            <Alert variant="default" className="bg-muted">
              <Info className="h-4 w-4" />
              <AlertTitle>Governance is disabled</AlertTitle>
              <AlertDescription>
                Schedules can be edited freely without approval workflows. 
                Enable governance to add locking and change request functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Workforce Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Attendance Policies</CardTitle>
                <CardDescription>
                  Configure clock-in/out rules and exception handling
                </CardDescription>
              </div>
            </div>
            <Select value={selectedPolicyLocation} onValueChange={setSelectedPolicyLocation}>
              <SelectTrigger className="w-[200px]">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company Default</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {policyLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading policy...</div>
          ) : (
            <>
              {/* Unscheduled clock-in policy */}
              <div className="space-y-2">
                <Label>Unscheduled Clock-in Policy</Label>
                <Select
                  value={effectivePolicy.unscheduled_clock_in_policy}
                  onValueChange={(v) => updateLocalPolicy('unscheduled_clock_in_policy', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">
                      <div className="flex flex-col">
                        <span>Allow (default)</span>
                        <span className="text-xs text-muted-foreground">
                          Staff can clock in without a scheduled shift
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="exception_ticket">
                      <div className="flex flex-col">
                        <span>Exception Ticket</span>
                        <span className="text-xs text-muted-foreground">
                          Allow but create a pending exception for review
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="block">
                      <div className="flex flex-col">
                        <span>Block</span>
                        <span className="text-xs text-muted-foreground">
                          Deny unless manager override provided
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  What happens when an employee tries to clock in without a matching scheduled shift
                </p>
              </div>

              {/* Grace minutes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grace-minutes">Grace Window (minutes)</Label>
                  <Input
                    id="grace-minutes"
                    type="number"
                    min={0}
                    max={120}
                    value={effectivePolicy.grace_minutes}
                    onChange={(e) => updateLocalPolicy('grace_minutes', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before/after shift to match clock-in
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                  <Input
                    id="late-threshold"
                    type="number"
                    min={0}
                    max={60}
                    value={effectivePolicy.late_threshold_minutes}
                    onChange={(e) => updateLocalPolicy('late_threshold_minutes', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create late exception after this many minutes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="early-leave">Early Leave Threshold (minutes)</Label>
                  <Input
                    id="early-leave"
                    type="number"
                    min={0}
                    max={60}
                    value={effectivePolicy.early_leave_threshold_minutes}
                    onChange={(e) => updateLocalPolicy('early_leave_threshold_minutes', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create early leave exception if clocking out this early
                  </p>
                </div>
              </div>

              {/* Toggle options */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require reason for locked schedule edits</Label>
                    <p className="text-xs text-muted-foreground">
                      Force users to select a reason when modifying locked schedules
                    </p>
                  </div>
                  <Switch
                    checked={effectivePolicy.require_reason_on_locked_edits}
                    onCheckedChange={(v) => updateLocalPolicy('require_reason_on_locked_edits', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Block publish on critical staffing issues</Label>
                    <p className="text-xs text-muted-foreground">
                      Prevent publishing if minimum staffing not met (future feature)
                    </p>
                  </div>
                  <Switch
                    checked={effectivePolicy.block_publish_on_critical}
                    onCheckedChange={(v) => updateLocalPolicy('block_publish_on_critical', v)}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSavePolicy}
                  disabled={savePolicy.isPending || Object.keys(localPolicy).length === 0}
                >
                  {savePolicy.isPending ? "Saving..." : "Save Policy"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Warning section */}
      {isGovernanceEnabled && (
        <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription className="text-sm space-y-1">
            <p>• Once a schedule period is locked, changes require manager approval.</p>
            <p>• Approved changes are logged for audit purposes.</p>
            <p>• Staff can still clock in/out based on the attendance policy settings above.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};