import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePayrollBatches, useUpdatePayrollBatch, usePreparePayroll, PayrollBatch } from "@/hooks/useWorkforceAgent";
import { usePayrollBatchDetails } from "@/hooks/usePayrollBatchDetails";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Plus, Eye, Receipt, Clock, CheckCircle2, Bot, Users, Wallet, MapPin, Calendar, Stethoscope, Palmtree, AlertTriangle, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const getStatusLabels = (t: any): Record<string, { label: string; color: string }> => ({
  draft: { label: t('workforce.payrollBatches.statusDraft'), color: "secondary" },
  pending_approval: { label: t('workforce.payrollBatches.statusPendingApproval'), color: "bg-yellow-500/10 text-yellow-500" },
  approved: { label: t('workforce.payrollBatches.statusApproved'), color: "bg-blue-500/10 text-blue-500" },
  processed: { label: t('workforce.payrollBatches.statusProcessed'), color: "bg-purple-500/10 text-purple-500" },
  paid: { label: t('workforce.payrollBatches.statusPaid'), color: "bg-green-500/10 text-green-500" },
});

export default function PayrollBatches() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [newPeriod, setNewPeriod] = useState({ start: "", end: "" });

  const { data: batches, isLoading, refetch } = usePayrollBatches();
  const updateBatch = useUpdatePayrollBatch();
  const preparePayroll = usePreparePayroll();

  // Enhanced details for the selected batch
  const { data: enhancedDetails = [], isLoading: detailsLoading } = usePayrollBatchDetails(
    selectedBatch?.period_start,
    selectedBatch?.period_end,
    company?.id
  );

  const handlePreparePayroll = async () => {
    if (!newPeriod.start || !newPeriod.end) {
      toast.error(t('workforce.payrollBatches.selectDates'));
      return;
    }

    try {
      await preparePayroll.mutateAsync({
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
      });
      toast.success(t('workforce.payrollBatches.batchPrepared'));
      setIsDialogOpen(false);
      setNewPeriod({ start: "", end: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || t('workforce.payrollBatches.failedPrepare'));
    }
  };

  const handleStatusChange = async (batchId: string, newStatus: string) => {
    try {
      await updateBatch.mutateAsync({
        id: batchId,
        status: newStatus as any,
      });
      toast.success(t('workforce.payrollBatches.statusUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('workforce.payrollBatches.failedUpdate'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLabels = getStatusLabels(t);
    const config = statusLabels[status] || { label: status, color: "secondary" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('workforce.payrollBatches.title')}</h1>
          <p className="text-muted-foreground">{t('workforce.payrollBatches.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('workforce.payrollBatches.preparePayroll')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('workforce.payrollBatches.prepareBatch')}</DialogTitle>
              <DialogDescription>
                {t('workforce.payrollBatches.agentAnalyze')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('workforce.payrollBatches.periodStart')}</Label>
                  <Input
                    type="date"
                    value={newPeriod.start}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('workforce.payrollBatches.periodEnd')}</Label>
                  <Input
                    type="date"
                    value={newPeriod.end}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handlePreparePayroll} disabled={preparePayroll.isPending}>
                <Bot className="h-4 w-4 mr-2" />
                {t('workforce.payrollBatches.prepareWithAgent')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('workforce.payrollBatches.payrollHistory')}</CardTitle>
          <CardDescription>{t('workforce.payrollBatches.historyDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : batches && batches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workforce.payrollBatches.period')}</TableHead>
                  <TableHead>{t('workforce.payrollBatches.employees')}</TableHead>
                  <TableHead>{t('workforce.payrollBatches.totalHours')}</TableHead>
                  <TableHead>{t('workforce.payrollBatches.overtime')}</TableHead>
                  <TableHead>{t('workforce.payrollBatches.status')}</TableHead>
                  <TableHead>{t('workforce.payrollBatches.sourceCol')}</TableHead>
                  <TableHead className="text-right">{t('workforce.payrollBatches.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const summary = batch.summary_json;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">
                              {format(new Date(batch.period_start), "MMM d")} - {format(new Date(batch.period_end), "MMM d, yyyy")}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(batch.created_at), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {summary.employee_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>{summary.total_regular_hours?.toFixed(1) || 0}h</TableCell>
                      <TableCell>
                        {(summary.total_overtime_hours || 0) > 0 ? (
                          <Badge variant="outline">{summary.total_overtime_hours?.toFixed(1)}h OT</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        {batch.created_by_agent ? (
                          <Badge variant="outline" className="gap-1">
                            <Bot className="h-3 w-3" /> {t('workforce.payrollBatches.agent')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('workforce.payrollBatches.manual')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBatch(batch)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('workforce.payrollBatches.details')}
                          </Button>
                          {batch.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(batch.id, "pending_approval")}
                            >
                              {t('workforce.payrollBatches.submit')}
                            </Button>
                          )}
                          {batch.status === "pending_approval" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(batch.id, "approved")}
                            >
                              {t('workforce.payrollBatches.approve')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('workforce.payrollBatches.noBatches')}</p>
              <p className="text-sm text-muted-foreground">{t('workforce.payrollBatches.noBatchesDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Detail Dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{t('workforce.payrollBatches.batchDetails')}</DialogTitle>
            <DialogDescription>
              {selectedBatch && `${format(new Date(selectedBatch.period_start), "MMM d")} - ${format(new Date(selectedBatch.period_end), "MMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-2xl font-bold">{enhancedDetails.length || selectedBatch.summary_json.employee_count || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('workforce.payrollBatches.employees')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-2xl font-bold">
                      {enhancedDetails.length > 0
                        ? enhancedDetails.reduce((s, e) => s + e.regular_hours, 0).toFixed(1)
                        : selectedBatch.summary_json.total_regular_hours?.toFixed(1) || 0}h
                    </p>
                    <p className="text-xs text-muted-foreground">{t('workforce.payrollBatches.regularHours')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-2xl font-bold">
                      {enhancedDetails.length > 0
                        ? enhancedDetails.reduce((s, e) => s + e.overtime_hours, 0).toFixed(1)
                        : selectedBatch.summary_json.total_overtime_hours?.toFixed(1) || 0}h
                    </p>
                    <p className="text-xs text-muted-foreground">{t('workforce.payrollBatches.overtimeLabel')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-2xl font-bold">
                      {enhancedDetails.length > 0
                        ? enhancedDetails.reduce((s, e) => s + e.anomalies.length, 0)
                        : selectedBatch.summary_json.total_anomalies || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('workforce.payrollBatches.anomalies')}</p>
                  </CardContent>
                </Card>
              </div>

              <h4 className="font-medium mt-4">{t('workforce.payrollBatches.employeeBreakdown')}</h4>

              {detailsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <TooltipProvider>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{t('workforce.payrollBatches.employee')}</TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <Calendar className="h-3 w-3" />
                                <span>Worked</span>
                              </TooltipTrigger>
                              <TooltipContent>Total days worked</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Confirmed</span>
                              </TooltipTrigger>
                              <TooltipContent>Days backed by check-in &amp; check-out</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <Clock className="h-3 w-3" />
                                <span>Extra</span>
                              </TooltipTrigger>
                              <TooltipContent>Unscheduled check-ins (not on roster)</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <Palmtree className="h-3 w-3" />
                                <span>Vacation</span>
                              </TooltipTrigger>
                              <TooltipContent>Approved vacation days</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <Stethoscope className="h-3 w-3" />
                                <span>Medical</span>
                              </TooltipTrigger>
                              <TooltipContent>Approved medical/sick leave days</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Missing</span>
                              </TooltipTrigger>
                              <TooltipContent>Absent with no reason (no time-off request)</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                <Building2 className="h-3 w-3" />
                                <span>Other Loc.</span>
                              </TooltipTrigger>
                              <TooltipContent>Shifts worked at a different location</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center">{t('workforce.payrollBatches.regular')}</TableHead>
                          <TableHead className="text-center">{t('workforce.payrollBatches.overtime')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enhancedDetails.map((emp) => (
                          <TableRow key={emp.employee_id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{emp.employee_name}</span>
                                <span className="text-xs text-muted-foreground block">{emp.role}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{emp.days_worked}</TableCell>
                            <TableCell className="text-center">
                              {emp.days_confirmed > 0 ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                  {emp.days_confirmed}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.extra_schedule_days > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                      {emp.extra_schedule_days}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Extra check-ins:</p>
                                    {emp.extra_schedule_dates.map(d => (
                                      <p key={d} className="text-xs">{format(new Date(d), "MMM d")}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.vacation_days > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                  {emp.vacation_days}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.medical_days > 0 ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                  {emp.medical_days}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.missing_no_reason > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive">{emp.missing_no_reason}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Missing dates:</p>
                                    {emp.missing_no_reason_dates.map(d => (
                                      <p key={d} className="text-xs">{format(new Date(d), "MMM d")}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.extra_location_days > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                                      {emp.extra_location_days}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Other locations:</p>
                                    {emp.extra_location_details.map((d, i) => (
                                      <p key={i} className="text-xs">{format(new Date(d.date), "MMM d")} — {d.location_name}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{emp.regular_hours}h</TableCell>
                            <TableCell className="text-center">
                              {emp.overtime_hours > 0 ? (
                                <Badge variant="outline">{emp.overtime_hours}h</Badge>
                              ) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
