import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, Plus, Trash2, PencilLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/useLocations";

const DRAFT_STORAGE_KEY = "test_creation_draft";

const getInitialFormData = () => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.formData || {
        title: "",
        description: "",
        documentId: "",
        locationId: "",
        timeLimit: "30",
        passingScore: "70",
        numQuestions: "10",
        scheduledFor: "",
        expiresAt: "",
      };
    }
  } catch (e) {
    console.error("Error loading draft:", e);
  }
  return {
    title: "",
    description: "",
    documentId: "",
    locationId: "",
    timeLimit: "30",
    passingScore: "70",
    numQuestions: "10",
    scheduledFor: "",
    expiresAt: "",
  };
};

const getInitialManualQuestions = () => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.manualQuestions && parsed.manualQuestions.length > 0) {
        return parsed.manualQuestions;
      }
    }
  } catch (e) {
    console.error("Error loading draft questions:", e);
  }
  return [{ question: "", options: ["", "", "", ""], correct_answer: "A" }];
};

const getInitialTab = () => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.activeTab || "ai";
    }
  } catch (e) {
    console.error("Error loading draft tab:", e);
  }
  return "ai";
};

const TestCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const [documents, setDocuments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData);
  const [questions, setQuestions] = useState<any[]>([]);
  const [manualQuestions, setManualQuestions] = useState<any[]>(getInitialManualQuestions);
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    const draft = { formData, manualQuestions, activeTab };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [formData, manualQuestions, activeTab]);

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

  const addManualQuestion = () => {
    setManualQuestions([
      ...manualQuestions,
      { question: "", options: ["", "", "", ""], correct_answer: "A" }
    ]);
  };

  const removeManualQuestion = (index: number) => {
    setManualQuestions(manualQuestions.filter((_, i) => i !== index));
  };

  const updateManualQuestion = (index: number, field: string, value: any) => {
    const updated = [...manualQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setManualQuestions(updated);
  };

  const updateManualOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...manualQuestions];
    updated[qIndex].options[optIndex] = value;
    setManualQuestions(updated);
  };

  const handleSaveTest = async (isManual: boolean) => {
    const questionsToSave = isManual ? manualQuestions : questions;
    
    if (!formData.title || questionsToSave.length === 0) {
      toast.error("Please fill all required fields and add questions");
      return;
    }

    // Validate manual questions
    if (isManual) {
      const invalid = manualQuestions.some(q => 
        !q.question.trim() || q.options.some((opt: string) => !opt.trim())
      );
      if (invalid) {
        toast.error("Please fill all question fields and options");
        return;
      }
    }

    try {
      // Create test
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          title: formData.title,
          description: formData.description,
          document_id: isManual ? null : formData.documentId,
          location_id: formData.locationId || null,
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
      const questionInserts = questionsToSave.map((q, index) => ({
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

      // Clear draft after successful save
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      toast.success("Test created successfully!");
      navigate("/test-management");
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error("Failed to save test");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Create Test</h1>
            <p className="text-muted-foreground">Generate AI-powered tests or create manually</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Generated
              </TabsTrigger>
              <TabsTrigger value="manual">
                <PencilLine className="mr-2 h-4 w-4" />
                Manual Creation
              </TabsTrigger>
            </TabsList>

            {/* AI Generated Tab */}
            <TabsContent value="ai" className="space-y-6">
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
                      <Label>Location (Optional)</Label>
                      <Select
                        value={formData.locationId}
                        onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

                  <Button onClick={() => handleSaveTest(false)} size="lg" className="w-full">
                    <Save className="mr-2 h-5 w-5" />
                    Save Test
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Manual Creation Tab */}
            <TabsContent value="manual" className="space-y-6">
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
                      <Label>Location (Optional)</Label>
                      <Select
                        value={formData.locationId}
                        onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
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
                </div>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Questions ({manualQuestions.length})</h2>
                  <Button onClick={addManualQuestion} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                {manualQuestions.map((q, qIndex) => (
                  <Card key={qIndex} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Label>Question {qIndex + 1} *</Label>
                          <Textarea
                            value={q.question}
                            onChange={(e) => updateManualQuestion(qIndex, "question", e.target.value)}
                            placeholder="Enter your question"
                            rows={2}
                          />
                        </div>
                        {manualQuestions.length > 1 && (
                          <Button
                            onClick={() => removeManualQuestion(qIndex)}
                            variant="destructive"
                            size="icon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Options *</Label>
                        {q.options.map((opt: string, optIndex: number) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-6">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <Input
                              value={opt}
                              onChange={(e) => updateManualOption(qIndex, optIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label>Correct Answer *</Label>
                        <Select
                          value={q.correct_answer}
                          onValueChange={(value) => updateManualQuestion(qIndex, "correct_answer", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={() => handleSaveTest(true)} 
                size="lg" 
                className="w-full"
                disabled={manualQuestions.length === 0}
              >
                <Save className="mr-2 h-5 w-5" />
                Save Test
              </Button>
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
};

export default TestCreation;
