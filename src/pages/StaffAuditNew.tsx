import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LocationSelector } from "@/components/LocationSelector";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateStaffAudit } from "@/hooks/useStaffAudits";
import { TemplatePreviewDialog } from "@/components/TemplatePreviewDialog";

interface AuditField {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
  options?: any;
}

interface AuditSection {
  id: string;
  name: string;
  description?: string;
  fields: AuditField[];
}

interface AuditTemplate {
  id: string;
  name: string;
  description?: string;
  sections: AuditSection[];
}

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
    customData: {} as Record<string, any>,
  });
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const { data: employees } = useEmployees(
    formData.location_id && formData.location_id !== "__all__" 
      ? formData.location_id 
      : undefined
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (formData.template_id) {
      loadTemplateDetails(formData.template_id);
    } else {
      setSelectedTemplate(null);
    }
  }, [formData.template_id]);

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

  const loadTemplateDetails = async (templateId: string) => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('audit_sections')
        .select(`
          id,
          name,
          description,
          display_order,
          audit_fields (
            id,
            name,
            field_type,
            is_required,
            options,
            display_order
          )
        `)
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const sections = sectionsData.map((section: any) => ({
        ...section,
        fields: (section.audit_fields || []).sort(
          (a: any, b: any) => a.display_order - b.display_order
        ),
      }));

      setSelectedTemplate({
        ...templateData,
        sections,
      });
    } catch (error) {
      console.error('Error loading template details:', error);
      toast.error('Failed to load template details');
    }
  };

  const calculateScore = () => {
    if (!selectedTemplate) return formData.score;

    let totalScore = 0;
    let fieldCount = 0;

    selectedTemplate.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const value = formData.customData[field.id];
        if (field.field_type === 'rating' && value) {
          totalScore += parseInt(value);
          fieldCount++;
        }
      });
    });

    if (fieldCount === 0) return formData.score;

    // Calculate percentage based on 5-point scale
    return Math.round((totalScore / (fieldCount * 5)) * 100);
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

    const finalScore = selectedTemplate ? calculateScore() : formData.score;

    if (finalScore < 0 || finalScore > 100) {
      toast.error('Score must be between 0 and 100');
      return;
    }

    try {
      await createStaffAudit.mutateAsync({
        location_id: formData.location_id,
        employee_id: formData.employee_id,
        audit_date: formData.audit_date,
        score: finalScore,
        notes: formData.notes,
        template_id: formData.template_id,
        custom_data: selectedTemplate ? formData.customData : {},
      });

      toast.success('Staff audit submitted successfully');
      navigate('/staff-audits');
    } catch (error: any) {
      console.error('Error submitting audit:', error);
      toast.error(error.message || 'Failed to submit audit');
    }
  };

  const renderField = (field: AuditField) => {
    const value = formData.customData[field.id];

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                customData: { ...prev.customData, [field.id]: e.target.value },
              }))
            }
            required={field.is_required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                customData: { ...prev.customData, [field.id]: e.target.value },
              }))
            }
            required={field.is_required}
            rows={3}
          />
        );

      case 'rating':
        return (
          <RadioGroup
            value={value?.toString()}
            onValueChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                customData: { ...prev.customData, [field.id]: val },
              }))
            }
            required={field.is_required}
            className="flex gap-4"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <RadioGroupItem value={rating.toString()} id={`${field.id}-${rating}`} />
                <Label htmlFor={`${field.id}-${rating}`}>{rating}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'select':
        const options = field.options?.options || [];
        return (
          <Select
            value={value || ''}
            onValueChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                customData: { ...prev.customData, [field.id]: val },
              }))
            }
            required={field.is_required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-tight">
            New Staff Audit
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-2">
            Create a new staff performance audit
          </p>
        </div>
        {selectedTemplate && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Template
          </Button>
        )}
      </div>

      <Card className="p-6">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <LocationSelector
                    id="location"
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
                    <SelectTrigger id="employee">
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
                  <Label htmlFor="score">
                    Performance Score (0-100) *
                    {selectedTemplate && " (Auto-calculated from template)"}
                  </Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    value={selectedTemplate ? calculateScore() : formData.score}
                    onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                    required
                    disabled={!!selectedTemplate}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select
                    value={formData.template_id || "none"}
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        template_id: value === "none" ? null : value,
                        customData: {}, // Reset custom data when template changes
                      }));
                    }}
                  >
                    <SelectTrigger id="template">
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
                  {templates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No staff templates available
                    </p>
                  )}
                </div>
              </div>

              {selectedTemplate && (
                <div className="space-y-6 mt-6">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Template Fields</h3>
                    {selectedTemplate.sections.map((section) => (
                      <div key={section.id} className="mb-6">
                        <h4 className="font-medium text-base mb-3">{section.name}</h4>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                        )}
                        <div className="space-y-4">
                          {section.fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <Label>
                                {field.name}
                                {field.is_required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {renderField(field)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

          {selectedTemplate && (
            <TemplatePreviewDialog
              templateName={selectedTemplate.name}
              sections={selectedTemplate.sections}
              open={showPreview}
              onOpenChange={setShowPreview}
            />
          )}
        </div>
  );
};

export default StaffAuditNew;
