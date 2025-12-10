import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDailyOpsDetail, useUpdateDailyOps, ChecklistItem, Issue } from "@/hooks/useOperationsAgent";
import { useAgentLogs } from "@/hooks/useAgents";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Activity, ListChecks, FileWarning, History } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DailyOpsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dailyOps, isLoading, refetch } = useDailyOpsDetail(id || "");
  const updateDailyOps = useUpdateDailyOps();
  const { data: agentLogs } = useAgentLogs({ agentType: "operations" });

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    if (!dailyOps) return;

    const updatedChecklist = (dailyOps.checklist_json as ChecklistItem[]).map((item) =>
      item.id === itemId ? { ...item, completed } : item
    );

    const allCompleted = updatedChecklist.every((item) => item.completed);
    const anyCompleted = updatedChecklist.some((item) => item.completed);

    try {
      await updateDailyOps.mutateAsync({
        id: dailyOps.id,
        checklist_json: updatedChecklist as any,
        status: allCompleted ? "completed" : anyCompleted ? "in_progress" : "draft",
      });
      refetch();
    } catch (error: any) {
      toast.error("Failed to update checklist");
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-500">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!dailyOps) {
    return (
      <div className="container mx-auto py-6">
        <p>Daily ops not found</p>
      </div>
    );
  }

  const checklist = (dailyOps.checklist_json || []) as ChecklistItem[];
  const issues = (dailyOps.issues_found_json || []) as Issue[];
  const completedCount = checklist.filter((c) => c.completed).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/operations/daily")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Daily Operations - {format(new Date(dailyOps.date), "MMMM d, yyyy")}
          </h1>
          <p className="text-muted-foreground">{dailyOps.location?.name || "Unknown Location"}</p>
        </div>
        <div className="flex items-center gap-2">
          {dailyOps.location_health_score !== null && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{dailyOps.location_health_score}%</span>
            </div>
          )}
          <Badge
            className={
              dailyOps.status === "completed"
                ? "bg-green-500/10 text-green-500"
                : dailyOps.status === "in_progress"
                ? "bg-blue-500/10 text-blue-500"
                : ""
            }
          >
            {dailyOps.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {dailyOps.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
            {dailyOps.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Checklist ({completedCount}/{checklist.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <FileWarning className="h-4 w-4" />
            Issues ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Agent Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>Daily Checklist</CardTitle>
              <CardDescription>Complete all tasks to finish daily operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklist.length > 0 ? (
                  checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg ${
                        item.completed ? "bg-muted/50" : ""
                      }`}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <p className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.task}
                        </p>
                        <p className="text-xs text-muted-foreground">Source: {item.source}</p>
                      </div>
                      {getPriorityBadge(item.priority)}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No checklist items</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Issues Found</CardTitle>
              <CardDescription>Issues detected during daily operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issues.length > 0 ? (
                  issues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        issue.severity === "critical" ? "text-red-500" :
                        issue.severity === "high" ? "text-orange-500" :
                        issue.severity === "medium" ? "text-yellow-500" :
                        "text-muted-foreground"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{issue.type.replace(/_/g, " ")}</span>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Detected: {format(new Date(issue.detected_at), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No issues found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Agent Activity Logs</CardTitle>
              <CardDescription>Recent Operations Agent activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {agentLogs && agentLogs.length > 0 ? (
                    agentLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge variant="outline" className="shrink-0">{log.event_type}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {String((log.details_json as any)?.message || (log.details_json as any)?.action || "Event logged")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.occurred_at), "MMM d, HH:mm:ss")}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No agent logs found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
