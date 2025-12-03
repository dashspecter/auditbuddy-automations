import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useSwipeable } from "react-swipeable";
// Header removed - page uses app layout
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, FileEdit, Camera, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TemplatePreviewDialog } from "@/components/TemplatePreviewDialog";
import { ScorePreview } from "@/components/ScorePreview";
import { AuditPhotoCapture } from "@/components/AuditPhotoCapture";
import { PhotoGallery } from "@/components/PhotoGallery";
import { LocationSelector } from "@/components/LocationSelector";
import FieldResponseInput from "@/components/audit/FieldResponseInput";
import SectionFollowUpInput from "@/components/audit/SectionFollowUpInput";
import { useAuditFieldResponses, useSaveFieldResponse } from "@/hooks/useAuditFieldResponses";
import { useAuditSectionResponses, useSaveSectionResponse } from "@/hooks/useAuditSectionResponses";

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
  template_locations?: Array<{ location_id: string }>;
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
  const scheduledAuditId = searchParams.get('scheduled');
  
  const [templates, setTemplates] = useState<TemplateBasic[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [isScheduledAudit, setIsScheduledAudit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [formData, setFormData] = useState({
    location_id: "",
    auditDate: new Date().toISOString().split('T')[0],
    timeStart: "",
    timeEnd: "",
    notes: "",
    customData: {} as Record<string, any>,
  });

  // Load field responses
  const { data: fieldResponses = [] } = useAuditFieldResponses(currentDraftId || undefined);
  const saveFieldResponse = useSaveFieldResponse();

  // Load section responses
  const { data: sectionResponses = [] } = useAuditSectionResponses(currentDraftId || undefined);
  const saveSectionResponse = useSaveSectionResponse();

  // Helper to find field response
  const getFieldResponse = (fieldId: string) => {
    return fieldResponses.find(fr => fr.field_id === fieldId);
  };

  // Helper to find section response
  const getSectionResponse = (sectionId: string) => {
    return sectionResponses.find(sr => sr.section_id === sectionId);
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadTemplates();
      if (scheduledAuditId) {
        await loadScheduledAudit(scheduledAuditId);
      } else if (draftId) {
        await loadDraft(draftId);
      } else if (templateIdFromUrl) {
        // Auto-select template from URL
        setSelectedTemplateId(templateIdFromUrl);
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetails(selectedTemplateId);
      // Auto-fill location if template has a specific location (either old or new structure)
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template?.location_id) {
        // Old structure: single location_id
        setFormData(prev => ({ ...prev, location_id: template.location_id || '' }));
      } else if (template?.template_locations && template.template_locations.length === 1) {
        // New structure: single location in junction table
        setFormData(prev => ({ ...prev, location_id: template.template_locations?.[0]?.location_id || '' }));
      }
      
      // Auto-create draft if we don't have one and we're not loading an existing draft
      if (!currentDraftId && !draftId && user) {
        createInitialDraft();
      }
    }
  }, [selectedTemplateId, templates]);

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Check if this is a scheduled audit
        const isScheduled = !!(data.scheduled_start);
        setIsScheduledAudit(isScheduled);
        
        setSelectedTemplateId(data.template_id || '');
        setFormData({
          location_id: data.location_id || '',
          auditDate: data.audit_date,
          timeStart: data.time_start || '',
          timeEnd: data.time_end || '',
          notes: data.notes || '',
          customData: (data.custom_data as Record<string, any>) || {},
        });
        
        if (isScheduled) {
          toast.info('Scheduled audit loaded - location is locked');
        } else {
          toast.info('Draft loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    }
  };

  const loadScheduledAudit = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_audits')
        .select(`
          *,
          locations(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsScheduledAudit(true);
        setSelectedTemplateId(data.template_id || '');
        
        const scheduledDate = data.scheduled_for 
          ? new Date(data.scheduled_for).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        setFormData(prev => ({
          ...prev,
          location_id: data.location_id || '',
          auditDate: scheduledDate,
        }));
        
        toast.info(`Starting scheduled audit for ${data.locations?.name || 'location'}`);
      }
    } catch (error) {
      console.error('Error loading scheduled audit:', error);
      toast.error('Failed to load scheduled audit');
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('id, name, description, location_id, template_locations(location_id)')
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

    // Save field response to database if we have a draft
    if (currentDraftId && selectedTemplate) {
      const section = selectedTemplate.sections.find(s => 
        s.fields.some(f => f.id === fieldId)
      );
      
      if (section) {
        saveFieldResponse.mutate({
          auditId: currentDraftId,
          fieldId,
          sectionId: section.id,
          responseValue: value,
        });
      }
    }
  };

  const handleNextSection = () => {
    if (selectedTemplate && currentSectionIndex < selectedTemplate.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextSection(),
    onSwipedRight: () => handlePreviousSection(),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  const renderField = (field: AuditField, sectionId: string) => {
    const value = formData.customData[field.id] || '';
    const hasError = fieldErrors[field.id];
    const fieldResponse = getFieldResponse(field.id);

    const fieldInput = (() => {

    switch (field.field_type) {
      case 'yesno':
      case 'yes_no':
        return (
          <div className="space-y-3 w-full">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive font-medium' : 'font-medium'}>
              {field.name} {field.is_required && '*'}
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant={value === 'yes' ? 'default' : 'outline'}
                className={`h-14 sm:h-16 text-lg font-semibold transition-all ${
                  value === 'yes' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-md' 
                    : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                }`}
                onClick={() => {
                  handleFieldChange(field.id, 'yes');
                  if (hasError) {
                    setFieldErrors(prev => {
                      const next = { ...prev };
                      delete next[field.id];
                      return next;
                    });
                  }
                }}
              >
                <Check className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                YES
              </Button>
              <Button
                type="button"
                variant={value === 'no' ? 'default' : 'outline'}
                className={`h-14 sm:h-16 text-lg font-semibold transition-all ${
                  value === 'no' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md' 
                    : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                }`}
                onClick={() => {
                  handleFieldChange(field.id, 'no');
                  if (hasError) {
                    setFieldErrors(prev => {
                      const next = { ...prev };
                      delete next[field.id];
                      return next;
                    });
                  }
                }}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                NO
              </Button>
            </div>
            {hasError && <p className="text-sm text-destructive font-medium mt-1">{hasError}</p>}
          </div>
        );
        
      case 'rating':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive' : ''}>
              {field.name} {field.is_required && '*'}
            </Label>
            <RadioGroup
              value={value.toString()}
              onValueChange={(val) => {
                handleFieldChange(field.id, parseInt(val));
                // Clear error when field is updated
                if (hasError) {
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              className={`flex gap-4 ${hasError ? 'border-destructive' : ''}`}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`${field.id}-${rating}`} />
                  <Label htmlFor={`${field.id}-${rating}`}>{rating}</Label>
                </div>
              ))}
            </RadioGroup>
            {hasError && <p className="text-sm text-destructive">{hasError}</p>}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive' : ''}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => {
                handleFieldChange(field.id, e.target.value);
                if (hasError) {
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{hasError}</p>}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive' : ''}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => {
                handleFieldChange(field.id, parseFloat(e.target.value));
                if (hasError) {
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{hasError}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive' : ''}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => {
                handleFieldChange(field.id, e.target.value);
                if (hasError) {
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              required={field.is_required}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{hasError}</p>}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className={hasError ? 'text-destructive' : ''}>
              {field.name} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => {
                handleFieldChange(field.id, e.target.value);
                if (hasError) {
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              required={field.is_required}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{hasError}</p>}
          </div>
        );
    }
    })();

    return (
      <div className="space-y-4">
        {fieldInput}
        {currentDraftId && (
          <FieldResponseInput
            auditId={currentDraftId}
            fieldId={field.id}
            sectionId={sectionId}
            fieldResponse={fieldResponse}
            onObservationChange={(observations) => {
              saveFieldResponse.mutate({
                auditId: currentDraftId,
                fieldId: field.id,
                sectionId,
                responseValue: formData.customData[field.id] || null,
                observations,
              });
            }}
          />
        )}
      </div>
    );
  };

  const createInitialDraft = async () => {
    if (!user || !selectedTemplateId) return;

    try {
      // First, delete all existing drafts for this user to keep only the latest
      await supabase
        .from('location_audits')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'draft');

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('location_audits')
        .insert({
          template_id: selectedTemplateId,
          location: formData.location_id || '',
          location_id: formData.location_id || null,
          audit_date: formData.auditDate,
          time_start: formData.timeStart || null,
          time_end: formData.timeEnd || null,
          notes: formData.notes || null,
          status: 'draft',
          user_id: user.id,
          company_id: companyUser?.company_id || null,
          custom_data: formData.customData,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentDraftId(data.id);
    } catch (error) {
      console.error('Error creating initial draft:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      toast.error('You must be logged in to save a draft');
      return;
    }

    if (!selectedTemplateId) {
      toast.error('Please select a template before saving a draft');
      return;
    }

    if (!formData.location_id) {
      toast.error('Please select a location before saving a draft');
      return;
    }

    try {
      // Get location name if location_id is provided
      let locationName = '';
      if (formData.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', formData.location_id)
          .single();
        
        locationName = locationData?.name || 'Unknown Location';
      }

      const auditData = {
        user_id: user.id,
        location_id: formData.location_id || null,
        location: locationName,
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
        // Delete all existing drafts for this user before creating a new one
        await supabase
          .from('location_audits')
          .delete()
          .eq('user_id', user.id)
          .eq('status', 'draft');

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
    } catch (error: any) {
      console.error('Error saving draft:', error);
      
      let errorMessage = 'Failed to save draft';
      
      if (error?.message?.includes('location')) {
        errorMessage = 'Invalid location selected. Please choose a valid location.';
      } else if (error?.message?.includes('template')) {
        errorMessage = 'Invalid template. Please select a valid audit template.';
      } else if (error?.code === 'PGRST116') {
        errorMessage = 'Database error: Unable to save draft. Please try again.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const validateAuditForm = () => {
    const errors: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    // Validate basic fields
    if (!selectedTemplateId) {
      errors.push('Template is required');
      newFieldErrors.template = 'Required';
    }

    if (!formData.location_id) {
      errors.push('Location is required');
      newFieldErrors.location = 'Required';
    }

    if (!formData.auditDate) {
      errors.push('Audit date is required');
      newFieldErrors.auditDate = 'Required';
    }

    // Validate required fields in template
    if (selectedTemplate) {
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
            } else if ((field.field_type === 'yesno' || field.field_type === 'yes_no') && value !== 'yes' && value !== 'no' && value !== true && value !== false) {
              errors.push(`${field.name} must be answered with YES or NO in ${section.name}`);
              newFieldErrors[field.id] = 'Invalid answer';
            }
          }
        });
      });
    }

    setFieldErrors(newFieldErrors);
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit button clicked, starting submission...');
    
    if (!user) {
      toast.error('You must be logged in to submit an audit');
      return;
    }

    // Validate form
    const validationErrors = validateAuditForm();
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Please fix the following errors:</div>
          <ul className="list-disc pl-4 space-y-1">
            {validationErrors.slice(0, 5).map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-sm">...and {validationErrors.length - 5} more</li>
            )}
          </ul>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    console.log('Form validation passed, submitting audit...');

    try {
      // Calculate overall score from rating and yes/no fields
      let totalRatings = 0;
      let ratingCount = 0;

      if (selectedTemplate) {
        selectedTemplate.sections.forEach(section => {
          section.fields.forEach(field => {
            const value = formData.customData[field.id];
            
            // Count rating fields (1-5 scale)
            if (field.field_type === 'rating') {
              if (typeof value === 'number') {
                totalRatings += value;
                ratingCount++;
              }
            }
            
            // Count yes/no fields (yes = 5 points, no = 0 points)
            if (field.field_type === 'yesno' || field.field_type === 'yes_no') {
              if (value === 'yes' || value === true) {
                totalRatings += 5;
                ratingCount++;
              } else if (value === 'no' || value === false) {
                totalRatings += 0;
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

      // Get location name if location_id is provided
      let locationName = '';
      if (formData.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', formData.location_id)
          .single();
        
        locationName = locationData?.name || 'Unknown Location';
      }

      const auditData = {
        user_id: user.id,
        location_id: formData.location_id || null,
        location: locationName,
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
        
        // Delete any other drafts for this user since we're completing an audit
        await supabase
          .from('location_audits')
          .delete()
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .neq('id', currentDraftId);
        
        toast.success("Location audit submitted successfully!");
        navigate(`/audit-summary/${currentDraftId}`);
      } else {
        // Delete all existing drafts for this user before creating the completed audit
        await supabase
          .from('location_audits')
          .delete()
          .eq('user_id', user.id)
          .eq('status', 'draft');

        // Create new audit
        const { data: newAudit, error } = await supabase
          .from('location_audits')
          .insert(auditData)
          .select('id')
          .single();

        if (error) throw error;
        
        toast.success("Location audit submitted successfully!");
        navigate(`/audit-summary/${newAudit.id}`);
      }
    } catch (error: any) {
      console.error('Error submitting audit:', error);
      
      let errorMessage = 'Failed to submit audit';
      
      if (error?.message?.includes('location')) {
        errorMessage = 'Invalid location selected. Please choose a valid location and try again.';
      } else if (error?.message?.includes('template')) {
        errorMessage = 'Invalid template. Please select a valid audit template.';
      } else if (error?.message?.includes('user_id')) {
        errorMessage = 'Authentication error. Please log out and log back in.';
      } else if (error?.code === 'PGRST116') {
        errorMessage = 'Database error: Unable to submit audit. Please try again.';
      } else if (error?.code === '23502') {
        errorMessage = 'Missing required data. Please ensure all required fields are filled.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/template-library")}
          className="mb-4 gap-2 -ml-2"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Audits</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                Location Standard Checker
                {currentDraftId && (
                  <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-normal text-muted-foreground block sm:inline mt-1 sm:mt-0">
                    (Editing Draft)
                  </span>
                )}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">Complete the location audit form</p>
            </div>
            {selectedTemplate && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="gap-2 shrink-0"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Preview Template</span>
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card className="p-3 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold mb-2 sm:mb-4">Basic Information</h2>
            <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="template" className="text-sm">Template *</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  required
                >
                  <SelectTrigger id="template">
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
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                )}
              </div>
              
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="location" className="text-sm">Location *</Label>
                <LocationSelector
                  id="location"
                  value={formData.location_id}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  placeholder="Select location"
                  disabled={(() => {
                    // Disable if this is a scheduled audit
                    if (isScheduledAudit) return true;
                    
                    // Disable if template has a specific location
                    const template = templates.find(t => t.id === selectedTemplateId);
                    return !!template?.location_id || 
                           (template?.template_locations && template.template_locations.length === 1);
                  })()}
                />
                {(() => {
                  // Show message if location is locked due to scheduling
                  if (isScheduledAudit) {
                    return (
                      <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                        🔒 Location is locked for scheduled audits
                      </p>
                    );
                  }
                  
                  // Show message if location is locked due to template
                  const template = templates.find(t => t.id === selectedTemplateId);
                  const hasSpecificLocation = !!template?.location_id || 
                                             (template?.template_locations && template.template_locations.length === 1);
                  return hasSpecificLocation && (
                    <p className="text-xs text-muted-foreground">
                      This template is assigned to a specific location
                    </p>
                  );
                })()}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="auditDate" className="text-sm">Audit Date *</Label>
                <Input
                  id="auditDate"
                  type="date"
                  required
                  value={formData.auditDate}
                  onChange={(e) => setFormData({ ...formData, auditDate: e.target.value })}
                  className="h-9 sm:h-10 py-1 sm:py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="timeStart" className="text-sm">Start Time</Label>
                <Input
                  id="timeStart"
                  type="time"
                  value={formData.timeStart}
                  onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                  className="h-9 sm:h-10 py-1 sm:py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="timeEnd" className="text-sm">End Time</Label>
                <Input
                  id="timeEnd"
                  type="time"
                  value={formData.timeEnd}
                  onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                  className="h-9 sm:h-10 py-1 sm:py-2 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Dynamic Sections from Template */}
          {selectedTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Mobile Score Preview - Sticky at top */}
                <div className="lg:hidden sticky top-[60px] z-10">
                  <ScorePreview 
                    sections={selectedTemplate.sections}
                    customData={formData.customData}
                  />
                </div>

                {/* Mobile: Single section with swipe navigation */}
                <div className="lg:hidden">
                  {/* Section indicators */}
                  <div className="flex justify-center gap-2 mb-4">
                    {selectedTemplate.sections.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSectionIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSectionIndex 
                            ? 'w-8 bg-primary' 
                            : 'w-2 bg-muted-foreground/30'
                        }`}
                        aria-label={`Go to section ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Swipeable section container */}
                  <div {...swipeHandlers} className="touch-pan-y">
                    <Card className="p-4 sm:p-6 animate-fade-in">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg sm:text-xl font-semibold">
                          {selectedTemplate.sections[currentSectionIndex].name}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          {currentSectionIndex + 1} / {selectedTemplate.sections.length}
                        </span>
                      </div>
                      {selectedTemplate.sections[currentSectionIndex].description && (
                        <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                          {selectedTemplate.sections[currentSectionIndex].description}
                        </p>
                      )}
                      <div className="space-y-4">
                        {selectedTemplate.sections[currentSectionIndex].fields.map((field) => (
                          <div key={field.id} className="w-full">
                            {renderField(field, selectedTemplate.sections[currentSectionIndex].id)}
                          </div>
                        ))}
                        
                        {/* Follow-up Actions */}
                        {currentDraftId && (
                          <SectionFollowUpInput
                            sectionId={selectedTemplate.sections[currentSectionIndex].id}
                            followUpNeeded={getSectionResponse(selectedTemplate.sections[currentSectionIndex].id)?.follow_up_needed}
                            followUpNotes={getSectionResponse(selectedTemplate.sections[currentSectionIndex].id)?.follow_up_notes}
                            onFollowUpChange={(needed, notes) => {
                              saveSectionResponse.mutate({
                                auditId: currentDraftId,
                                sectionId: selectedTemplate.sections[currentSectionIndex].id,
                                followUpNeeded: needed,
                                followUpNotes: notes,
                              });
                            }}
                          />
                        )}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-between mt-6 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePreviousSection}
                          disabled={currentSectionIndex === 0}
                          className="gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleNextSection}
                          disabled={currentSectionIndex === selectedTemplate.sections.length - 1}
                          className="gap-2"
                        >
                          Next
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Swipe hint for first-time users */}
                  {currentSectionIndex === 0 && (
                    <div className="text-center mt-3 text-xs text-muted-foreground animate-fade-in">
                      👆 Swipe left/right to navigate sections
                    </div>
                  )}
                </div>

                {/* Desktop: All sections visible */}
                <div className="hidden lg:block space-y-6">
                  {selectedTemplate.sections.map((section) => (
                    <Card key={section.id} className="p-4 sm:p-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">{section.name}</h2>
                      {section.description && (
                        <p className="text-sm text-muted-foreground mb-3 sm:mb-4">{section.description}</p>
                      )}
                      <div className="grid gap-4 sm:gap-4 md:grid-cols-2">
                        {section.fields.map((field) => (
                          <div key={field.id} className={field.field_type === 'yesno' || field.field_type === 'yes_no' ? 'md:col-span-2' : ''}>
                            {renderField(field, section.id)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Follow-up Actions */}
                      {currentDraftId && (
                        <div className="mt-4 md:col-span-2">
                          <SectionFollowUpInput
                            sectionId={section.id}
                            followUpNeeded={getSectionResponse(section.id)?.follow_up_needed}
                            followUpNotes={getSectionResponse(section.id)?.follow_up_notes}
                            onFollowUpChange={(needed, notes) => {
                              saveSectionResponse.mutate({
                                auditId: currentDraftId,
                                sectionId: section.id,
                                followUpNeeded: needed,
                                followUpNotes: notes,
                              });
                            }}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Notes and Photos */}
                <Card className="p-4 sm:p-6">
                  <Tabs defaultValue="notes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="photos">
                        <Camera className="h-4 w-4 mr-2" />
                        Photos
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Additional Notes</h2>
                        <Textarea
                          placeholder="Add any additional observations or notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="photos" className="space-y-4 mt-4">
                      {currentDraftId ? (
                        <>
                          <AuditPhotoCapture
                            auditId={currentDraftId}
                            onPhotoUploaded={() => {
                              toast.success("Photo added to audit");
                            }}
                          />
                          <div className="mt-6">
                            <h3 className="text-base sm:text-lg font-semibold mb-4">Attached Photos</h3>
                            <PhotoGallery auditId={currentDraftId} showDeleteButton={true} />
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Save as draft first to attach photos
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>

              {/* Desktop Score Preview - Sticky sidebar */}
              <div className="hidden lg:block lg:col-span-1">
                <ScorePreview 
                  sections={selectedTemplate.sections}
                  customData={formData.customData}
                  className="sticky top-4"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-safe mb-8">
            <Button type="submit" className="gap-2 min-h-[48px] w-full sm:w-auto" disabled={!selectedTemplateId}>
              <Save className="h-4 w-4" />
              Submit Audit
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleSaveDraft}
              disabled={!selectedTemplateId}
              className="gap-2 min-h-[48px] w-full sm:w-auto"
            >
              <FileEdit className="h-4 w-4" />
              Save as Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")} className="min-h-[48px] w-full sm:w-auto">
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
    </div>
  );
};

export default LocationAudit;
