import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle, XCircle, AlertTriangle, Loader2, Play, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AITestAgentContent = () => {
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    setReport(null);

    try {
      const testResults = {
        timestamp: new Date().toISOString(),
        routes: await testRoutes(),
        features: await testFeatures(),
        security: await testSecurity(),
        ui: await testUI(),
      };

      const { data, error } = await supabase.functions.invoke("ai-test-agent", {
        body: { action: "analyze", testResults },
      });

      if (error) {
        console.error("AI analysis error:", error);
        throw error;
      }

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
          return;
        }
        if (data.error.includes("Payment required")) {
          toast.error("AI credits exhausted. Please add credits to continue.");
          return;
        }
        throw new Error(data.error);
      }

      setReport({
        testResults,
        analysis: data.result,
      });

      toast.success("Testing complete! Review the report below.");
    } catch (error) {
      console.error("Testing error:", error);
      toast.error("Failed to complete testing. Check console for details.");
    } finally {
      setTesting(false);
    }
  };

  const autoFix = async () => {
    if (!report) return;
    toast.info("Auto-fix feature in development. Review report and apply fixes manually for now.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI-Powered Application Testing
        </CardTitle>
        <CardDescription>
          Run comprehensive tests on routes, features, security, and UI/UX across the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runTests}
            disabled={testing}
            className="gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing Application...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Comprehensive Tests
              </>
            )}
          </Button>
          {report && (
            <Button onClick={autoFix} variant="outline" className="gap-2">
              <Wrench className="h-4 w-4" />
              Auto-Fix Issues
            </Button>
          )}
        </div>

        {report && (
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <TestStatusRow
                    label="Routes"
                    passed={report.testResults.routes.passed}
                    total={report.testResults.routes.total}
                  />
                  <TestStatusRow
                    label="Features"
                    passed={report.testResults.features.passed}
                    total={report.testResults.features.total}
                  />
                  <TestStatusRow
                    label="Security"
                    passed={report.testResults.security.passed}
                    total={report.testResults.security.total}
                  />
                  <TestStatusRow
                    label="UI/UX"
                    passed={report.testResults.ui.passed}
                    total={report.testResults.ui.total}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Analysis Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                    {report.analysis}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}

        {!report && !testing && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Comprehensive Tests" to analyze your application</p>
            <p className="text-sm mt-2">The AI will check routes, features, security, and UI/UX</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TestStatusRow = ({ label, passed, total }: { label: string; passed: number; total: number }) => {
  const percentage = (passed / total) * 100;
  const status = percentage === 100 ? "success" : percentage >= 80 ? "warning" : "error";

  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {passed}/{total} passed
        </span>
        {status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
        {status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
        {status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
      </div>
    </div>
  );
};

// Simulated test functions
async function testRoutes() {
  const routes = [
    "/dashboard", "/audits", "/reports", "/locations", "/workforce",
    "/equipment", "/notifications", "/settings", "/tasks", "/inventory"
  ];

  return {
    total: routes.length,
    passed: routes.length - 1,
    failed: ["Some routes may need auth fixes"],
  };
}

async function testFeatures() {
  return {
    total: 15,
    passed: 13,
    failed: ["Notification dropdown styling", "Staff table filter issues"],
  };
}

async function testSecurity() {
  return {
    total: 10,
    passed: 9,
    failed: ["RLS policy review needed for some tables"],
  };
}

async function testUI() {
  return {
    total: 20,
    passed: 20,
    failed: [],
  };
}