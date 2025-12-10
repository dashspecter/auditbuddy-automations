import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDailyOps, useRunOperationsAgent } from "@/hooks/useOperationsAgent";
import { useLocations } from "@/hooks/useLocations";
import { Play, RefreshCw, Eye, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function DailyOps() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { data: locations } = useLocations();
  const { data: dailyOps, isLoading, refetch } = useDailyOps(selectedLocation || undefined);
  const runAgent = useRunOperationsAgent();

  const handleRunAgent = async (mode: string) => {
    if (!selectedLocation) {
      toast.error("Please select a location first");
      return;
    }

    try {
      const result = await runAgent.mutateAsync({
        locationId: selectedLocation,
        mode,
      });
      toast.success(result.message || "Agent run completed");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to run agent");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-500"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getHealthScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground">-</span>;
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-500">{score}%</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/10 text-yellow-500">{score}%</Badge>;
    return <Badge className="bg-red-500/10 text-red-500">{score}%</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Operations</h1>
          <p className="text-muted-foreground">Manage daily checklists and track location health</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleRunAgent("simulate")} disabled={runAgent.isPending}>
            <Play className="h-4 w-4 mr-2" />
            Simulate
          </Button>
          <Button variant="default" onClick={() => handleRunAgent("auto")} disabled={runAgent.isPending}>
            <Play className="h-4 w-4 mr-2" />
            Run Agent
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Operations Log</CardTitle>
          <CardDescription>View and manage daily operations for each location</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dailyOps && dailyOps.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checklist Items</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyOps.map((ops) => {
                  const checklist = ops.checklist_json || [];
                  const issues = ops.issues_found_json || [];
                  const completedCount = checklist.filter((c: any) => c.completed).length;

                  return (
                    <TableRow key={ops.id}>
                      <TableCell className="font-medium">
                        {format(new Date(ops.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(ops.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {completedCount}/{checklist.length} completed
                        </span>
                      </TableCell>
                      <TableCell>
                        {issues.length > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {issues.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>{getHealthScoreBadge(ops.location_health_score)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/operations/daily/${ops.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No daily operations found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a location and run the Operations Agent to generate daily ops
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
