import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditTemplates } from "@/hooks/useAuditTemplates";
import { useLocations } from "@/hooks/useLocations";
import { useCreateScheduledAudit } from "@/hooks/useScheduledAuditsNew";
import { useCompanyContext } from "@/contexts/CompanyContext";

const ScheduleAudit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { company } = useCompanyContext();
  
  const preselectedTemplate = searchParams.get("template");
  
  const [formData, setFormData] = useState({
    template_id: preselectedTemplate || "",
    location_id: "",
    assigned_to: "",
    scheduled_for: "",
    frequency: "once",
  });

  const { data: templates } = useAuditTemplates();
  const { data: locations } = useLocations();
  const createScheduled = useCreateScheduledAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
    if (!user) return;

    await createScheduled.mutateAsync({
      ...formData,
      assigned_to: user.id, // For now assign to current user
      status: "scheduled",
    });
    
    navigate("/audits");
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule Audit</h1>
          <p className="text-muted-foreground mt-1">
            Create a new audit or set up recurring audits
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="template">Audit Template</Label>
                <Select
                  value={formData.template_id}
                  onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduled_for">Scheduled Date & Time</Label>
                <Input
                  id="scheduled_for"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/audits")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createScheduled.isPending}>
                  Schedule Audit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
};

export default ScheduleAudit;
