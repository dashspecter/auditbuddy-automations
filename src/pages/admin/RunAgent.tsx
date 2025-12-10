import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Play, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRunAgent, AGENT_TYPES } from "@/hooks/useAgents";

const RunAgent = () => {
  const navigate = useNavigate();
  const runAgent = useRunAgent();

  const [agentType, setAgentType] = useState("");
  const [goal, setGoal] = useState("");
  const [inputJson, setInputJson] = useState("{}");
  const [mode, setMode] = useState<"simulate" | "supervised" | "auto">("simulate");
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputJson);
      } catch {
        // Keep empty object if JSON is invalid
      }

      const response = await runAgent.mutateAsync({
        agent_type: agentType,
        goal,
        input: parsedInput,
        mode,
      });

      setResult(response);
    } catch (error) {
      console.error(error);
    }
  };

  const isValid = agentType && goal;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Run Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Execute an agent task with configurable modes
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
            <CardDescription>Configure the agent task parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Goal</Label>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Analyze shift coverage for next week"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Describe what you want the agent to accomplish
              </p>
            </div>

            <div>
              <Label>Input Data (JSON)</Label>
              <Textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Provide input data for the agent to process
              </p>
            </div>

            <div>
              <Label className="mb-3 block">Execution Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="simulate" id="simulate" />
                  <div className="flex-1">
                    <Label htmlFor="simulate" className="font-medium cursor-pointer">
                      Simulate
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Logs actions without executing. Safe for testing.
                    </p>
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="supervised" id="supervised" />
                  <div className="flex-1">
                    <Label htmlFor="supervised" className="font-medium cursor-pointer">
                      Supervised
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Creates workflow requiring manual approval for each step.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="auto" id="auto" />
                  <div className="flex-1">
                    <Label htmlFor="auto" className="font-medium cursor-pointer">
                      Auto
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Full autonomous execution of all workflow steps.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Caution
                  </Badge>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleRun}
              disabled={!isValid || runAgent.isPending}
            >
              {runAgent.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Result</CardTitle>
            <CardDescription>
              {result ? "Agent execution completed" : "Results will appear here after running"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mb-4 opacity-20" />
                <p>Configure and run an agent to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.executed === false ? (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-medium">
                    {result.executed === false ? "Simulated" : "Executed"}
                  </span>
                  <Badge>{result.mode}</Badge>
                </div>

                <div>
                  <Label className="text-muted-foreground">Task ID</Label>
                  <p className="font-mono text-sm">{result.task_id}</p>
                </div>

                {result.workflow_id && (
                  <div>
                    <Label className="text-muted-foreground">Workflow ID</Label>
                    <p className="font-mono text-sm">{result.workflow_id}</p>
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => navigate(`/admin/agents/workflows/${result.workflow_id}`)}
                    >
                      View Workflow →
                    </Button>
                  </div>
                )}

                {result.decision && (
                  <div>
                    <Label className="text-muted-foreground">Decision</Label>
                    <div className="mt-2 bg-muted p-3 rounded-lg">
                      <p className="font-medium">{result.decision.action}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.decision.reasoning}
                      </p>
                      {result.decision.applied_policies?.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {result.decision.applied_policies.map((policy: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {policy}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Full Response</Label>
                  <pre className="mt-2 bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RunAgent;
