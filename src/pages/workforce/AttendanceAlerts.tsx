import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttendanceAlerts, useUpdateAttendanceAlert, useDetectAttendanceRisks } from "@/hooks/useWorkforceAgent";
import { AlertTriangle, Clock, CheckCircle2, Eye, Bot, RefreshCw, UserX, Zap } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ALERT_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  late_pattern: { label: "Late Pattern", icon: Clock, color: "text-yellow-500" },
  excessive_overtime: { label: "Excessive Overtime", icon: Zap, color: "text-orange-500" },
  auto_clockout_pattern: { label: "Auto Clock-out Pattern", icon: UserX, color: "text-red-500" },
  no_show: { label: "No Show", icon: AlertTriangle, color: "text-red-500" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export default function AttendanceAlerts() {
  const [selectedStatus, setSelectedStatus] = useState<string>("open");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const { data: alerts, isLoading, refetch } = useAttendanceAlerts({
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });
  const updateAlert = useUpdateAttendanceAlert();
  const detectRisks = useDetectAttendanceRisks();

  const handleRunDetection = async () => {
    try {
      const result = await detectRisks.mutateAsync({ lookbackDays: 30 });
      toast.success(result?.data?.message || "Risk detection complete");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to detect risks");
    }
  };

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    try {
      await updateAlert.mutateAsync({
        id: alertId,
        status: newStatus as any,
      });
      toast.success("Alert status updated");
      setSelectedAlert(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update alert");
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPE_LABELS[type] || { label: type, icon: AlertTriangle, color: "text-muted-foreground" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case "acknowledged":
        return <Badge className="bg-blue-500/10 text-blue-500">Acknowledged</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="destructive">Open</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Alerts</h1>
          <p className="text-muted-foreground">Monitor and resolve attendance issues detected by the Workforce Agent</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRunDetection} disabled={detectRisks.isPending}>
            <Bot className="h-4 w-4 mr-2" />
            Run Detection
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-500">
              {alerts?.filter(a => a.status === "open").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Open Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-500">
              {alerts?.filter(a => a.status === "acknowledged").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Acknowledged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-500">
              {alerts?.filter(a => a.status === "resolved").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {alerts?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert List</CardTitle>
          <CardDescription>All attendance alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const typeInfo = getAlertTypeInfo(alert.alert_type);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                          <span className="font-medium">{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>{alert.employee?.full_name || "-"}</TableCell>
                      <TableCell>{alert.location?.name || "-"}</TableCell>
                      <TableCell>{format(new Date(alert.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
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
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No attendance alerts</p>
              <p className="text-sm text-muted-foreground">Run the detection agent to check for issues</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
            <DialogDescription>
              {selectedAlert && getAlertTypeInfo(selectedAlert.alert_type).label}
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{selectedAlert.employee?.full_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedAlert.location?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedAlert.date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedAlert.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Details</p>
                <Card>
                  <CardContent className="pt-4">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedAlert.details_json, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {selectedAlert.status === "open" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "acknowledged")}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "dismissed")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "resolved")}
                  >
                    Resolve
                  </Button>
                </div>
              )}
              {selectedAlert.status === "acknowledged" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "dismissed")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "resolved")}
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
