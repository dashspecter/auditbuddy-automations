import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2, Play, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  suite: string;
  test: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

interface TestReport {
  summary: { total: number; passed: number; failed: number; skipped: number };
  timestamp: string;
  userId: string;
  results: TestResult[];
}

export const RLSIntegrationTestContent = () => {
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);

  const runTests = async () => {
    setTesting(true);
    setReport(null);

    try {
      // Get current session token explicitly
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        toast.error("You must be logged in to run isolation tests.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("rls-integration-test", {
        body: { action: "run" },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error("RLS test error:", error);
        toast.error(`RLS test failed: ${error.message || "Unknown error"}`);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setReport(data);

      if (data.summary.failed > 0) {
        toast.error(`${data.summary.failed} test(s) FAILED — potential data leak detected!`);
      } else {
        toast.success(`All ${data.summary.passed} tests passed! Tenant isolation verified.`);
      }
    } catch (error) {
      console.error("Test runner error:", error);
      toast.error("Failed to run tests.");
    } finally {
      setTesting(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case "skip": return <SkipForward className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pass": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">PASS</Badge>;
      case "fail": return <Badge variant="destructive">FAIL</Badge>;
      case "skip": return <Badge variant="secondary">SKIP</Badge>;
    }
  };

  // Group results by suite
  const groupedResults = report?.results.reduce((acc, r) => {
    if (!acc[r.suite]) acc[r.suite] = [];
    acc[r.suite].push(r);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          RLS & Tenant Isolation Tests
        </CardTitle>
        <CardDescription>
          Non-destructive, read-only tests that verify cross-tenant data isolation, role-based access, and sensitive data protection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing} className="gap-2">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Isolation Tests
            </>
          )}
        </Button>

        {report && (
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {report.summary.passed} passed
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      {report.summary.failed} failed
                    </span>
                    <span className="flex items-center gap-1">
                      <SkipForward className="h-4 w-4 text-muted-foreground" />
                      {report.summary.skipped} skipped
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Run at {new Date(report.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* Detailed results by suite */}
              {groupedResults && Object.entries(groupedResults).map(([suite, tests]) => (
                <Card key={suite}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{suite}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tests.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b last:border-0">
                        {statusIcon(t.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t.test}</span>
                            {statusBadge(t.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {!report && !testing && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Isolation Tests" to verify tenant data isolation</p>
            <p className="text-sm mt-2">Tests are read-only and will not modify any data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
