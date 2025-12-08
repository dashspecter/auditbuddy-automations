import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, BookOpen, Package, Wrench, 
  GraduationCap, Plus, Trash2, Save, Eye, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  useMarketplaceCategories, 
  useCreateMarketplaceTemplate,
  usePublishMarketplaceTemplate 
} from "@/hooks/useMarketplace";
import { useIndustries } from "@/hooks/useIndustries";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";

const templateTypes = [
  { id: 'audit', label: 'Audit Template', icon: BookOpen, description: 'Checklists for location or staff audits' },
  { id: 'sop', label: 'SOP Checklist', icon: Package, description: 'Standard operating procedures' },
  { id: 'maintenance', label: 'Maintenance Flow', icon: Wrench, description: 'Equipment maintenance workflows' },
  { id: 'training', label: 'Training Program', icon: GraduationCap, description: 'Staff training task lists' },
];

interface TemplateSection {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
}

interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'checkbox' | 'rating' | 'photo' | 'select';
  required: boolean;
  options?: string[];
}

export default function MarketplacePublish() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyQuery = useCompany();
  const company = companyQuery.data;
  const { data: categories } = useMarketplaceCategories();
  const { data: industries } = useIndustries();
  const createTemplate = useCreateMarketplaceTemplate();
  const publishTemplate = usePublishMarketplaceTemplate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template_type: "" as 'audit' | 'sop' | 'maintenance' | 'training' | '',
    category_id: "" as string,
    industry_id: "" as string,
    author_name: user?.email?.split("@")[0] || "Anonymous",
    author_company_name: company?.name || "",
  });
  
  const [sections, setSections] = useState<TemplateSection[]>([
    {
      id: crypto.randomUUID(),
      name: "Section 1",
      description: "",
      fields: [
        { id: crypto.randomUUID(), name: "Item 1", type: "checkbox", required: true }
      ]
    }
  ]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: crypto.randomUUID(),
        name: `Section ${sections.length + 1}`,
        description: "",
        fields: []
      }
    ]);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error("Template must have at least one section");
      return;
    }
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const addField = (sectionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: [
            ...s.fields,
            { 
              id: crypto.randomUUID(), 
              name: `Item ${s.fields.length + 1}`, 
              type: "checkbox" as const, 
              required: false 
            }
          ]
        };
      }
      return s;
    }));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.filter(f => f.id !== fieldId)
        };
      }
      return s;
    }));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => 
            f.id === fieldId ? { ...f, ...updates } : f
          )
        };
      }
      return s;
    }));
  };

  const handleSaveDraft = async () => {
    if (!formData.title || !formData.template_type) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        ...formData,
        content: { sections },
        is_published: false,
      });
      navigate("/marketplace/my-templates");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.template_type || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (sections.some(s => s.fields.length === 0)) {
      toast.error("All sections must have at least one field");
      return;
    }

    try {
      const result = await createTemplate.mutateAsync({
        ...formData,
        content: { sections },
        is_published: false,
      });
      
      await publishTemplate.mutateAsync(result.id);
      navigate("/marketplace/my-templates");
    } catch (error) {
      // Error handled by hook
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose Template Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.template_type === type.id;
            
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setFormData({ ...formData, template_type: type.id })}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => setStep(2)} 
          disabled={!formData.template_type}
        >
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Template Details</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Template Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Restaurant Opening Checklist"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this template is for and who should use it..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select 
                value={formData.industry_id} 
                onValueChange={(v) => setFormData({ ...formData, industry_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries?.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="author_name">Your Name</Label>
              <Input
                id="author_name"
                value={formData.author_name}
                onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="author_company_name">Company Name (optional)</Label>
              <Input
                id="author_company_name"
                value={formData.author_company_name}
                onChange={(e) => setFormData({ ...formData, author_company_name: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button 
          onClick={() => setStep(3)} 
          disabled={!formData.title || !formData.description}
        >
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Build Your Template</h2>
        <Button variant="outline" onClick={addSection}>
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
      </div>

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Input
                    value={section.name}
                    onChange={(e) => updateSection(section.id, { name: e.target.value })}
                    placeholder="Section name"
                    className="font-semibold"
                  />
                  <Input
                    value={section.description}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                    placeholder="Section description (optional)"
                    className="text-sm"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeSection(section.id)}
                  disabled={sections.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.fields.map((field, fieldIndex) => (
                <div 
                  key={field.id} 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm text-muted-foreground w-8">
                    {fieldIndex + 1}.
                  </span>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(section.id, field.id, { name: e.target.value })}
                    placeholder="Item name"
                    className="flex-1"
                  />
                  <Select 
                    value={field.type}
                    onValueChange={(v) => updateField(section.id, field.id, { type: v as any })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={field.required ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField(section.id, field.id, { required: !field.required })}
                  >
                    {field.required ? "Required" : "Optional"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeField(section.id, field.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => addField(section.id)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={createTemplate.isPending}
          >
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={createTemplate.isPending || publishTemplate.isPending}
          >
            <Upload className="h-4 w-4 mr-2" /> 
            {publishTemplate.isPending ? "Publishing..." : "Publish to Marketplace"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/marketplace")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
          <h1 className="text-3xl font-bold mt-4">Publish a Template</h1>
          <p className="text-muted-foreground mt-2">
            Share your expertise with the community
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div 
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s <= step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
