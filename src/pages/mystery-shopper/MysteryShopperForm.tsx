import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMysteryShopperTemplateByToken, useMysteryShopperQuestions, MysteryShopperQuestion } from "@/hooks/useMysteryShopperTemplates";
import { useCreateMysteryShopperSubmission } from "@/hooks/useMysteryShopperSubmissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Star, AlertCircle } from "lucide-react";

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
        raw_answers: answers,
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
                    
                    {errors[question.id] && (
                      <p className="text-sm text-destructive">{errors[question.id]}</p>
                    )}
                  </div>
                ))}
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
