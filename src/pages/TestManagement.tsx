import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Link as LinkIcon, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TestManagement = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    const { data, error } = await supabase
      .from("tests")
      .select(`
        *,
        document:documents(title),
        _count:test_submissions(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tests:", error);
      toast.error("Failed to load tests");
      return;
    }

    setTests(data || []);
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

  const copyTestLink = (testId: string) => {
    const link = `${window.location.origin}/take-test/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test link copied to clipboard");
  };

  const getTestUrl = (testId: string) => {
    return `${window.location.origin}/take-test/${testId}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-safe">
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

          <div className="grid gap-4">
            {tests.map((test) => (
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
                        <p className="font-medium">{test.document?.title}</p>
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
                        <p className="font-medium">{test._count?.count || 0}</p>
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
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyTestLink(test.id)}
                      title="Copy test link"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
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
                <div className="mt-4 p-3 bg-muted rounded text-sm font-mono truncate">
                  {getTestUrl(test.id)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

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
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestManagement;
