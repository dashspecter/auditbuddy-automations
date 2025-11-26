import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LocationSelector } from "@/components/LocationSelector";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateStaffAudit } from "@/hooks/useStaffAudits";

const StaffAuditNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createStaffAudit = useCreateStaffAudit();
  
  const [formData, setFormData] = useState({
    location_id: "",
    employee_id: "",
    audit_date: new Date().toISOString().split('T')[0],
    score: 0,
    notes: "",
    template_id: null as string | null,
  });
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { data: employees } = useEmployees(
    formData.location_id && formData.location_id !== "__all__" 
      ? formData.location_id 
      : undefined
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('id, name, description, template_type')
        .eq('template_type', 'staff')
        .eq('is_active', true);
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.location_id || formData.location_id === "__all__") {
      toast.error('Please select a location');
      return;
    }

    if (!formData.employee_id) {
      toast.error('Please select an employee');
      return;
    }

    if (formData.score < 0 || formData.score > 100) {
      toast.error('Score must be between 0 and 100');
      return;
    }

    try {
      await createStaffAudit.mutateAsync({
        location_id: formData.location_id,
        employee_id: formData.employee_id,
        audit_date: formData.audit_date,
        score: formData.score,
        notes: formData.notes,
        template_id: formData.template_id,
        custom_data: {},
      });

      toast.success('Staff performance audit submitted successfully');
      navigate('/staff-audits');
    } catch (error: any) {
      console.error('Error submitting audit:', error);
      toast.error(error.message || 'Failed to submit audit');
    }
  };

  const activeEmployees = employees?.filter(e => e.status === 'active') || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/staff-audits')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Staff Performance Audits
          </Button>

          <Card className="p-6">
            <h1 className="text-3xl font-bold mb-6">New Staff Performance Audit</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <LocationSelector
                    value={formData.location_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        location_id: value,
                        employee_id: "", // Reset employee when location changes
                      }));
                    }}
                    placeholder="Select location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                    disabled={!formData.location_id || formData.location_id === "__all__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {activeEmployees.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No active employees found for this location
                        </div>
                      ) : (
                        activeEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name} - {employee.role}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!formData.location_id || formData.location_id === "__all__" ? (
                    <p className="text-sm text-muted-foreground">
                      Please select a location first
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audit_date">Audit Date *</Label>
                  <Input
                    id="audit_date"
                    type="date"
                    value={formData.audit_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, audit_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score">Performance Score (0-100) *</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="template">Template (Optional)</Label>
                    <Select
                      value={formData.template_id || "none"}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        template_id: value === "none" ? null : value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="none">No template</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any observations or comments..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={5}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createStaffAudit.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createStaffAudit.isPending ? 'Submitting...' : 'Submit Audit'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/staff-audits')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StaffAuditNew;
