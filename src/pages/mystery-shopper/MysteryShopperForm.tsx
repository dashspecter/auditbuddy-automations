import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useNavigate } from "react-router-dom";
import { useMysteryShopperTemplateByToken, useMysteryShopperQuestions, MysteryShopperQuestion } from "@/hooks/useMysteryShopperTemplates";
import { useCreateMysteryShopperSubmission } from "@/hooks/useMysteryShopperSubmissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Star, AlertCircle, Upload, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { optimizeImage } from "@/lib/fileOptimization";

const RatingInput = ({ 
  question, 
  value, 
  onChange 
}: { 
  question: MysteryShopperQuestion; 
  value: number | undefined; 
  onChange: (val: number) => void;
}) => {
  const scale = question.rating_scale || { min: 1, max: 5 };
  const ratings = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
  
  return (
    <div className="flex gap-2 justify-center">
      {ratings.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`p-2 rounded-lg border-2 transition-all ${
            value === rating 
              ? 'border-primary bg-primary text-primary-foreground' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <Star className={`h-6 w-6 ${value === rating ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{rating}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

const PhotoInput = ({
  questionId,
  value,
  onChange,
  error,
}: {
  questionId: string;
  value: string | undefined;
  onChange: (val: string) => void;
  error?: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      // Compress image to fit within storage bucket limit (2MB)
      // This handles large photos from modern phone cameras
      const optimized = await optimizeImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeBytes: 10 * 1024 * 1024, // Allow larger input, we'll compress it
      });

      // Create a File object from the compressed blob
      const compressedFile = new File([optimized.blob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const fileName = `mystery-shopper-photos/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {value ? (
        <div className="relative inline-block">
          <img 
            src={value} 
            alt="Uploaded photo" 
            className="max-h-48 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={removePhoto}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-full h-24 border-dashed ${error ? 'border-destructive' : ''}`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6" />
              <span>Tap to take or upload photo</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
};

export default function MysteryShopperForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading: templateLoading, error: templateError } = useMysteryShopperTemplateByToken(token);
  const { data: questions, isLoading: questionsLoading } = useMysteryShopperQuestions(template?.id);
  const createSubmission = useCreateMysteryShopperSubmission();
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const calculateScore = () => {
    if (!questions) return null;
    
    const ratingQuestions = questions.filter(q => q.question_type === 'rating');
    if (ratingQuestions.length === 0) return null;
    
    let total = 0;
    let count = 0;
    
    ratingQuestions.forEach(q => {
      const answer = answers[q.id];
      if (typeof answer === 'number') {
        const scale = q.rating_scale || { min: 1, max: 5 };
        // Normalize to 0-100 scale
        const normalized = ((answer - scale.min) / (scale.max - scale.min)) * 100;
        total += normalized;
        count++;
      }
    });
    
    return count > 0 ? Math.round(total / count) : null;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) {
      newErrors.customerName = "Name is required";
    }
    
    if (template?.require_contact && !customerEmail && !customerPhone) {
      newErrors.contact = "Please provide either email or phone";
    }
    
    questions?.forEach(q => {
      if (q.is_required && !answers[q.id]) {
        newErrors[q.id] = "This question is required";
      }
    });

    if (!gdprConsent) {
      newErrors.gdprConsent = "You must agree to the data processing policy";
    }
    if (!marketingConsent) {
      newErrors.marketingConsent = "You must agree to receive marketing communications";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !template) return;
    
    const overallScore = calculateScore();
    
    try {
      const result = await createSubmission.mutateAsync({
        template_id: template.id,
        company_id: template.company_id,
        location_id: template.default_location_ids?.[0] || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        raw_answers: { ...answers, gdpr_consent: true, marketing_consent: true },
        overall_score: overallScore,
      });
      
      // Navigate to voucher page
      navigate(`/voucher/${result.voucher.code}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (templateLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Survey Not Available</h2>
            <p className="text-muted-foreground">
              This survey is no longer active or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            {template.brand_logo_url && (
              <img 
                src={template.brand_logo_url} 
                alt="Brand logo" 
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            )}
            <CardTitle className="text-2xl">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="text-base mt-2">
                {template.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="space-y-4 pb-6 border-b">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    className={errors.customerName ? "border-destructive" : ""}
                  />
                  {errors.customerName && (
                    <p className="text-sm text-destructive mt-1">{errors.customerName}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerEmail">
                      Email {template.require_contact ? "*" : "(optional)"}
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">
                      Phone {template.require_contact ? "*" : "(optional)"}
                    </Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+40..."
                    />
                  </div>
                </div>
                {errors.contact && (
                  <p className="text-sm text-destructive">{errors.contact}</p>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {questions?.map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <Label className="text-base">
                      {index + 1}. {question.question_text}
                      {question.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    
                    {question.question_type === 'multiple_choice' && (
                      <RadioGroup
                        value={answers[question.id] || ""}
                        onValueChange={(val) => handleAnswerChange(question.id, val)}
                      >
                        {(question.options as string[])?.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                            <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {question.question_type === 'rating' && (
                      <RatingInput
                        question={question}
                        value={answers[question.id]}
                        onChange={(val) => handleAnswerChange(question.id, val)}
                      />
                    )}
                    
                    {question.question_type === 'text' && (
                      <Textarea
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Your answer..."
                        rows={3}
                      />
                    )}
                    
                    {question.question_type === 'photo' && (
                      <PhotoInput
                        questionId={question.id}
                        value={answers[question.id]}
                        onChange={(val) => handleAnswerChange(question.id, val)}
                        error={errors[question.id]}
                      />
                    )}
                    
                    {errors[question.id] && (
                      <p className="text-sm text-destructive">{errors[question.id]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="gdprConsent"
                    checked={gdprConsent}
                    onCheckedChange={(checked) => {
                      setGdprConsent(checked === true);
                      if (errors.gdprConsent) {
                        setErrors(prev => { const n = { ...prev }; delete n.gdprConsent; return n; });
                      }
                    }}
                    className={errors.gdprConsent ? "border-destructive" : ""}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="gdprConsent" className="font-normal cursor-pointer leading-snug">
                      I agree that my personal data will be processed in accordance with the Privacy Policy. <span className="text-destructive">*</span>
                    </Label>
                    {errors.gdprConsent && (
                      <p className="text-sm text-destructive">{errors.gdprConsent}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="marketingConsent"
                    checked={marketingConsent}
                    onCheckedChange={(checked) => {
                      setMarketingConsent(checked === true);
                      if (errors.marketingConsent) {
                        setErrors(prev => { const n = { ...prev }; delete n.marketingConsent; return n; });
                      }
                    }}
                    className={errors.marketingConsent ? "border-destructive" : ""}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="marketingConsent" className="font-normal cursor-pointer leading-snug">
                      I agree to receive marketing communications (promotions, offers, news) via email or SMS. <span className="text-destructive">*</span>
                    </Label>
                    {errors.marketingConsent && (
                      <p className="text-sm text-destructive">{errors.marketingConsent}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={createSubmission.isPending}
              >
                {createSubmission.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit & Get Your Voucher"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
