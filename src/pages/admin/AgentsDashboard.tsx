import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { Bot, FileText, ListChecks, Activity, Zap, Settings, Brain, Shield } from "lucide-react";
import { useAgentStats, useAgentTasks, useAgentWorkflows, AGENT_TYPES } from "@/hooks/useAgents";
import { format } from "date-fns";

const AgentsDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAgentStats();
  const { data: recentTasks = [] } = useAgentTasks(undefined, undefined);
  const { data: activeWorkflows = [] } = useAgentWorkflows(undefined, "in_progress");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Agent Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Autonomous Agent Foundation Layer - Monitor and manage AI agents
          </p>
        </div>
        <Button onClick={() => navigate("/admin/agents/run")}>
          <Zap className="h-4 w-4 mr-2" />
          Run Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground">All time agent tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.activePolicies || 0}</div>
            <p className="text-xs text-muted-foreground">Configured rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.logsLast24h || 0}</div>
            <p className="text-xs text-muted-foreground">Agent activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/admin/agents/policies">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Policy Manager
              </CardTitle>
              <CardDescription>Create and manage agent policies and rules</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/agents/logs">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agent Logs
              </CardTitle>
              <CardDescription>View detailed event logs and decisions</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/agents/workflows">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Workflow Inspector
              </CardTitle>
              <CardDescription>Monitor and manage agent workflows</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Agent Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Agents</CardTitle>
          <CardDescription>Agent modules ready for configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AGENT_TYPES.map((agent) => (
              <div
                key={agent.value}
                className="p-4 border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{agent.label}</h4>
                  <Badge variant="outline">Foundation</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest agent task executions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {recentTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{task.goal}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.agent_type} • {format(new Date(task.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "default"
                          : task.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Workflows</CardTitle>
            <CardDescription>Workflows currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            {activeWorkflows.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active workflows</p>
            ) : (
              <div className="space-y-3">
                {activeWorkflows.slice(0, 5).map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-primary"
                    onClick={() => navigate(`/admin/agents/workflows/${workflow.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{workflow.goal}</p>
                      <p className="text-xs text-muted-foreground">
                        Step {workflow.current_step + 1} of {workflow.plan_json?.length || 0}
                      </p>
                    </div>
                    <Badge variant="secondary">{workflow.agent_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentsDashboard;
