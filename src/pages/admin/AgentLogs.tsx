import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAgentLogs, AGENT_TYPES, AgentLog } from "@/hooks/useAgents";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const EVENT_TYPES = [
  { value: "decision", label: "Decision", color: "bg-blue-500" },
  { value: "memory_read", label: "Memory Read", color: "bg-green-500" },
  { value: "memory_write", label: "Memory Write", color: "bg-emerald-500" },
  { value: "policy_match", label: "Policy Match", color: "bg-purple-500" },
  { value: "workflow_step", label: "Workflow Step", color: "bg-amber-500" },
  { value: "error", label: "Error", color: "bg-red-500" },
  { value: "info", label: "Info", color: "bg-gray-500" },
];

const AgentLogs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    agentType?: string;
    eventType?: string;
    limit: number;
  }>({ limit: 100 });
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);

  const { data: logs = [], isLoading, isFetching } = useAgentLogs(filters);

  const getEventBadgeColor = (eventType: string) => {
    const type = EVENT_TYPES.find((t) => t.value === eventType);
    return type?.color || "bg-gray-500";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-logs"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Agent Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Detailed event logs from all agent activities
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
          <div className="flex gap-4 flex-wrap">
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
              <Label>Event Type</Label>
              <Select
                value={filters.eventType || "all"}
                onValueChange={(value) => setFilters({ ...filters, eventType: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Label>Limit</Label>
              <Select
                value={String(filters.limit)}
                onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Logs</CardTitle>
          <CardDescription>
            {logs.length} events {filters.agentType ? `for ${filters.agentType}` : ""} 
            {filters.eventType ? ` of type ${filters.eventType}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No logs found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Task/Workflow</TableHead>
                  <TableHead className="w-16">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {format(new Date(log.occurred_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.agent_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getEventBadgeColor(log.event_type)} text-white`}>
                        {log.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {String(log.details_json?.message || 
                       log.details_json?.action || 
                       log.details_json?.goal ||
                       JSON.stringify(log.details_json).slice(0, 50) + "...")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {log.task_id ? `Task: ${log.task_id.slice(0, 8)}...` : ""}
                      {log.workflow_id ? `Workflow: ${log.workflow_id.slice(0, 8)}...` : ""}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.occurred_at), "MMMM d, yyyy 'at' HH:mm:ss")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Agent Type</Label>
                  <p className="font-medium">{selectedLog.agent_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Type</Label>
                  <Badge className={`${getEventBadgeColor(selectedLog.event_type)} text-white`}>
                    {selectedLog.event_type}
                  </Badge>
                </div>
              </div>

              {selectedLog.task_id && (
                <div>
                  <Label className="text-muted-foreground">Task ID</Label>
                  <p className="font-mono text-sm">{selectedLog.task_id}</p>
                </div>
              )}

              {selectedLog.workflow_id && (
                <div>
                  <Label className="text-muted-foreground">Workflow ID</Label>
                  <p className="font-mono text-sm">{selectedLog.workflow_id}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Details</Label>
                <ScrollArea className="h-64 mt-2">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details_json, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentLogs;
