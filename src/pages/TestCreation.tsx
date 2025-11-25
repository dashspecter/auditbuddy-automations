import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TestCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    documentId: "",
    timeLimit: "30",
    passingScore: "70",
    numQuestions: "10",
    scheduledFor: "",
    expiresAt: "",
  });
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select(`
        *,
        category:document_categories(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
      return;
    }

    setDocuments(data || []);
  };

  const handleGenerateQuestions = async () => {
    if (!formData.documentId) {
      toast.error("Please select a document");
      return;
    }

    setGenerating(true);

    try {
      // Get the document
      const document = documents.find((d) => d.id === formData.documentId);
      if (!document) throw new Error("Document not found");

      // Parse document content
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        "parse-document",
        {
          body: { fileUrl: document.file_url },
        }
      );

      if (parseError) throw parseError;

      // Generate questions
      const { data: questionsData, error: questionsError } = await supabase.functions.invoke(
        "generate-test-questions",
        {
          body: {
            documentContent: parseData.text,
            numQuestions: parseInt(formData.numQuestions),
          },
        }
      );

      if (questionsError) throw questionsError;

      setQuestions(questionsData.questions);
      toast.success(`Generated ${questionsData.questions.length} questions`);
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions. Make sure the document is text-based.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTest = async () => {
    if (!formData.title || !formData.documentId || questions.length === 0) {
      toast.error("Please fill all required fields and generate questions");
      return;
    }

    try {
      // Create test
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          title: formData.title,
          description: formData.description,
          document_id: formData.documentId,
          time_limit_minutes: parseInt(formData.timeLimit),
          passing_score: parseInt(formData.passingScore),
          scheduled_for: formData.scheduledFor || null,
          expires_at: formData.expiresAt || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create questions
      const questionInserts = questions.map((q, index) => ({
        test_id: testData.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        display_order: index,
      }));

      const { error: questionsError } = await supabase
        .from("test_questions")
        .insert(questionInserts);

      if (questionsError) throw questionsError;

      toast.success("Test created successfully!");
      navigate("/test-management");
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error("Failed to save test");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-safe max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Create Test</h1>
            <p className="text-muted-foreground">Generate AI-powered tests from documents</p>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Test Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Safety Training Quiz"
                  />
                </div>
                <div>
                  <Label>Document *</Label>
                  <Select
                    value={formData.documentId}
                    onValueChange={(value) => setFormData({ ...formData, documentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title} ({doc.category?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    value={formData.numQuestions}
                    onChange={(e) => setFormData({ ...formData, numQuestions: e.target.value })}
                  />
                </div>
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

              <Button
                onClick={handleGenerateQuestions}
                disabled={generating || !formData.documentId}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Questions with AI
                  </>
                )}
              </Button>
            </div>
          </Card>

          {questions.length > 0 && (
            <>
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Generated Questions ({questions.length})
                </h2>
                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <div className="space-y-1 text-sm">
                        {q.options.map((opt: string, optIndex: number) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              String.fromCharCode(65 + optIndex) === q.correct_answer
                                ? "bg-green-100 dark:bg-green-900/20 font-medium"
                                : "bg-muted/50"
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Button onClick={handleSaveTest} size="lg" className="w-full">
                <Save className="mr-2 h-5 w-5" />
                Save Test
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestCreation;
