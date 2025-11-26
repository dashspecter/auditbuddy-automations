import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, Loader2, AlertTriangle } from "lucide-react";

const locations = ["LBFC Amzei", "LBFC Mosilor", "LBFC Timpuri Noi", "LBFC Apaca"];

const TakeTest = () => {
  const { testId, shortCode } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffLocation, setStaffLocation] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [assignmentRecordId, setAssignmentRecordId] = useState<string | null>(null);
  const [actualTestId, setActualTestId] = useState<string | null>(null);

  useEffect(() => {
    if (shortCode) {
      checkAssignment();
    } else if (testId) {
      loadTest();
    }
  }, [testId, shortCode]);

  const checkAssignment = async () => {
    if (!shortCode) return;
    
    console.log("Checking assignment with short code:", shortCode);
    
    try {
      // Load assignment details using the short code from URL
      const { data: assignment, error } = await supabase
        .from("test_assignments")
        .select(`
          id,
          test_id,
          employee_id,
          completed,
          short_code,
          employees(
            id,
            full_name,
            location_id,
            locations(name)
          )
        `)
        .eq("short_code", shortCode)
        .maybeSingle();

      console.log("Assignment query result:", { assignment, error });

      if (error) {
        console.error("Assignment query error:", error);
        throw error;
      }

      if (!assignment) {
        toast.error("Invalid or expired assignment link");
        setLoading(false);
        return;
      }

      if (assignment.employees) {
        setIsAssigned(true);
        setAssignmentRecordId(assignment.id);
        setEmployeeId(assignment.employees.id);
        setStaffName(assignment.employees.full_name);
        setStaffLocation(assignment.employees.locations?.name || "");
        setActualTestId(assignment.test_id);
        
        if (assignment.completed) {
          toast.info("This test has already been completed");
        }
        
        console.log("Loading test with ID:", assignment.test_id);
        // Load the test using the test_id from the assignment
        await loadTestById(assignment.test_id);
      } else {
        toast.error("Employee information not found");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking assignment:", error);
      toast.error("Failed to load assignment: " + (error as Error).message);
      setLoading(false);
    }
  };

  const loadTestById = async (id: string) => {
    console.log("Loading test by ID:", id);
    try {
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      console.log("Test query result:", { testData, testError });

      if (testError) {
        console.error("Test query error:", testError);
        throw testError;
      }

      if (!testData) {
        toast.error("Test not found or inactive");
        setLoading(false);
        return;
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", id)
        .order("display_order");

      console.log("Questions query result:", { questionsData, questionsError });

      if (questionsError) {
        console.error("Questions query error:", questionsError);
        throw questionsError;
      }

      setTest(testData);
      setQuestions(questionsData || []);
      setTimeLeft(testData.time_limit_minutes * 60);
    } catch (error) {
      console.error("Error loading test:", error);
      toast.error("Failed to load test: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (started && timeLeft > 0 && !submitting) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(true); // Auto-submit when time expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [started, timeLeft, submitting]);

  const loadTest = async () => {
    if (!testId) return;
    await loadTestById(testId);
  };

  const handleStart = () => {
    if (!staffName.trim() || !staffLocation) {
      toast.error("Please enter your name and location");
      return;
    }
    setStarted(true);
  };

  const handleSubmitClick = () => {
    setShowConfirmDialog(true);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (submitting) return;
    
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      let score = 0;
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      questions.forEach((q) => {
        if (answers[q.id] === q.correct_answer) {
          score += q.points;
        }
      });

      const percentageScore = Math.round((score / totalPoints) * 100);
      const passed = percentageScore >= test.passing_score;
      const timeTaken = test.time_limit_minutes * 60 - timeLeft;

      const { error } = await supabase.from("test_submissions").insert({
        test_id: actualTestId || testId,
        staff_name: staffName,
        staff_location: staffLocation,
        employee_id: employeeId,
        answers: answers,
        score: percentageScore,
        passed,
        time_taken_minutes: Math.max(1, Math.round(timeTaken / 60)),
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Mark assignment as completed if this was an assigned test
      if (assignmentRecordId && isAssigned) {
        await supabase
          .from("test_assignments")
          .update({ completed: true })
          .eq("id", assignmentRecordId);
      }

      if (error) throw error;

      const message = autoSubmit
        ? "Time's up! Test auto-submitted." 
        : passed 
        ? "Congratulations! You passed!" 
        : "Test submitted";
      
      toast.success(message);
      navigate(`/test-result/${actualTestId || testId}/${percentageScore}/${passed}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Test Not Found</h1>
          <p className="text-muted-foreground">This test is not available or has expired.</p>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">{test.title}</h1>
            {test.description && (
              <p className="text-muted-foreground">{test.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-muted rounded p-3">
              <p className="text-muted-foreground">Questions</p>
              <p className="font-semibold">{questions.length}</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-muted-foreground">Time Limit</p>
              <p className="font-semibold">{test.time_limit_minutes} minutes</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-muted-foreground">Passing Score</p>
              <p className="font-semibold">{test.passing_score}%</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-muted-foreground">Points</p>
              <p className="font-semibold">{questions.reduce((sum, q) => sum + q.points, 0)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {isAssigned && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Assigned Test</p>
                    <p className="text-sm text-muted-foreground">
                      This test has been assigned to you. Your information is pre-filled.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label>Full Name *</Label>
              <Input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isAssigned}
                className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
              />
              {isAssigned && (
                <p className="text-xs text-muted-foreground mt-1">
                  Name is locked for assigned tests
                </p>
              )}
            </div>
            <div>
              <Label>Location *</Label>
              <Input
                value={staffLocation}
                onChange={(e) => setStaffLocation(e.target.value)}
                placeholder="Your location"
                disabled={isAssigned}
                className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
              />
              {!isAssigned && (
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 mt-2"
                  value={staffLocation}
                  onChange={(e) => setStaffLocation(e.target.value)}
                >
                  <option value="">Select your location</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}
              {isAssigned && (
                <p className="text-xs text-muted-foreground mt-1">
                  Location is locked for assigned tests
                </p>
              )}
            </div>
            <Button onClick={handleStart} size="lg" className="w-full">
              Start Test
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto pt-8">
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 text-sm ${timeLeft < 60 ? "animate-pulse" : ""}`}>
              <Clock className={`h-5 w-5 ${timeLeft < 300 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`font-semibold text-lg ${timeLeft < 60 ? "text-destructive" : timeLeft < 300 ? "text-orange-500" : ""}`}>
                {formatTime(timeLeft)}
              </span>
              {timeLeft < 60 && (
                <Badge variant="destructive" className="ml-2">Time Running Out!</Badge>
              )}
            </div>
            <div className="text-sm font-medium">
              Question {currentQuestion + 1} of {questions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">{currentQ.question}</h2>

          <RadioGroup
            value={answers[currentQ.id]}
            onValueChange={(value) => setAnswers({ ...answers, [currentQ.id]: value })}
            disabled={submitting}
          >
            {currentQ.options.map((opt: string, index: number) => (
              <div key={index} className={`flex items-center space-x-3 p-3 rounded ${submitting ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}>
                <RadioGroupItem
                  value={String.fromCharCode(65 + index)}
                  id={`option-${index}`}
                  disabled={submitting}
                />
                <Label htmlFor={`option-${index}`} className={`flex-1 ${submitting ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-3 mt-6">
            {currentQuestion > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                disabled={submitting}
              >
                Previous
              </Button>
            )}
            {currentQuestion < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="flex-1"
                disabled={submitting}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmitClick}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Test
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Submit Test?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    Are you sure you want to submit your test? You won't be able to change your answers after submission.
                  </p>
                  
                  <Card className="p-4 bg-muted">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Questions answered:</span>
                        <span className="font-semibold">
                          {Object.keys(answers).length} / {questions.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time remaining:</span>
                        <span className="font-semibold">{formatTime(timeLeft)}</span>
                      </div>
                      {Object.keys(answers).length < questions.length && (
                        <div className="flex items-start gap-2 mt-3 p-2 bg-orange-100 dark:bg-orange-950 rounded">
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-800 dark:text-orange-200">
                            You have {questions.length - Object.keys(answers).length} unanswered question(s). These will be marked as incorrect.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Review Answers</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Test"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TakeTest;
