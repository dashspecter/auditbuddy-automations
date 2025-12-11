import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  useMysteryShopperTemplate, 
  useMysteryShopperQuestions,
  useCreateMysteryShopperTemplate,
  useUpdateMysteryShopperTemplate,
  useCreateMysteryShopperQuestion,
  useUpdateMysteryShopperQuestion,
  useDeleteMysteryShopperQuestion,
  MysteryShopperQuestion
} from "@/hooks/useMysteryShopperTemplates";
import { useLocations } from "@/hooks/useLocations";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface QuestionFormData {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'rating' | 'text';
  options: string[];
  rating_scale: { min: number; max: number };
  is_required: boolean;
  order_index: number;
}

const defaultQuestion: QuestionFormData = {
  question_text: "",
  question_type: "rating",
  options: ["Option A", "Option B", "Option C", "Option D"],
  rating_scale: { min: 1, max: 5 },
  is_required: true,
  order_index: 0,
};

export default function MysteryShopperTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditing = templateId && templateId !== "new";
  
  const { data: existingTemplate, isLoading: templateLoading } = useMysteryShopperTemplate(isEditing ? templateId : undefined);
  const { data: existingQuestions, isLoading: questionsLoading } = useMysteryShopperQuestions(isEditing ? templateId : undefined);
  const { data: locations } = useLocations();
  const { data: companyData } = useCompany();
  
  const createTemplate = useCreateMysteryShopperTemplate();
  const updateTemplate = useUpdateMysteryShopperTemplate();
  const createQuestion = useCreateMysteryShopperQuestion();
  const updateQuestion = useUpdateMysteryShopperQuestion();
  const deleteQuestion = useDeleteMysteryShopperQuestion();

  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    default_location_ids: [] as string[],
    voucher_value: 25,
    voucher_currency: "RON",
    voucher_expiry_days: 30,
    voucher_terms_text: "Valid for one use only. Cannot be combined with other offers.",
    brand_logo_url: "",
    is_active: true,
    require_contact: false,
  });

  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `brand-logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      setTemplateData(prev => ({ ...prev, brand_logo_url: publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    setTemplateData(prev => ({ ...prev, brand_logo_url: "" }));
  };

  useEffect(() => {
    if (existingTemplate) {
      setTemplateData({
        name: existingTemplate.name,
        description: existingTemplate.description || "",
        default_location_ids: existingTemplate.default_location_ids || [],
        voucher_value: existingTemplate.voucher_value,
        voucher_currency: existingTemplate.voucher_currency,
        voucher_expiry_days: existingTemplate.voucher_expiry_days,
        voucher_terms_text: existingTemplate.voucher_terms_text || "",
        brand_logo_url: existingTemplate.brand_logo_url || "",
        is_active: existingTemplate.is_active,
        require_contact: existingTemplate.require_contact,
      });
    }
  }, [existingTemplate]);

  useEffect(() => {
    if (existingQuestions) {
      setQuestions(existingQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options as string[],
        rating_scale: q.rating_scale as { min: number; max: number },
        is_required: q.is_required,
        order_index: q.order_index,
      })));
    }
  }, [existingQuestions]);

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { ...defaultQuestion, order_index: prev.length }
    ]);
  };

  const removeQuestion = (index: number) => {
    const question = questions[index];
    if (question.id && isEditing) {
      deleteQuestion.mutate({ id: question.id, templateId: templateId! });
    }
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestionData = (index: number, field: keyof QuestionFormData, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const newOptions = [...q.options];
      newOptions[optionIndex] = value;
      return { ...q, options: newOptions };
    }));
  };

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    
    if (questions.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    if (!companyData?.id) {
      toast.error("Company not found");
      return;
    }

    setSaving(true);
    try {
      let savedTemplateId = templateId;
      
      if (isEditing) {
        await updateTemplate.mutateAsync({
          id: templateId!,
          ...templateData,
        });
      } else {
        const result = await createTemplate.mutateAsync({
          company_id: companyData.id,
          ...templateData,
        });
        savedTemplateId = result.id;
      }

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionData = {
          template_id: savedTemplateId!,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          rating_scale: q.rating_scale,
          is_required: q.is_required,
          order_index: i,
        };

        if (q.id) {
          await updateQuestion.mutateAsync({ id: q.id, ...questionData });
        } else {
          await createQuestion.mutateAsync(questionData);
        }
      }

      toast.success("Template saved successfully");
      navigate("/audits/mystery-shopper");
    } catch (error) {
      // Error handled by hooks
    } finally {
      setSaving(false);
    }
  };

  if (templateLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/audits/mystery-shopper")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {isEditing ? "Edit Template" : "New Mystery Shopper Template"}
          </h2>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Template
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>Basic details about the mystery shopper survey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., January Delivery Survey"
              />
            </div>
            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <div className="flex items-center gap-4">
                {templateData.brand_logo_url ? (
                  <div className="relative">
                    <img
                      src={templateData.brand_logo_url}
                      alt="Brand logo"
                      className="h-16 w-16 object-contain rounded-lg border bg-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {templateData.brand_logo_url ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief intro shown on the survey page..."
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={templateData.is_active}
                onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="requireContact"
                checked={templateData.require_contact}
                onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, require_contact: checked }))}
              />
              <Label htmlFor="requireContact">Require contact info</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Voucher Settings</CardTitle>
          <CardDescription>Configure the reward voucher given to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voucherValue">Voucher Value</Label>
              <Input
                id="voucherValue"
                type="number"
                value={templateData.voucher_value}
                onChange={(e) => setTemplateData(prev => ({ ...prev, voucher_value: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucherCurrency">Currency</Label>
              <Select
                value={templateData.voucher_currency}
                onValueChange={(value) => setTemplateData(prev => ({ ...prev, voucher_currency: value }))}
              >
                <SelectTrigger id="voucherCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RON">RON</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDays">Valid for (days)</Label>
              <Input
                id="expiryDays"
                type="number"
                value={templateData.voucher_expiry_days}
                onChange={(e) => setTemplateData(prev => ({ ...prev, voucher_expiry_days: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="termsText">Terms & Conditions</Label>
            <Textarea
              id="termsText"
              value={templateData.voucher_terms_text}
              onChange={(e) => setTemplateData(prev => ({ ...prev, voucher_terms_text: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>Add questions for the mystery shopper survey</CardDescription>
            </div>
            <Button onClick={addQuestion} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No questions added yet.</p>
              <Button onClick={addQuestion} variant="outline" className="mt-2">
                Add Your First Question
              </Button>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-2 text-muted-foreground cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      <Select
                        value={question.question_type}
                        onValueChange={(value: 'multiple_choice' | 'rating' | 'text') => 
                          updateQuestionData(index, 'question_type', value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">Rating (1-5)</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="text">Text Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 ml-auto">
                        <Switch
                          checked={question.is_required}
                          onCheckedChange={(checked) => updateQuestionData(index, 'is_required', checked)}
                        />
                        <Label className="text-sm">Required</Label>
                      </div>
                    </div>
                    
                    <Input
                      value={question.question_text}
                      onChange={(e) => updateQuestionData(index, 'question_text', e.target.value)}
                      placeholder="Enter your question..."
                    />

                    {question.question_type === 'multiple_choice' && (
                      <div className="space-y-2 pl-4">
                        {question.options.map((option, optIndex) => (
                          <Input
                            key={optIndex}
                            value={option}
                            onChange={(e) => updateOption(index, optIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          />
                        ))}
                      </div>
                    )}

                    {question.question_type === 'rating' && (
                      <div className="flex items-center gap-4 pl-4 text-sm text-muted-foreground">
                        <span>Scale: {question.rating_scale.min} to {question.rating_scale.max}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
