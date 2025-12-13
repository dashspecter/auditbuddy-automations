import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";

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

interface ManagerLocation {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

const StaffStaffAudit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [managerLocations, setManagerLocations] = useState<ManagerLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [formData, setFormData] = useState({
    location_id: "",
    employee_id: "",
    template_id: "",
    auditDate: new Date().toISOString().split('T')[0],
    notes: "",
    customData: {} as Record<string, any>,
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

        // Load staff audit templates
        const { data: templatesData } = await supabase
          .from("audit_templates")
          .select("id, name, description, template_type")
          .eq("company_id", empData.company_id)
          .eq("is_active", true)
          .eq("template_type", "staff");

        if (templatesData) {
          setTemplates(templatesData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, navigate]);

  // Load employees when location changes
  useEffect(() => {
    const loadEmployees = async () => {
      if (!formData.location_id) {
        setEmployees([]);
        return;
      }

      const { data } = await supabase
        .from("employees")
        .select("id, full_name, role")
        .eq("location_id", formData.location_id)
        .eq("status", "active")
        .order("full_name");

      setEmployees(data || []);
    };

    loadEmployees();
  }, [formData.location_id]);

  // Load template details when selected
  useEffect(() => {
    const loadTemplateDetails = async () => {
      if (!formData.template_id) {
        setSelectedTemplate(null);
        return;
      }

      const { data: templateData } = await supabase
        .from("audit_templates")
        .select("id, name, description")
        .eq("id", formData.template_id)
        .single();

      if (!templateData) return;

      const { data: sectionsData } = await supabase
        .from("audit_sections")
        .select("id, name, description")
        .eq("template_id", formData.template_id)
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
  }, [formData.template_id]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customData: {
        ...prev.customData,
        [fieldId]: value,
      },
    }));
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
        } else if (field.field_type === "yes_no") {
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

  const handleSubmit = async () => {
    if (!user || !formData.employee_id || !formData.location_id) {
      toast.error("Please select an employee and location");
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

      const { error } = await supabase
        .from("staff_audits")
        .insert([{
          employee_id: formData.employee_id,
          location_id: formData.location_id,
          company_id: empData.company_id,
          auditor_id: user.id,
          audit_date: formData.auditDate,
          score: percentScore,
          notes: formData.notes || null,
          template_id: formData.template_id || null,
          custom_data: formData.customData,
        }]);

      if (error) throw error;

      toast.success("Staff audit submitted successfully!");
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
            onClick={() => navigate("/staff/employee-audit")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Staff Audit</h1>
            <p className="text-sm opacity-80">Evaluate employee performance</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Information */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Location *</Label>
              <Select 
                value={formData.location_id} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, location_id: value, employee_id: "" }));
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
              <Label>Employee *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templates.length > 0 && (
              <div>
                <Label>Template (Optional)</Label>
                <Select 
                  value={formData.template_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
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
            )}

            <div>
              <Label>Audit Date *</Label>
              <Input
                type="date"
                value={formData.auditDate}
                onChange={(e) => setFormData(prev => ({ ...prev, auditDate: e.target.value }))}
              />
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
                  <div key={field.id} className="space-y-2">
                    <Label className={field.is_required ? "after:content-['*'] after:text-destructive after:ml-1" : ""}>
                      {field.name}
                    </Label>
                    
                    {field.field_type === "text" && (
                      <Input
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter text..."
                      />
                    )}

                    {field.field_type === "number" && (
                      <Input
                        type="number"
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter number..."
                      />
                    )}

                    {field.field_type === "rating" && (
                      <div className="flex gap-2">
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

                    {field.field_type === "yes_no" && (
                      <div className="flex gap-2">
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

                    {field.field_type === "textarea" && (
                      <Textarea
                        value={formData.customData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter details..."
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Notes */}
        <Card className="p-4">
          <Label>Notes & Observations</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add notes about the employee's performance..."
            rows={4}
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

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !formData.employee_id || !formData.location_id}
          className="w-full"
          size="lg"
        >
          {submitting ? "Submitting..." : "Submit Staff Audit"}
        </Button>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffStaffAudit;
