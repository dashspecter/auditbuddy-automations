import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Activity, Eye, Play, RefreshCw, CheckCircle2, Clock, XCircle, Circle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAgentWorkflows, useAgentWorkflowDetails, AGENT_TYPES } from "@/hooks/useAgents";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WorkflowList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<{ agentType?: string; status?: string }>({});

  const { data: workflows = [], isLoading, isFetching } = useAgentWorkflows(
    filters.agentType,
    filters.status
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-workflows"] });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const executeWorkflowStep = async (workflowId: string) => {
    try {
      const response = await supabase.functions.invoke("agent-orchestrator", {
        body: null,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Use fetch directly for the specific path
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-orchestrator/workflows/${workflowId}/execute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to execute step");

      queryClient.invalidateQueries({ queryKey: ["agent-workflows"] });
      toast({ title: "Workflow step executed" });
    } catch (error) {
      toast({ title: "Failed to execute step", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Workflow Inspector
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage agent workflows
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label>Agent Type</Label>
              <Select
                value={filters.agentType || "all"}
                onValueChange={(value) => setFilters({ ...filters, agentType: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>{workflows.length} workflows found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : workflows.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No workflows found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => {
                  const totalSteps = workflow.plan_json?.length || 0;
                  const progress = totalSteps > 0 ? (workflow.current_step / totalSteps) * 100 : 0;

                  return (
                    <TableRow key={workflow.id}>
                      <TableCell className="font-medium max-w-xs truncate">{workflow.goal}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{workflow.agent_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-20" />
                          <span className="text-sm text-muted-foreground">
                            {workflow.current_step}/{totalSteps}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(workflow.status)}
                          <span className="capitalize">{workflow.status.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(workflow.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/agents/workflows/${workflow.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(workflow.status === "pending" || workflow.status === "in_progress") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => executeWorkflowStep(workflow.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const WorkflowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAgentWorkflowDetails(id || "");

  if (!id) return null;

  const workflow = data?.workflow;
  const logs = data?.logs || [];

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Workflow Details</h1>
          <p className="text-muted-foreground font-mono text-sm">{id}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : !workflow ? (
        <p className="text-center py-8 text-muted-foreground">Workflow not found</p>
      ) : (
        <>
          {/* Workflow Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{workflow.goal}</CardTitle>
              <CardDescription>
                <Badge variant="outline" className="mr-2">{workflow.agent_type}</Badge>
                <Badge variant={workflow.status === "completed" ? "default" : "secondary"}>
                  {workflow.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{format(new Date(workflow.created_at), "MMM d, yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(workflow.updated_at), "MMM d, yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Progress</Label>
                  <p>{workflow.current_step} of {workflow.plan_json?.length || 0} steps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(workflow.plan_json || []).map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-4 border rounded-lg ${
                      index < workflow.current_step ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="mt-0.5">{getStepStatusIcon(step.status)}</div>
                    <div className="flex-1">
                      <p className="font-medium">Step {step.step}: {step.action}</p>
                      {step.result && (
                        <pre className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Related Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Related Logs</CardTitle>
              <CardDescription>{logs.length} log entries</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No logs for this workflow</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {log.event_type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {String(log.details_json?.action || log.details_json?.message || "Event logged")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.occurred_at), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const AgentWorkflows = () => {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <WorkflowDetail />;
  }

  return <WorkflowList />;
};

export default AgentWorkflows;
