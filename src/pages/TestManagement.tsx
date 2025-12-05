import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Link as LinkIcon, Eye, FileText, CheckCircle2, XCircle, PlayCircle, UserPlus, Pencil, BookTemplate } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TestAssignDialog } from "@/components/TestAssignDialog";
import { TestAssignmentsDialog } from "@/components/TestAssignmentsDialog";
import { useTestAssignments } from "@/hooks/useTestAssignments";

const TestManagement = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [submissionDetails, setSubmissionDetails] = useState<any>(null);
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [previewTest, setPreviewTest] = useState<any>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCurrentQuestion, setPreviewCurrentQuestion] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTestForAssignment, setSelectedTestForAssignment] = useState<{ id: string; title: string } | null>(null);
  const [viewAssignmentsDialogOpen, setViewAssignmentsDialogOpen] = useState(false);
  const [selectedTestForViewAssignments, setSelectedTestForViewAssignments] = useState<{ id: string; title: string } | null>(null);
  const [filterTemplates, setFilterTemplates] = useState(false);
  
  const { data: testAssignments } = useTestAssignments();

  useEffect(() => {
    loadTests();
    loadAllSubmissions();
  }, []);

  const loadTests = async () => {
    const { data, error } = await supabase
      .from("tests")
      .select(`
        *,
        document:documents(title)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tests:", error);
      toast.error("Failed to load tests");
      return;
    }

    // Get submission counts for each test
    const testsWithCounts = await Promise.all(
      (data || []).map(async (test) => {
        const { count } = await supabase
          .from("test_submissions")
          .select("*", { count: "exact", head: true })
          .eq("test_id", test.id);
        
        return { ...test, submissionCount: count || 0 };
      })
    );

    setTests(testsWithCounts);
  };

  const loadSubmissions = async (testId: string) => {
    const { data, error } = await supabase
      .from("test_submissions")
      .select("*")
      .eq("test_id", testId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
      return;
    }

    setSubmissions(data || []);
    setShowSubmissions(true);
  };

  const loadAllSubmissions = async () => {
    const { data, error } = await supabase
      .from("test_submissions")
      .select(`
        *,
        test:tests(title, passing_score)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading all submissions:", error);
      return;
    }

    setAllSubmissions(data || []);
  };

  const loadSubmissionDetails = async (submission: any) => {
    const { data: questions, error } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", submission.test_id)
      .order("display_order");

    if (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load question details");
      return;
    }

    setSelectedSubmission(submission);
    setSubmissionDetails(questions);
    setShowAnswerReview(true);
  };

  const copyTestLink = (testId: string) => {
    const link = `${window.location.origin}/take-test/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test link copied to clipboard");
  };

  const getTestUrl = (testId: string) => {
    return `${window.location.origin}/take-test/${testId}`;
  };

  const handlePreview = async (test: any) => {
    try {
      const { data: questions, error } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", test.id)
        .order("display_order");

      if (error) throw error;

      setPreviewTest(test);
      setPreviewQuestions(questions || []);
      setPreviewCurrentQuestion(0);
      setPreviewAnswers({});
      setShowPreview(true);
    } catch (error) {
      console.error("Error loading test preview:", error);
      toast.error("Failed to load test preview");
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewTest(null);
    setPreviewQuestions([]);
    setPreviewCurrentQuestion(0);
    setPreviewAnswers({});
  };

  const handleAssignTest = (test: any) => {
    setSelectedTestForAssignment({ id: test.id, title: test.title });
    setAssignDialogOpen(true);
  };

  const handleViewAssignments = (test: any) => {
    setSelectedTestForViewAssignments({ id: test.id, title: test.title });
    setViewAssignmentsDialogOpen(true);
  };

  const getAssignmentCount = (testId: string) => {
    if (!testAssignments) return 0;
    return testAssignments.filter(a => a.test_id === testId).length;
  };

  const getCompletedCount = (testId: string) => {
    if (!testAssignments) return 0;
    return testAssignments.filter(a => a.test_id === testId && a.completed).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Test Management</h1>
              <p className="text-muted-foreground">Manage and monitor all tests</p>
            </div>
            <Link to="/test-creation">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="tests" className="w-full">
            <TabsList>
              <TabsTrigger value="tests">All Tests</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="submissions">All Submissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tests" className="space-y-4">

              <div className="grid gap-4">
                {tests.filter(t => !t.is_template).map((test) => (
              <Card key={test.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{test.title}</h3>
                      {test.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {test.description && (
                      <p className="text-muted-foreground mb-3">{test.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Document</p>
                        <p className="font-medium">{test.document?.title || "Manual"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time Limit</p>
                        <p className="font-medium">{test.time_limit_minutes} min</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Passing Score</p>
                        <p className="font-medium">{test.passing_score}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submissions</p>
                        <p className="font-medium">{test.submissionCount || 0}</p>
                      </div>
                    </div>
                    {test.scheduled_for && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Scheduled: </span>
                        <span className="font-medium">
                          {format(new Date(test.scheduled_for), "PPp")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/test-edit/${test.id}`)}
                      title="Edit test"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 px-2 sm:px-3"
                      onClick={() => handleViewAssignments(test)}
                      title="View assignments"
                      disabled={getAssignmentCount(test.id) === 0}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden xs:inline">{getAssignmentCount(test.id)}/{getCompletedCount(test.id)}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignTest(test)}
                      title="Assign to employees"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(test)}
                      title="Preview test"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyTestLink(test.id)}
                      title="Copy test link"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTest(test);
                        loadSubmissions(test.id);
                      }}
                      title="View submissions"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground flex-1">
                      Test Link: <span className="font-medium text-foreground">
                        {test.title}
                        {test.scheduled_for && ` - ${format(new Date(test.scheduled_for), "MMM d, yyyy")}`}
                      </span>
                    </p>
                    <code className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                      /take-test/{test.id.slice(0, 8)}...
                    </code>
                  </div>
                </div>
                  </Card>
                ))}
                {tests.filter(t => !t.is_template).length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground">
                    No tests created yet. Click "Create Test" to get started.
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                {tests.filter(t => t.is_template).map((test) => (
                  <Card key={test.id} className="p-6 border-primary/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{test.title}</h3>
                          <Badge variant="outline" className="border-primary text-primary">
                            <BookTemplate className="h-3 w-3 mr-1" />
                            Template
                          </Badge>
                        </div>
                        {test.description && (
                          <p className="text-muted-foreground mb-3">{test.description}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Time Limit</p>
                            <p className="font-medium">{test.time_limit_minutes} min</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Passing Score</p>
                            <p className="font-medium">{test.passing_score}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Submissions</p>
                            <p className="font-medium">{test.submissionCount || 0}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/test-edit/${test.id}`)}
                          title="Edit template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(test)}
                          title="Preview test"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignTest(test)}
                          title="Assign to employees"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {tests.filter(t => t.is_template).length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground">
                    No templates yet. Edit any test and toggle "Save as Template" to create one.
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">All Test Submissions</h2>
                <div className="space-y-3">
                  {allSubmissions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No submissions yet
                    </p>
                  ) : (
                    allSubmissions.map((sub) => (
                      <Card key={sub.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1 text-sm">
                            <div>
                              <p className="text-muted-foreground">Test</p>
                              <p className="font-medium">{sub.test?.title}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Name</p>
                              <p className="font-medium">{sub.staff_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Location</p>
                              <p className="font-medium">{sub.staff_location}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-medium text-lg">{sub.score}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Result</p>
                              {sub.passed ? (
                                <Badge variant="default">Passed</Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </div>
                            <div>
                              <p className="text-muted-foreground">Date</p>
                              <p className="font-medium">
                                {format(new Date(sub.completed_at), "PP")}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadSubmissionDetails(sub)}
                            className="ml-4"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

      {/* Assign Test Dialog */}
      {selectedTestForAssignment && (
        <TestAssignDialog
          testId={selectedTestForAssignment.id}
          testTitle={selectedTestForAssignment.title}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
        />
      )}

      {/* View Assignments Dialog */}
      {selectedTestForViewAssignments && (
        <TestAssignmentsDialog
          testId={selectedTestForViewAssignments.id}
          testTitle={selectedTestForViewAssignments.title}
          open={viewAssignmentsDialogOpen}
          onOpenChange={setViewAssignmentsDialogOpen}
        />
      )}

      <Dialog open={showSubmissions} onOpenChange={setShowSubmissions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Test Submissions - {selectedTest?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No submissions yet
              </p>
            ) : (
              submissions.map((sub) => (
                <Card key={sub.id} className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{sub.staff_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{sub.staff_location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">{sub.score}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Result</p>
                      {sub.passed ? (
                        <Badge variant="default">Passed</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {format(new Date(sub.completed_at), "PP")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSubmissionDetails(sub)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Review Answers
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAnswerReview} onOpenChange={setShowAnswerReview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Answer Review - {selectedSubmission?.staff_name}
              </DialogTitle>
            </DialogHeader>
            {selectedSubmission && submissionDetails && (
              <div className="space-y-6">
                <Card className="p-4 bg-muted">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Final Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.score}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Result</p>
                      {selectedSubmission.passed ? (
                        <Badge variant="default" className="mt-1">Passed</Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-1">Failed</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time Taken</p>
                      <p className="font-medium">{selectedSubmission.time_taken_minutes || "N/A"} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedSubmission.staff_location}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Questions & Answers</h3>
                  {submissionDetails.map((question: any, index: number) => {
                    const userAnswer = selectedSubmission.answers?.[question.id];
                    const isCorrect = userAnswer === question.correct_answer;
                    
                    return (
                      <Card key={question.id} className={`p-4 ${isCorrect ? "border-green-500" : "border-red-500"} border-2`}>
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="font-semibold">Question {index + 1}</p>
                              <p className="mt-1">{question.question}</p>
                            </div>
                            
                            <div className="space-y-2">
                              {question.options?.map((option: string, optIndex: number) => {
                                const optionLetter = String.fromCharCode(65 + optIndex);
                                const isUserAnswer = userAnswer === optionLetter;
                                const isCorrectAnswer = question.correct_answer === optionLetter;
                                
                                return (
                                  <div
                                    key={optIndex}
                                    className={`p-3 rounded-lg ${
                                      isCorrectAnswer
                                        ? "bg-green-100 border-green-500 border-2"
                                        : isUserAnswer
                                        ? "bg-red-100 border-red-500 border-2"
                                        : "bg-muted"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>
                                        <span className="font-semibold">{optionLetter}.</span> {option}
                                      </span>
                                      <div className="flex gap-2">
                                        {isCorrectAnswer && (
                                          <Badge variant="default" className="bg-green-600">
                                            Correct Answer
                                          </Badge>
                                        )}
                                        {isUserAnswer && !isCorrectAnswer && (
                                          <Badge variant="destructive">
                                            Your Answer
                                          </Badge>
                                        )}
                                        {isUserAnswer && isCorrectAnswer && (
                                          <Badge variant="default" className="bg-green-600">
                                            Your Answer ✓
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Test Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={handlePreviewClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Preview: {previewTest?.title}</DialogTitle>
            </DialogHeader>
            
            {previewQuestions.length > 0 && (
              <div className="space-y-6">
                {/* Test Info */}
                <Card className="p-4 bg-muted">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Questions</p>
                      <p className="font-semibold">{previewQuestions.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time Limit</p>
                      <p className="font-semibold">{previewTest.time_limit_minutes} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Passing Score</p>
                      <p className="font-semibold">{previewTest.passing_score}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Points</p>
                      <p className="font-semibold">
                        {previewQuestions.reduce((sum, q) => sum + q.points, 0)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preview Mode</span>
                    <span className="font-medium">
                      Question {previewCurrentQuestion + 1} of {previewQuestions.length}
                    </span>
                  </div>
                  <Progress 
                    value={((previewCurrentQuestion + 1) / previewQuestions.length) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Current Question */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6">
                    {previewQuestions[previewCurrentQuestion].question}
                  </h3>

                  <RadioGroup
                    value={previewAnswers[previewQuestions[previewCurrentQuestion].id]}
                    onValueChange={(value) => 
                      setPreviewAnswers({
                        ...previewAnswers, 
                        [previewQuestions[previewCurrentQuestion].id]: value
                      })
                    }
                  >
                    {previewQuestions[previewCurrentQuestion].options.map((opt: string, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-3 p-3 rounded hover:bg-muted"
                      >
                        <RadioGroupItem
                          value={String.fromCharCode(65 + index)}
                          id={`preview-option-${index}`}
                        />
                        <Label 
                          htmlFor={`preview-option-${index}`} 
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">
                            {String.fromCharCode(65 + index)}.
                          </span> {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  <div className="flex gap-3 mt-6">
                    {previewCurrentQuestion > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setPreviewCurrentQuestion(previewCurrentQuestion - 1)}
                      >
                        Previous
                      </Button>
                    )}
                    {previewCurrentQuestion < previewQuestions.length - 1 && (
                      <Button
                        onClick={() => setPreviewCurrentQuestion(previewCurrentQuestion + 1)}
                        className="flex-1"
                      >
                        Next Question
                      </Button>
                    )}
                    {previewCurrentQuestion === previewQuestions.length - 1 && (
                      <Button
                        variant="secondary"
                        onClick={handlePreviewClose}
                        className="flex-1"
                      >
                        Close Preview
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Answer Summary */}
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground mb-2">
                    Preview Progress: {Object.keys(previewAnswers).length} / {previewQuestions.length} questions viewed
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {previewQuestions.map((q, index) => (
                      <Button
                        key={q.id}
                        variant={index === previewCurrentQuestion ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                        onClick={() => setPreviewCurrentQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  export default TestManagement;
