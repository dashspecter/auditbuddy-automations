import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Check, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { useAuditDraft } from "@/hooks/useAuditDraft";
import { AuditDraft, clearAuditDraft, buildDraftKey } from "@/lib/auditDraftStorage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  location_id?: string | null;
}

interface AuditTemplate extends TemplateBasic {
  sections: AuditSection[];
}

interface ManagerLocation {
  id: string;
  name: string;
}

const StaffLocationAudit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const templateIdFromUrl = searchParams.get('template');
  
  const [templates, setTemplates] = useState<TemplateBasic[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [managerLocations, setManagerLocations] = useState<ManagerLocation[]>([]);
  const [sectionFollowUps, setSectionFollowUps] = useState<Record<string, { needed: boolean; notes: string }>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'template' | 'location'; value: string } | null>(null);
  
  const [formData, setFormData] = useState({
    location_id: "",
    auditDate: new Date().toISOString().split('T')[0],
    timeStart: "",
    timeEnd: "",
    notes: "",
    customData: {} as Record<string, any>,
  });

  // Draft restoration handler
  const handleDraftRestore = useCallback((draft: AuditDraft) => {
    setFormData(draft.formData);
    setCurrentSectionIndex(draft.currentSectionIndex);
    if (draft.sectionFollowUps) {
      setSectionFollowUps(draft.sectionFollowUps);
    }
  }, []);

  // Use audit draft hook for persistence
  const { clearDraft, resetDraftState, hasPendingDraft } = useAuditDraft({
    templateId: selectedTemplateId,
    locationId: formData.location_id,
    formData,
    currentSectionIndex,
    sectionFollowUps,
    onRestore: handleDraftRestore,
    enabled: !draftId && !!selectedTemplateId && !!formData.location_id,
  });

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Get employee data and their locations
        const { data: empData } = await supabase
          .from("employees")
          .select("id, company_id, location_id, locations(id, name)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!empData) {
          toast.error("Employee record not found");
          navigate("/staff");
          return;
        }

        // Load manager's assigned locations
        const { data: additionalLocations } = await supabase
          .from("staff_locations")
          .select("location_id, locations(id, name)")
          .eq("staff_id", empData.id);

        const allLocations: ManagerLocation[] = [];
        
        if (empData.locations) {
          allLocations.push({ 
            id: (empData.locations as any).id, 
            name: (empData.locations as any).name 
          });
        }
        
        if (additionalLocations) {
          additionalLocations.forEach((loc: any) => {
            if (loc.locations && !allLocations.find(l => l.id === loc.locations.id)) {
              allLocations.push({ id: loc.locations.id, name: loc.locations.name });
            }
          });
        }
        
        setManagerLocations(allLocations);

        // Set default location
        if (allLocations.length > 0 && !formData.location_id) {
          setFormData(prev => ({ ...prev, location_id: allLocations[0].id }));
        }

        // Load templates for company
        const { data: templatesData } = await supabase
          .from("audit_templates")
          .select("id, name, description, location_id, template_type")
          .eq("company_id", empData.company_id)
          .eq("is_active", true)
          .eq("template_type", "location");

        // Load assigned templates for this user
        const { data: assignedData } = await supabase
          .from("audit_template_checkers")
          .select("template_id")
          .eq("user_id", user.id);

        const assignedTemplateIds = assignedData?.map(a => a.template_id) || [];

        if (templatesData) {
          // If user has assignments, only show assigned templates
          // If no assignments exist for user, show all templates (backwards compatible)
          const filteredTemplates = assignedTemplateIds.length > 0
            ? templatesData.filter(t => assignedTemplateIds.includes(t.id))
            : templatesData;
          
          setTemplates(filteredTemplates);
          
          if (templateIdFromUrl) {
            setSelectedTemplateId(templateIdFromUrl);
          }
        }

        // Load draft if exists
        if (draftId) {
          const { data: draftData } = await supabase
            .from("location_audits")
            .select("*")
            .eq("id", draftId)
            .single();

          if (draftData) {
            setFormData({
              location_id: draftData.location_id || "",
              auditDate: draftData.audit_date || new Date().toISOString().split('T')[0],
              timeStart: draftData.time_start || "",
              timeEnd: draftData.time_end || "",
              notes: draftData.notes || "",
              customData: (draftData.custom_data as Record<string, any>) || {},
            });
            if (draftData.template_id) {
              setSelectedTemplateId(draftData.template_id);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load audit data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, draftId, templateIdFromUrl, navigate]);

  // Load template details when selected
  useEffect(() => {
    const loadTemplateDetails = async () => {
      if (!selectedTemplateId) {
        setSelectedTemplate(null);
        return;
      }

      const { data: templateData } = await supabase
        .from("audit_templates")
        .select("id, name, description, location_id")
        .eq("id", selectedTemplateId)
        .single();

      if (!templateData) return;

      const { data: sectionsData } = await supabase
        .from("audit_sections")
        .select("id, name, description")
        .eq("template_id", selectedTemplateId)
        .order("display_order");

      const sections: AuditSection[] = [];
      
      if (sectionsData) {
        for (const section of sectionsData) {
          const { data: fieldsData } = await supabase
            .from("audit_fields")
            .select("id, name, field_type, is_required, options")
            .eq("section_id", section.id)
            .order("display_order");

          sections.push({
            ...section,
            fields: fieldsData || [],
          });
        }
      }

      setSelectedTemplate({
        ...templateData,
        sections,
      });
      setCurrentSectionIndex(0);
    };

    loadTemplateDetails();
  }, [selectedTemplateId]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customData: {
        ...prev.customData,
        [fieldId]: value,
      },
    }));
    // Clear field error when user fills the field
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFollowUpChange = (sectionId: string, needed: boolean, notes: string = "") => {
    setSectionFollowUps(prev => ({
      ...prev,
      [sectionId]: { needed, notes },
    }));
  };

  const saveDraft = async () => {
    if (!user || !selectedTemplateId || !formData.location_id) {
      toast.error("Please select a template and location");
      return;
    }

    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!empData) {
        toast.error("Employee not found");
        return;
      }

      const locationName = managerLocations.find(l => l.id === formData.location_id)?.name || "";

      const auditPayload = {
        template_id: selectedTemplateId,
        location_id: formData.location_id,
        location: locationName,
        user_id: user.id,
        company_id: empData.company_id,
        audit_date: formData.auditDate,
        time_start: formData.timeStart || null,
        time_end: formData.timeEnd || null,
        notes: formData.notes || null,
        custom_data: formData.customData,
        status: "draft",
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from("location_audits")
          .update(auditPayload)
          .eq("id", currentDraftId);

        if (error) throw error;
        toast.success("Draft saved");
      } else {
        const { data, error } = await supabase
          .from("location_audits")
          .insert([auditPayload])
          .select()
          .single();

        if (error) throw error;
        setCurrentDraftId(data.id);
        toast.success("Draft created");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const calculateScore = () => {
    if (!selectedTemplate) return { score: 0, maxScore: 0 };
    
    let totalScore = 0;
    let maxScore = 0;

    selectedTemplate.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.field_type === "rating") {
          maxScore += 5;
          const value = formData.customData[field.id];
          if (value !== undefined && value !== null) {
            totalScore += Number(value);
          }
        } else if (field.field_type === "yes_no" || field.field_type === "yesno" || field.field_type === "checkbox") {
          // checkbox, yesno, yes_no all count as binary 0/1 fields
          maxScore += 1;
          const value = formData.customData[field.id];
          if (value === "yes" || value === true) {
            totalScore += 1;
          }
        }
      });
    });

    return { score: totalScore, maxScore };
  };

  // Validate required fields
  const validateRequiredFields = (): { valid: boolean; errors: string[] } => {
    if (!selectedTemplate) return { valid: true, errors: [] };
    
    const errors: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    selectedTemplate.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.is_required) {
          const value = formData.customData[field.id];
          
          if (value === undefined || value === null || value === '') {
            errors.push(`${field.name} is required in ${section.name}`);
            newFieldErrors[field.id] = 'Required';
          } else if (field.field_type === 'rating' && (typeof value !== 'number' || value < 1 || value > 5)) {
            errors.push(`${field.name} must be rated between 1-5 in ${section.name}`);
            newFieldErrors[field.id] = 'Invalid rating';
          } else if ((field.field_type === 'yesno' || field.field_type === 'yes_no' || field.field_type === 'checkbox') && 
                     value !== 'yes' && value !== 'no' && value !== true && value !== false) {
            errors.push(`${field.name} must be answered with YES or NO in ${section.name}`);
            newFieldErrors[field.id] = 'Invalid answer';
          }
        }
      });
    });

    setFieldErrors(newFieldErrors);
    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async () => {
    if (!user || !selectedTemplateId || !formData.location_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate required fields before submitting
    const validation = validateRequiredFields();
    if (!validation.valid) {
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Please complete all required fields:</div>
          <ul className="list-disc pl-4 space-y-1">
            {validation.errors.slice(0, 5).map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
            {validation.errors.length > 5 && (
              <li className="text-sm">...and {validation.errors.length - 5} more</li>
            )}
          </ul>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!empData) {
        toast.error("Employee not found");
        return;
      }

      const { score, maxScore } = calculateScore();
      const percentScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      const locationName = managerLocations.find(l => l.id === formData.location_id)?.name || "";

      // Determine status based on score - 80% is compliance threshold
      const COMPLIANCE_THRESHOLD = 80;
      const status = percentScore >= COMPLIANCE_THRESHOLD ? 'compliant' : 'non-compliant';

      const auditPayload = {
        template_id: selectedTemplateId,
        location_id: formData.location_id,
        location: locationName,
        user_id: user.id,
        company_id: empData.company_id,
        audit_date: formData.auditDate,
        time_start: formData.timeStart || null,
        time_end: formData.timeEnd || null,
        notes: formData.notes || null,
        custom_data: formData.customData,
        status: status,
        overall_score: percentScore,
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from("location_audits")
          .update(auditPayload)
          .eq("id", currentDraftId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("location_audits")
          .insert([auditPayload]);

        if (error) throw error;
      }

      // Clear the local draft after successful submission
      await clearDraft();
      
      toast.success("Audit submitted successfully!");
      navigate("/staff");
    } catch (error) {
      console.error("Error submitting audit:", error);
      toast.error("Failed to submit audit");
    } finally {
      setSubmitting(false);
    }
  };

  const currentSection = selectedTemplate?.sections[currentSectionIndex];
  const totalSections = selectedTemplate?.sections.length || 0;
  const { score, maxScore } = calculateScore();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/staff")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Location Audit</h1>
            <p className="text-sm opacity-80">Complete the inspection form</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={saveDraft}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Save className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Information */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Template *</Label>
              <Select 
                value={selectedTemplateId} 
                onValueChange={(value) => {
                  // If we have pending draft data and changing template, confirm discard
                  if (hasPendingDraft && selectedTemplateId && value !== selectedTemplateId) {
                    setPendingChange({ type: 'template', value });
                    setShowDiscardDialog(true);
                  } else {
                    setSelectedTemplateId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audit template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location *</Label>
              <Select 
                value={formData.location_id} 
                onValueChange={(value) => {
                  // If we have pending draft data and changing location, confirm discard
                  if (hasPendingDraft && formData.location_id && value !== formData.location_id) {
                    setPendingChange({ type: 'location', value });
                    setShowDiscardDialog(true);
                  } else {
                    setFormData(prev => ({ ...prev, location_id: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {managerLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Audit Date *</Label>
              <Input
                type="date"
                value={formData.auditDate}
                onChange={(e) => setFormData(prev => ({ ...prev, auditDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.timeStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeStart: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.timeEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeEnd: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Template Sections */}
        {selectedTemplate && currentSection && (
          <>
            {/* Section Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSectionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentSectionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSectionIndex(prev => Math.min(totalSections - 1, prev + 1))}
                disabled={currentSectionIndex === totalSections - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Current Section */}
            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-2">{currentSection.name}</h3>
              {currentSection.description && (
                <p className="text-sm text-muted-foreground mb-4">{currentSection.description}</p>
              )}

              <div className="space-y-4">
                {currentSection.fields.map((field) => (
                  <div key={field.id} className={`space-y-2 ${fieldErrors[field.id] ? 'p-2 border border-destructive rounded-md bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <Label className={field.is_required ? "after:content-['*'] after:text-destructive after:ml-1" : ""}>
                        {field.name}
                      </Label>
                      {fieldErrors[field.id] && (
                        <span className="text-xs text-destructive font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {fieldErrors[field.id]}
                        </span>
                      )}
                    </div>
                    
                    {field.field_type === "text" && (
                      <Input
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter text..."
                        className={fieldErrors[field.id] ? 'border-destructive' : ''}
                      />
                    )}

                    {field.field_type === "number" && (
                      <Input
                        type="number"
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter number..."
                        className={fieldErrors[field.id] ? 'border-destructive' : ''}
                      />
                    )}

                    {field.field_type === "rating" && (
                      <div className={`flex gap-2 ${fieldErrors[field.id] ? 'ring-1 ring-destructive rounded-md p-1' : ''}`}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            variant={formData.customData[field.id] === rating ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleFieldChange(field.id, rating)}
                            className="w-10 h-10"
                          >
                            {rating}
                          </Button>
                        ))}
                      </div>
                    )}

                    {(field.field_type === "yes_no" || field.field_type === "yesno" || field.field_type === "checkbox") && (
                      <div className={`flex gap-2 ${fieldErrors[field.id] ? 'ring-1 ring-destructive rounded-md p-1' : ''}`}>
                        <Button
                          variant={formData.customData[field.id] === "yes" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleFieldChange(field.id, "yes")}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Yes
                        </Button>
                        <Button
                          variant={formData.customData[field.id] === "no" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleFieldChange(field.id, "no")}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          No
                        </Button>
                      </div>
                    )}

                    {field.field_type === "date" && (
                      <Input
                        type="date"
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className={fieldErrors[field.id] ? 'border-destructive' : ''}
                      />
                    )}

                    {field.field_type === "textarea" && (
                      <Textarea
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter details..."
                        rows={3}
                        className={fieldErrors[field.id] ? 'border-destructive' : ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Section Follow-up */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-base font-semibold">Follow-up Actions Required?</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={sectionFollowUps[currentSection.id]?.needed ? "default" : "outline"}
                    className={`h-12 text-base font-semibold transition-all ${
                      sectionFollowUps[currentSection.id]?.needed 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-md' 
                        : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
                    }`}
                    onClick={() => handleFollowUpChange(currentSection.id, true, sectionFollowUps[currentSection.id]?.notes || "")}
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Needed
                  </Button>
                  
                  <Button
                    type="button"
                    variant={!sectionFollowUps[currentSection.id]?.needed ? "default" : "outline"}
                    className={`h-12 text-base font-semibold transition-all ${
                      !sectionFollowUps[currentSection.id]?.needed 
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-md' 
                        : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                    }`}
                    onClick={() => handleFollowUpChange(currentSection.id, false, "")}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Not Needed
                  </Button>
                </div>

                {sectionFollowUps[currentSection.id]?.needed && (
                  <div className="space-y-2 pt-2">
                    <Label>Follow-up Notes *</Label>
                    <Textarea
                      value={sectionFollowUps[currentSection.id]?.notes || ""}
                      onChange={(e) => handleFollowUpChange(currentSection.id, true, e.target.value)}
                      placeholder="Describe what follow-up actions are needed..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Notes */}
        <Card className="p-4">
          <Label>Additional Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any additional observations..."
            rows={3}
            className="mt-2"
          />
        </Card>

        {/* Score Preview */}
        {selectedTemplate && maxScore > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Score</span>
              <span className="text-lg font-bold text-primary">
                {Math.round((score / maxScore) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(score / maxScore) * 100}%` }}
              />
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={saveDraft}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedTemplateId || !formData.location_id}
            className="flex-1"
          >
            {submitting ? "Submitting..." : "Submit Audit"}
          </Button>
        </div>
      </div>

      <StaffBottomNav />

      {/* Discard Draft Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard current draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the {pendingChange?.type} will discard your current progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingChange(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingChange) {
                  // Clear old draft
                  if (user?.id && formData.location_id && selectedTemplateId) {
                    const oldKey = buildDraftKey(user.id, formData.location_id, selectedTemplateId);
                    await clearAuditDraft(oldKey);
                  }
                  resetDraftState();
                  
                  // Apply the change
                  if (pendingChange.type === 'template') {
                    setSelectedTemplateId(pendingChange.value);
                    setFormData(prev => ({ ...prev, customData: {} }));
                  } else {
                    setFormData(prev => ({ ...prev, location_id: pendingChange.value, customData: {} }));
                  }
                  setCurrentSectionIndex(0);
                  setSectionFollowUps({});
                }
                setPendingChange(null);
                setShowDiscardDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffLocationAudit;
