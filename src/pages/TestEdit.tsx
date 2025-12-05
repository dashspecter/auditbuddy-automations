import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, ArrowLeft, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string;
  display_order: number;
}

const TestEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeLimit: "30",
    passingScore: "70",
    scheduledFor: "",
    expiresAt: "",
    isActive: true,
    isTemplate: false,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadTest();
    }
  }, [id]);

  const loadTest = async () => {
    try {
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

      if (testError) throw testError;

      const { data: questionsData, error: questionsError } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", id)
        .order("display_order");

      if (questionsError) throw questionsError;

      setFormData({
        title: test.title,
        description: test.description || "",
        timeLimit: String(test.time_limit_minutes),
        passingScore: String(test.passing_score),
        scheduledFor: test.scheduled_for ? test.scheduled_for.slice(0, 16) : "",
        expiresAt: test.expires_at ? test.expires_at.slice(0, 16) : "",
        isActive: test.is_active,
        isTemplate: test.is_template || false,
      });

      setQuestions(
        questionsData.map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          display_order: q.display_order,
        }))
      );
    } catch (error) {
      console.error("Error loading test:", error);
      toast.error("Failed to load test");
      navigate("/test-management");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correct_answer: "A",
        display_order: questions.length,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    const question = questions[index];
    if (question.id) {
      setDeletedQuestionIds([...deletedQuestionIds, question.id]);
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a test title");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    const invalid = questions.some(
      (q) => !q.question.trim() || q.options.some((opt) => !opt.trim())
    );
    if (invalid) {
      toast.error("Please fill all question fields and options");
      return;
    }

    setSaving(true);

    try {
      // Update test
      const { error: testError } = await supabase
        .from("tests")
        .update({
          title: formData.title,
          description: formData.description || null,
          time_limit_minutes: parseInt(formData.timeLimit),
          passing_score: parseInt(formData.passingScore),
          scheduled_for: formData.scheduledFor || null,
          expires_at: formData.expiresAt || null,
          is_active: formData.isActive,
          is_template: formData.isTemplate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (testError) throw testError;

      // Delete removed questions
      if (deletedQuestionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("test_questions")
          .delete()
          .in("id", deletedQuestionIds);

        if (deleteError) throw deleteError;
      }

      // Upsert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.id) {
          // Update existing question
          const { error } = await supabase
            .from("test_questions")
            .update({
              question: q.question,
              options: q.options,
              correct_answer: q.correct_answer,
              display_order: i,
            })
            .eq("id", q.id);
          if (error) throw error;
        } else {
          // Insert new question
          const { error } = await supabase.from("test_questions").insert({
            test_id: id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            display_order: i,
          });
          if (error) throw error;
        }
      }

      toast.success("Test updated successfully!");
      navigate("/test-management");
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error("Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      // Create new test from this one
      const { data: newTest, error: testError } = await supabase
        .from("tests")
        .insert({
          title: `${formData.title} (Copy)`,
          description: formData.description || null,
          time_limit_minutes: parseInt(formData.timeLimit),
          passing_score: parseInt(formData.passingScore),
          scheduled_for: null,
          expires_at: null,
          is_active: false,
          is_template: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Copy questions
      const questionInserts = questions.map((q, index) => ({
        test_id: newTest.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        display_order: index,
      }));

      const { error: questionsError } = await supabase
        .from("test_questions")
        .insert(questionInserts);

      if (questionsError) throw questionsError;

      toast.success("Test duplicated successfully!");
      navigate(`/test-edit/${newTest.id}`);
    } catch (error) {
      console.error("Error duplicating test:", error);
      toast.error("Failed to duplicate test");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/test-management")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Test</h1>
            <p className="text-muted-foreground">Modify test details and questions</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDuplicate} disabled={saving}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>Test Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Safety Training Quiz"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                min="5"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
              />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Schedule For (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              />
            </div>
            <div>
              <Label>Expires At (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isTemplate}
                onCheckedChange={(checked) => setFormData({ ...formData, isTemplate: checked })}
              />
              <Label>Save as Template</Label>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
          <Button onClick={addQuestion} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={q.id || qIndex} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label>Question {qIndex + 1} *</Label>
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                    placeholder="Enter your question"
                    rows={2}
                  />
                </div>
                {questions.length > 1 && (
                  <Button onClick={() => removeQuestion(qIndex)} variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Options *</Label>
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-6">
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label>Correct Answer</Label>
                <select
                  value={q.correct_answer}
                  onChange={(e) => updateQuestion(qIndex, "correct_answer", e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default TestEdit;