import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TemplatePreviewDialog } from "@/components/TemplatePreviewDialog";

const locations = ["LBFC Amzei", "LBFC Mosilor", "LBFC Timpuri Noi", "LBFC Apaca"];

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

interface TemplateBasic {
  id: string;
  name: string;
  description?: string;
}

interface AuditTemplate extends TemplateBasic {
  sections: AuditSection[];
}

const LocationAudit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const templateIdFromUrl = searchParams.get('template');
  
  const [templates, setTemplates] = useState<TemplateBasic[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [formData, setFormData] = useState({
    location: "",
    auditDate: new Date().toISOString().split('T')[0],
    timeStart: "",
    timeEnd: "",
    notes: "",
    customData: {} as Record<string, any>,
  });

  useEffect(() => {
    loadTemplates();
    if (draftId) {
      loadDraft(draftId);
    } else if (templateIdFromUrl) {
      // Auto-select template from URL
      setSelectedTemplateId(templateIdFromUrl);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetails(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .eq('id', id)
        .eq('status', 'draft')
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedTemplateId(data.template_id || '');
        setFormData({
          location: data.location,
          auditDate: data.audit_date,
          timeStart: data.time_start || '',
          timeEnd: data.time_end || '',
          notes: data.notes || '',
          customData: (data.custom_data as Record<string, any>) || {},
        });
        toast.info('Draft loaded successfully');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('id, name, description')
        .eq('template_type', 'location')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (templateId: string) => {
    try {
      const { data: sections, error: sectionsError } = await supabase
        .from('audit_sections')
        .select('id, name, description, display_order')
        .eq('template_id', templateId)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      const sectionsWithFields = await Promise.all(
        (sections || []).map(async (section) => {
          const { data: fields, error: fieldsError } = await supabase
            .from('audit_fields')
            .select('id, name, field_type, is_required, options, display_order')
            .eq('section_id', section.id)
            .order('display_order');

          if (fieldsError) throw fieldsError;

          return {
            ...section,
            fields: fields || [],
          };
        })
      );

      const template = templates.find(t => t.id === templateId);
      setSelectedTemplate({
        id: templateId,
        name: template?.name || '',
        description: template?.description,
        sections: sectionsWithFields,
      });
    } catch (error) {
      console.error('Error loading template details:', error);
      toast.error('Failed to load template details');
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      customData: {
        ...formData.customData,
        [fieldId]: value,
      },
    });
  };

  const renderField = (field: AuditField) => {
    const value = formData.customData[field.id] || '';

    switch (field.field_type) {
      case 'rating':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <RadioGroup
              value={value.toString()}
              onValueChange={(val) => handleFieldChange(field.id, parseInt(val))}
              className="flex gap-4"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`${field.id}-${rating}`} />
                  <Label htmlFor={`${field.id}-${rating}`}>{rating}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'yes_no':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <RadioGroup
              value={value.toString()}
              onValueChange={(val) => handleFieldChange(field.id, val === 'true')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${field.id}-yes`} />
                <Label htmlFor={`${field.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${field.id}-no`} />
                <Label htmlFor={`${field.id}-no`}>No</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
            />
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.is_required}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
            />
          </div>
        );
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      toast.error('You must be logged in to save a draft');
      return;
    }

    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    try {
      const auditData = {
        user_id: user.id,
        location: formData.location,
        audit_date: formData.auditDate,
        time_start: formData.timeStart || null,
        time_end: formData.timeEnd || null,
        notes: formData.notes || null,
        template_id: selectedTemplateId,
        custom_data: formData.customData,
        status: 'draft',
      };

      if (currentDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from('location_audits')
          .update(auditData)
          .eq('id', currentDraftId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('location_audits')
          .insert(auditData)
          .select()
          .single();

        if (error) throw error;
        setCurrentDraftId(data.id);
      }

      toast.success("Draft saved successfully!");
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit an audit');
      return;
    }

    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    try {
      // Calculate overall score from rating fields
      let totalRatings = 0;
      let ratingCount = 0;

      if (selectedTemplate) {
        selectedTemplate.sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.field_type === 'rating') {
              const value = formData.customData[field.id];
              if (typeof value === 'number') {
                totalRatings += value;
                ratingCount++;
              }
            }
          });
        });
      }

      // Calculate percentage (ratings are 1-5, so max is 5)
      const overallScore = ratingCount > 0 
        ? Math.round((totalRatings / (ratingCount * 5)) * 100) 
        : 0;

      // Determine status based on score
      const COMPLIANCE_THRESHOLD = 80;
      const status = overallScore >= COMPLIANCE_THRESHOLD ? 'compliant' : 'non-compliant';

      const auditData = {
        user_id: user.id,
        location: formData.location,
        audit_date: formData.auditDate,
        time_start: formData.timeStart || null,
        time_end: formData.timeEnd || null,
        notes: formData.notes || null,
        template_id: selectedTemplateId,
        custom_data: formData.customData,
        overall_score: overallScore,
        status: status,
      };

      if (currentDraftId) {
        // Update existing draft to submitted
        const { error } = await supabase
          .from('location_audits')
          .update(auditData)
          .eq('id', currentDraftId);

        if (error) throw error;
      } else {
        // Create new audit
        const { error } = await supabase
          .from('location_audits')
          .insert(auditData);

        if (error) throw error;
      }

      toast.success("Location audit submitted successfully!");
      navigate("/");
    } catch (error) {
      console.error('Error submitting audit:', error);
      toast.error('Failed to submit audit');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Location Standard Checker
              {currentDraftId && (
                <span className="ml-3 text-sm font-normal text-muted-foreground">
                  (Editing Draft)
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">Complete the location audit form</p>
          </div>
          {selectedTemplate && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Template
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template">Template *</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audit template" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description && (
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditDate">Audit Date *</Label>
                <Input
                  id="auditDate"
                  type="date"
                  required
                  value={formData.auditDate}
                  onChange={(e) => setFormData({ ...formData, auditDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeStart">Start Time</Label>
                <Input
                  id="timeStart"
                  type="time"
                  value={formData.timeStart}
                  onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeEnd">End Time</Label>
                <Input
                  id="timeEnd"
                  type="time"
                  value={formData.timeEnd}
                  onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Dynamic Sections from Template */}
          {selectedTemplate && selectedTemplate.sections.map((section) => (
            <Card key={section.id} className="p-6">
              <h2 className="text-xl font-semibold mb-2">{section.name}</h2>
              {section.description && (
                <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* Notes */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
            <Textarea
              placeholder="Add any additional observations or notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[100px]"
            />
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" className="gap-2" disabled={!selectedTemplateId}>
              <Save className="h-4 w-4" />
              Submit Audit
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleSaveDraft}
              disabled={!selectedTemplateId}
              className="gap-2"
            >
              <FileEdit className="h-4 w-4" />
              Save as Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
        </form>

        {selectedTemplate && (
          <TemplatePreviewDialog
            open={showPreview}
            onOpenChange={setShowPreview}
            templateName={selectedTemplate.name}
            sections={selectedTemplate.sections}
          />
        )}
      </main>
    </div>
  );
};

export default LocationAudit;
