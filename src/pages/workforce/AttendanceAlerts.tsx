import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAttendanceAlerts, useUpdateAttendanceAlert, useDetectAttendanceRisks } from "@/hooks/useWorkforceAgent";
import { useLocations } from "@/hooks/useLocations";
import { AlertTriangle, Clock, CheckCircle2, Eye, Bot, RefreshCw, UserX, Zap } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTerminology } from "@/hooks/useTerminology";

const getAlertTypeLabels = (t: any): Record<string, { label: string; icon: any; color: string }> => ({
  late_pattern: { label: t('workforce.attendanceAlerts.alertTypes.latePattern'), icon: Clock, color: "text-yellow-500" },
  excessive_overtime: { label: t('workforce.attendanceAlerts.alertTypes.excessiveOvertime'), icon: Zap, color: "text-orange-500" },
  auto_clockout_pattern: { label: t('workforce.attendanceAlerts.alertTypes.autoClockout'), icon: UserX, color: "text-red-500" },
  no_show: { label: t('workforce.attendanceAlerts.alertTypes.noShow'), icon: AlertTriangle, color: "text-red-500" },
});

const getStatusOptions = (t: any) => [
  { value: "all", label: t('workforce.attendanceAlerts.allStatuses') },
  { value: "open", label: t('workforce.attendanceAlerts.open') },
  { value: "acknowledged", label: t('workforce.attendanceAlerts.acknowledged') },
  { value: "resolved", label: t('workforce.attendanceAlerts.resolved') },
  { value: "dismissed", label: t('workforce.attendanceAlerts.dismissed') },
];

export default function AttendanceAlerts() {
  const { t } = useTranslation();
  const { employee: employeeTerm, location: locationTerm, locations: locationsTerm } = useTerminology();
  const employeeLabel = employeeTerm();
  const locationLabel = locationTerm();
  const locationsLabel = locationsTerm();
  const locationLabelLower = locationLabel.toLowerCase();
  const [selectedStatus, setSelectedStatus] = useState<string>("open");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const { data: locations } = useLocations();
  const { data: alerts, isLoading, refetch } = useAttendanceAlerts({
    status: selectedStatus === "all" ? undefined : selectedStatus,
    locationId: selectedLocation === "all" ? undefined : selectedLocation,
    startDate,
    endDate,
  });
  const updateAlert = useUpdateAttendanceAlert();
  const detectRisks = useDetectAttendanceRisks();

  const handleRunDetection = async () => {
    try {
      const result = await detectRisks.mutateAsync({ lookbackDays: 30 });
      toast.success(result?.data?.message || t('workforce.attendanceAlerts.detectionComplete'));
      refetch();
    } catch (error: any) {
      toast.error(error.message || t('workforce.attendanceAlerts.failedDetect'));
    }
  };

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    try {
      await updateAlert.mutateAsync({
        id: alertId,
        status: newStatus as any,
      });
      toast.success(t('workforce.attendanceAlerts.statusUpdated'));
      setSelectedAlert(null);
    } catch (error: any) {
      toast.error(error.message || t('workforce.attendanceAlerts.failedUpdate'));
    }
  };

  const getAlertTypeInfo = (type: string) => {
    const alertTypeLabels = getAlertTypeLabels(t);
    return alertTypeLabels[type] || { label: type, icon: AlertTriangle, color: "text-muted-foreground" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> {t('workforce.attendanceAlerts.resolved')}</Badge>;
      case "acknowledged":
        return <Badge className="bg-blue-500/10 text-blue-500">{t('workforce.attendanceAlerts.acknowledged')}</Badge>;
      case "dismissed":
        return <Badge variant="secondary">{t('workforce.attendanceAlerts.dismissed')}</Badge>;
      default:
        return <Badge variant="destructive">{t('workforce.attendanceAlerts.open')}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('workforce.attendanceAlerts.title')}</h1>
          <p className="text-muted-foreground">{t('workforce.attendanceAlerts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('workforce.attendanceAlerts.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions(t).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button onClick={handleRunDetection} disabled={detectRisks.isPending}>
            <Bot className="h-4 w-4 mr-2" />
            {t('workforce.attendanceAlerts.runDetection')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{locationLabel}</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${locationLabelLower}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{`All ${locationsLabel}`}</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('workforce.attendanceAlerts.startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('workforce.attendanceAlerts.endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
...
                <TableRow>
                  <TableHead>{t('workforce.attendanceAlerts.alertType')}</TableHead>
                  <TableHead>{employeeLabel}</TableHead>
                  <TableHead>{locationLabel}</TableHead>
                  <TableHead>{t('workforce.attendanceAlerts.date')}</TableHead>
                  <TableHead>{t('workforce.attendanceAlerts.statusCol')}</TableHead>
                  <TableHead className="text-right">{t('workforce.attendanceAlerts.actionsCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
...
                <div>
                  <p className="text-sm text-muted-foreground">{employeeLabel}</p>
                  <p className="font-medium">{selectedAlert.employee?.full_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{locationLabel}</p>
                  <p className="font-medium">{selectedAlert.location?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('workforce.attendanceAlerts.date')}</p>
                  <p className="font-medium">{format(new Date(selectedAlert.date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('workforce.attendanceAlerts.statusCol')}</p>
                  {getStatusBadge(selectedAlert.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('workforce.attendanceAlerts.detailsLabel')}</p>
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
                    {t('workforce.attendanceAlerts.acknowledge')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "dismissed")}
                  >
                    {t('workforce.attendanceAlerts.dismiss')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "resolved")}
                  >
                    {t('workforce.attendanceAlerts.resolve')}
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
                    {t('workforce.attendanceAlerts.dismiss')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusChange(selectedAlert.id, "resolved")}
                  >
                    {t('workforce.attendanceAlerts.resolve')}
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
