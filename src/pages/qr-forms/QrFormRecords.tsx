import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Download, Eye, Lock, Unlock, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function QrFormRecords() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("records");

  // Lock/Unlock mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "locked" | "submitted" }) => {
      const { error } = await supabase
        .from("form_submissions")
        .update({ status: newStatus } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      toast.success(newStatus === "locked" ? "Form locked" : "Form unlocked");
      if (selectedSubmission) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["form-submissions", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("form_submissions")
        .select(`
          *,
          form_templates(name, category, type),
          form_template_versions(version, schema),
          locations!form_submissions_location_id_fkey(name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch audit trail for selected submission
  const { data: auditTrail } = useQuery({
    queryKey: ["form-submission-audit", selectedSubmission?.id],
    queryFn: async () => {
      if (!selectedSubmission?.id) return [];
      const { data, error } = await supabase
        .from("form_submission_audit")
        .select("*")
        .eq("submission_id", selectedSubmission.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubmission?.id,
  });

  const filtered = submissions?.filter((s: any) => {
    const matchSearch =
      !search ||
      s.form_templates?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (s as any).locations?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openDetail = (sub: any) => {
    setSelectedSubmission(sub);
    setDetailOpen(true);
  };

  const exportPdf = (sub: any) => {
    const doc = new jsPDF();
    const schema = sub.form_template_versions?.schema as any;
    const data = sub.data as any;
    const templateName = sub.form_templates?.name || "Form";
    const locationName = (sub as any).locations?.name || "Unknown";
    const version = sub.form_template_versions?.version || 1;

    doc.setFontSize(16);
    doc.text(templateName, 14, 20);
    doc.setFontSize(10);
    doc.text(`Location: ${locationName}`, 14, 28);
    doc.text(`Version: ${version}`, 14, 34);

    if (sub.period_year && sub.period_month) {
      doc.text(`Period: ${sub.period_month}/${sub.period_year}`, 14, 40);
    }

    doc.text(`Status: ${sub.status}`, 14, 46);
    doc.text(`Submitted: ${sub.submitted_at ? format(new Date(sub.submitted_at), "PPpp") : "Draft"}`, 14, 52);

    let yPos = 60;

    if (sub.form_templates?.type === "monthly_grid" && schema?.gridConfig) {
      const checkpoints = schema.gridConfig.checkpoints || [];
      const cellFields = schema.gridConfig.cellFields || [];

      const headers = ["Day", ...checkpoints.flatMap((cp: any) =>
        cellFields.map((f: any) => `${cp.label}\n${f.label}`)
      )];

      const rows: any[][] = [];
      for (let day = 1; day <= 31; day++) {
        const row: any[] = [day.toString()];
        checkpoints.forEach((cp: any) => {
          cellFields.forEach((f: any) => {
            const val = data?.grid?.[day]?.[cp.time]?.[f.key];
            row.push(val ?? "");
          });
        });
        rows.push(row);
      }

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        theme: "grid",
        styles: { fontSize: 6, cellPadding: 1 },
        headStyles: { fillColor: [245, 130, 32] },
      });
    } else if (schema?.columns) {
      const headers = schema.columns.map((c: any) => c.label);
      const rows = (data?.rows || []).map((row: any) =>
        schema.columns.map((c: any) => row[c.key] ?? "")
      );

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 130, 32] },
      });
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.text(
      `Exported: ${format(new Date(), "PPpp")} | Submission ID: ${sub.id} | Template v${version}`,
      14,
      pageHeight - 10
    );

    doc.save(`${templateName.replace(/\s+/g, "-")}-${sub.id.slice(0, 8)}.pdf`);
    toast.success("PDF exported");
  };

  const renderSubmissionData = (sub: any) => {
    const schema = sub.form_template_versions?.schema as any;
    const data = sub.data as any;

    if (!schema || !data) return <p className="text-muted-foreground">No data</p>;

    if (sub.form_templates?.type === "monthly_grid" && schema.gridConfig) {
      const checkpoints = schema.gridConfig.checkpoints || [];
      const cellFields = schema.gridConfig.cellFields || [];

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Day</TableHead>
                {checkpoints.map((cp: any) =>
                  cellFields.map((f: any) => (
                    <TableHead key={`${cp.time}-${f.key}`} className="text-center text-xs">
                      {cp.label}
                      <br />
                      <span className="text-muted-foreground">{f.label}</span>
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <TableRow key={day}>
                  <TableCell className="font-medium">{day}</TableCell>
                  {checkpoints.map((cp: any) =>
                    cellFields.map((f: any) => (
                      <TableCell key={`${day}-${cp.time}-${f.key}`} className="text-center text-sm">
                        {data?.grid?.[day]?.[cp.time]?.[f.key] ?? "-"}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (schema.columns) {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                {schema.columns.map((col: any) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.rows || []).map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  {schema.columns.map((col: any) => (
                    <TableCell key={col.key}>{row[col.key] ?? "-"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Form Records
        </h1>
        <p className="text-muted-foreground mt-1">
          View, filter, and export completed form submissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="report" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Completion Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by template or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submissions List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !filtered?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No records found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Submissions will appear here once staff submit forms
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((sub: any) => (
                <Card key={sub.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {sub.form_templates?.name}
                        </span>
                        <Badge
                          variant={
                            sub.status === "submitted"
                              ? "default"
                              : sub.status === "locked"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {sub.status}
                        </Badge>
                        <Badge variant="outline">
                          v{sub.form_template_versions?.version}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{(sub as any).locations?.name}</span>
                        {sub.period_year && (
                          <span>
                            {sub.period_month}/{sub.period_year}
                          </span>
                        )}
                        <span>
                          {sub.submitted_at
                            ? format(new Date(sub.submitted_at), "MMM d, yyyy HH:mm")
                            : format(new Date(sub.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {sub.status === "submitted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLockMutation.mutate({ id: sub.id, newStatus: "locked" })}
                          disabled={toggleLockMutation.isPending}
                        >
                          <Lock className="h-4 w-4 mr-1" /> Lock
                        </Button>
                      )}
                      {sub.status === "locked" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLockMutation.mutate({ id: sub.id, newStatus: "submitted" })}
                          disabled={toggleLockMutation.isPending}
                        >
                          <Unlock className="h-4 w-4 mr-1" /> Unlock
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openDetail(sub)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => exportPdf(sub)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <CompletionReport companyId={company?.id} submissions={submissions || []} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission?.form_templates?.name} — Submission Detail
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <Badge>{selectedSubmission.status}</Badge>
                <span>
                  Location: {(selectedSubmission as any).locations?.name}
                </span>
                <span>Version: {selectedSubmission.form_template_versions?.version}</span>
                {selectedSubmission.period_year && (
                  <span>
                    Period: {selectedSubmission.period_month}/{selectedSubmission.period_year}
                  </span>
                )}
              </div>

              {renderSubmissionData(selectedSubmission)}

              {auditTrail && auditTrail.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Audit Trail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {auditTrail.map((entry: any) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-3 py-1">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.action}
                          </Badge>
                          {entry.path && (
                            <span className="text-muted-foreground font-mono">
                              {entry.path}
                            </span>
                          )}
                          <span className="text-muted-foreground ml-auto">
                            {format(new Date(entry.created_at), "MMM d HH:mm:ss")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                {selectedSubmission.status === "submitted" && (
                  <Button
                    variant="outline"
                    onClick={() => toggleLockMutation.mutate({ id: selectedSubmission.id, newStatus: "locked" })}
                    disabled={toggleLockMutation.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" /> Lock Form
                  </Button>
                )}
                {selectedSubmission.status === "locked" && (
                  <Button
                    variant="outline"
                    onClick={() => toggleLockMutation.mutate({ id: selectedSubmission.id, newStatus: "submitted" })}
                    disabled={toggleLockMutation.isPending}
                  >
                    <Unlock className="h-4 w-4 mr-2" /> Unlock Form
                  </Button>
                )}
                <Button onClick={() => exportPdf(selectedSubmission)}>
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Completion Report Component ────────────────────────────────────────────

function CompletionReport({ companyId, submissions }: { companyId?: string; submissions: any[] }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("all");

  // Get unique templates from submissions
  const templates = submissions.reduce((acc: any[], sub: any) => {
    if (sub.form_templates && !acc.find((t: any) => t.id === sub.template_id)) {
      acc.push({ id: sub.template_id, name: sub.form_templates.name, type: sub.form_templates.type });
    }
    return acc;
  }, []);

  // Filter submissions
  const filteredSubs = submissions.filter((s: any) =>
    selectedTemplateId === "all" || s.template_id === selectedTemplateId
  );

  const submissionIds = filteredSubs.map((s: any) => s.id);

  // Fetch audit trail for filtered submissions
  const { data: allAudits, isLoading: auditsLoading } = useQuery({
    queryKey: ["completion-report-audits", companyId, selectedTemplateId, submissionIds.join(",")],
    queryFn: async () => {
      if (!submissionIds.length) return [];
      const { data, error } = await supabase
        .from("form_submission_audit")
        .select("*")
        .in("submission_id", submissionIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: submissionIds.length > 0,
  });

  // Fetch employee names for actor_ids
  const actorIds = [...new Set((allAudits || []).map((a: any) => a.actor_id).filter(Boolean))];

  const { data: employees } = useQuery({
    queryKey: ["report-employees", actorIds.join(",")],
    queryFn: async () => {
      if (!actorIds.length) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      if (error) throw error;
      return data;
    },
    enabled: actorIds.length > 0,
  });

  const getEmployeeName = (userId: string) => {
    const emp = employees?.find((e: any) => e.user_id === userId);
    return emp?.full_name || userId.slice(0, 8);
  };

  // Build report data
  const reportRows: any[] = [];

  filteredSubs.forEach((sub: any) => {
    const schema = sub.form_template_versions?.schema as any;
    const data = sub.data as any;
    const locationName = (sub as any).locations?.name || "Unknown";
    const templateName = sub.form_templates?.name || "Unknown";
    const isMonthlyGrid = sub.form_templates?.type === "monthly_grid";

    if (isMonthlyGrid && schema?.gridConfig && data?.grid) {
      const checkpoints = schema.gridConfig.checkpoints || [];

      Object.entries(data.grid).forEach(([dayStr, dayData]: [string, any]) => {
        checkpoints.forEach((cp: any) => {
          const cellData = dayData?.[cp.time];
          if (cellData) {
            // Find audit entries for this cell
            const relevantAudits = (allAudits || []).filter((a: any) => {
              if (a.submission_id !== sub.id) return false;
              const newVal = a.new_value as any;
              return newVal?.grid?.[dayStr]?.[cp.time] !== undefined;
            });
            const lastAudit = relevantAudits[relevantAudits.length - 1];

            reportRows.push({
              templateName,
              locationName,
              period: `${sub.period_month}/${sub.period_year}`,
              day: parseInt(dayStr),
              checkpoint: cp.label || cp.time,
              initials: cellData.initials || "-",
              value: cellData.value ?? "-",
              completedBy: lastAudit ? getEmployeeName(lastAudit.actor_id) : "-",
              completedAt: lastAudit ? format(new Date(lastAudit.created_at), "MMM d, HH:mm") : "-",
              status: "✅",
            });
          } else {
            reportRows.push({
              templateName,
              locationName,
              period: `${sub.period_month}/${sub.period_year}`,
              day: parseInt(dayStr),
              checkpoint: cp.label || cp.time,
              initials: "-",
              value: "-",
              completedBy: "-",
              completedAt: "-",
              status: "❌",
            });
          }
        });
      });
    } else if (schema?.columns && data?.rows) {
      data.rows.forEach((row: any, idx: number) => {
        const relevantAudits = (allAudits || []).filter((a: any) => a.submission_id === sub.id);
        const lastAudit = relevantAudits[relevantAudits.length - 1];

        reportRows.push({
          templateName,
          locationName,
          period: `${sub.period_month}/${sub.period_year}`,
          day: idx + 1,
          checkpoint: `Entry #${idx + 1}`,
          initials: "-",
          value: Object.values(row).join(", "),
          completedBy: lastAudit ? getEmployeeName(lastAudit.actor_id) : "-",
          completedAt: lastAudit ? format(new Date(lastAudit.created_at), "MMM d, HH:mm") : "-",
          status: "✅",
        });
      });
    }
  });

  // Sort
  reportRows.sort((a, b) => {
    if (a.templateName !== b.templateName) return a.templateName.localeCompare(b.templateName);
    if (a.locationName !== b.locationName) return a.locationName.localeCompare(b.locationName);
    if (a.day !== b.day) return a.day - b.day;
    return a.checkpoint.localeCompare(b.checkpoint);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            {templates.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {reportRows.length} entries found
        </span>
      </div>

      {auditsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reportRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No completion data</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Completion data will appear once staff submit form entries
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Day</TableHead>
                    <TableHead>Checkpoint</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Initials</TableHead>
                    <TableHead>Completed By</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row, idx) => (
                    <TableRow key={idx} className={row.status === "❌" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm font-medium max-w-[150px] truncate">{row.templateName}</TableCell>
                      <TableCell className="text-sm">{row.locationName}</TableCell>
                      <TableCell className="text-sm">{row.period}</TableCell>
                      <TableCell className="text-center font-medium">{row.day}</TableCell>
                      <TableCell className="text-sm">{row.checkpoint}</TableCell>
                      <TableCell className="text-center">{row.status}</TableCell>
                      <TableCell className="text-sm">{row.value}</TableCell>
                      <TableCell className="text-sm">{row.initials}</TableCell>
                      <TableCell className="text-sm font-medium">{row.completedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.completedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
