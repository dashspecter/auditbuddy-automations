import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Download, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function QrFormRecords() {
  const { data: company } = useCompany();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

    // Header
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
      // Monthly grid PDF
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
      // Event log PDF
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

    // Footer
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

              {/* Data */}
              {renderSubmissionData(selectedSubmission)}

              {/* Audit Trail */}
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

              <div className="flex justify-end">
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
