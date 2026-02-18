import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useLocations } from "@/hooks/useLocations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  FileDown, ShieldCheck, ClipboardCheck, ListTodo, GraduationCap,
  CheckCircle2, XCircle, Clock, Loader2, Building2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DossierData {
  tasks: {
    total: number;
    completed: number;
    withEvidence: number;
    items: Array<{ title: string; date: string; completedBy: string; evidenceStatus: string }>;
  };
  audits: {
    total: number;
    avgScore: number;
    withEvidence: number;
    items: Array<{ name: string; date: string; score: number | null; status: string; evidenceStatus: string }>;
  };
  qrForms: {
    total: number;
    submitted: number;
    locked: number;
    items: Array<{ template: string; date: string; status: string; submittedBy: string }>;
  };
  training: {
    total: number;
    completed: number;
    items: Array<{ staff: string; module: string; status: string; startDate: string }>;
  };
}

// ─── Month options ────────────────────────────────────────────────────────────

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: format(d, "MMMM yyyy"),
      value: format(d, "yyyy-MM"),
    });
  }
  return options;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useDossierData(companyId: string | undefined, locationId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["compliance_dossier", companyId, locationId, month],
    enabled: !!companyId && !!locationId && !!month,
    queryFn: async (): Promise<DossierData> => {
      const [year, m] = month.split("-").map(Number);
      const from = startOfMonth(new Date(year, m - 1)).toISOString();
      const to = endOfMonth(new Date(year, m - 1)).toISOString();

      // ── 1. Task completions ──────────────────────────────────────────────
      const { data: completions } = await supabase
        .from("task_completions")
        .select(`
          id, task_id, occurrence_date, completed_at, completion_mode,
          task:tasks(title, company_id),
          employee:employees!task_completions_completed_by_employee_id_fkey(full_name)
        `)
        .gte("completed_at", from)
        .lte("completed_at", to)
        .eq("task:tasks.company_id", companyId!);

      // ── 2. Evidence packets for tasks ───────────────────────────────────
      const taskIds = (completions ?? []).map((c: any) => c.task_id).filter(Boolean);
      let taskEvidenceMap: Record<string, string> = {};
      if (taskIds.length > 0) {
        const { data: taskEvidence } = await supabase
          .from("evidence_packets")
          .select("subject_id, status")
          .eq("subject_type", "task_occurrence")
          .eq("company_id", companyId!)
          .gte("created_at", from)
          .lte("created_at", to);
        (taskEvidence ?? []).forEach((e: any) => { taskEvidenceMap[e.subject_id] = e.status; });
      }

      const taskItems = (completions ?? []).map((c: any) => ({
        title: c.task?.title ?? "Unknown",
        date: c.occurrence_date ?? c.completed_at?.slice(0, 10) ?? "",
        completedBy: c.employee?.full_name ?? "—",
        evidenceStatus: taskEvidenceMap[c.task_id] ?? "none",
      }));

      // ── 3. Audits ────────────────────────────────────────────────────────
      const { data: audits } = await supabase
        .from("location_audits")
        .select(`
          id, status, total_score, audit_date, created_at,
          template:audit_templates(name),
          auditor:employees!location_audits_user_id_fkey(full_name)
        `)
        .eq("company_id", companyId!)
        .eq("location_id", locationId!)
        .gte("created_at", from)
        .lte("created_at", to);

      const auditIds = (audits ?? []).map((a: any) => a.id);
      let auditEvidenceMap: Record<string, string> = {};
      if (auditIds.length > 0) {
        const { data: auditEvidence } = await supabase
          .from("evidence_packets")
          .select("subject_id, status")
          .eq("subject_type", "audit_item")
          .eq("company_id", companyId!)
          .in("subject_id", auditIds);
        (auditEvidence ?? []).forEach((e: any) => { auditEvidenceMap[e.subject_id] = e.status; });
      }

      const auditItems = (audits ?? []).map((a: any) => ({
        name: a.template?.name ?? "Unknown",
        date: a.audit_date ?? a.created_at?.slice(0, 10) ?? "",
        score: a.total_score,
        status: a.status ?? "—",
        evidenceStatus: auditEvidenceMap[a.id] ?? "none",
      }));

      const scores = auditItems.map(a => a.score).filter((s): s is number => s !== null);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // ── 4. QR form submissions ───────────────────────────────────────────
      const { data: submissions } = await supabase
        .from("form_submissions")
        .select(`
          id, status, created_at, submitted_at,
          template:form_templates(name),
          submitter:employees!form_submissions_submitted_by_fkey(full_name)
        `)
        .eq("company_id", companyId!)
        .eq("location_id", locationId!)
        .gte("created_at", from)
        .lte("created_at", to);

      const qrItems = (submissions ?? []).map((s: any) => ({
        template: s.template?.name ?? "Unknown",
        date: s.submitted_at?.slice(0, 10) ?? s.created_at?.slice(0, 10) ?? "",
        status: s.status ?? "submitted",
        submittedBy: s.submitter?.full_name ?? "—",
      }));

      // ── 5. Training assignments ──────────────────────────────────────────
      const { data: trainingAssignments } = await supabase
        .from("training_assignments")
        .select(`
          id, status, start_date,
          trainee:employees!training_assignments_trainee_employee_id_fkey(full_name),
          module:training_programs!training_assignments_module_id_fkey(name)
        `)
        .eq("company_id", companyId!)
        .eq("location_id", locationId!)
        .gte("start_date", from.slice(0, 10))
        .lte("start_date", to.slice(0, 10));

      const trainingItems = (trainingAssignments ?? []).map((t: any) => ({
        staff: t.trainee?.full_name ?? "—",
        module: t.module?.name ?? "Unknown",
        status: t.status ?? "planned",
        startDate: t.start_date ?? "",
      }));

      return {
        tasks: {
          total: taskItems.length,
          completed: taskItems.length,
          withEvidence: taskItems.filter(t => t.evidenceStatus !== "none").length,
          items: taskItems,
        },
        audits: {
          total: auditItems.length,
          avgScore,
          withEvidence: auditItems.filter(a => a.evidenceStatus !== "none").length,
          items: auditItems,
        },
        qrForms: {
          total: qrItems.length,
          submitted: qrItems.filter(q => q.status === "submitted").length,
          locked: qrItems.filter(q => q.status === "locked").length,
          items: qrItems,
        },
        training: {
          total: trainingItems.length,
          completed: trainingItems.filter(t => t.status === "completed").length,
          items: trainingItems,
        },
      };
    },
    staleTime: 60_000,
  });
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportPDF(data: DossierData, locationName: string, monthLabel: string, companyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const orange = [234, 88, 12] as [number, number, number];
  const w = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...orange);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Compliance Dossier", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${companyName} · ${locationName} · ${monthLabel}`, 14, 20);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, w - 14, 20, { align: "right" });

  let y = 36;

  const addSection = (title: string, rows: string[][], head: string[]) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y - 4, w - 28, 8, "F");
    doc.setTextColor(...orange);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 16, y + 1);
    y += 8;

    if (rows.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("No data for this period.", 16, y + 4);
      y += 12;
      return;
    }

    autoTable(doc, {
      startY: y,
      head: [head],
      body: rows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: orange, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 248, 245] },
      didDrawPage: () => {},
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  // Summary stats band
  doc.setFillColor(252, 248, 245);
  doc.rect(14, y, w - 28, 22, "F");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const stats = [
    [`Tasks`, `${data.tasks.completed} completions`],
    [`Audits`, `${data.audits.total} · Avg ${data.audits.avgScore}%`],
    [`QR Forms`, `${data.qrForms.submitted} submitted`],
    [`Training`, `${data.training.completed}/${data.training.total} completed`],
  ];
  const colW = (w - 28) / 4;
  stats.forEach(([label, val], i) => {
    const x = 14 + i * colW + colW / 2;
    doc.text(label, x, y + 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(val, x, y + 14, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
  });
  y += 28;

  // Tasks
  addSection(
    `Tasks & Evidence  (${data.tasks.completed} completions, ${data.tasks.withEvidence} with proof)`,
    data.tasks.items.map(t => [t.date, t.title, t.completedBy, t.evidenceStatus]),
    ["Date", "Task", "Completed By", "Evidence"]
  );

  // Audits
  addSection(
    `Audits & Proof  (${data.audits.total} audits, avg score ${data.audits.avgScore}%)`,
    data.audits.items.map(a => [a.date, a.name, a.score !== null ? `${a.score}%` : "—", a.status, a.evidenceStatus]),
    ["Date", "Audit", "Score", "Status", "Evidence"]
  );

  // QR Forms
  addSection(
    `QR Form Submissions  (${data.qrForms.total} total)`,
    data.qrForms.items.map(q => [q.date, q.template, q.status, q.submittedBy]),
    ["Date", "Template", "Status", "Submitted By"]
  );

  // Training
  addSection(
    `Training Signoffs  (${data.training.completed}/${data.training.total} completed)`,
    data.training.items.map(t => [t.startDate, t.staff, t.module, t.status]),
    ["Start Date", "Staff", "Module", "Status"]
  );

  // Footer
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Page ${i} of ${pages}  ·  Dashspect Compliance Dossier`, w / 2, 290, { align: "center" });
  }

  doc.save(`Compliance-Dossier-${locationName.replace(/\s+/g, "-")}-${monthLabel.replace(/\s+/g, "-")}.pdf`);
}

// ─── Evidence badge ───────────────────────────────────────────────────────────

function EvidencePill({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Approved</Badge>;
  if (status === "submitted") return <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Submitted</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Rejected</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">No proof</Badge>;
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    approved: "bg-green-100 text-green-700",
    submitted: "bg-blue-100 text-blue-700",
    locked: "bg-purple-100 text-purple-700",
    active: "bg-orange-100 text-orange-700",
    planned: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
    in_progress: "bg-yellow-100 text-yellow-700",
  };
  return (
    <Badge className={`border-0 text-[10px] capitalize ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, meta, children,
}: { icon: any; title: string; meta: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{meta}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceDossier() {
  const { company } = useCompanyContext();
  const { data: locations = [] } = useLocations();
  const monthOptions = getMonthOptions();

  const [locationId, setLocationId] = useState<string>("");
  const [month, setMonth] = useState<string>(monthOptions[0].value);
  const [generated, setGenerated] = useState(false);

  const { data, isLoading } = useDossierData(
    generated ? company?.id : undefined,
    generated ? locationId : undefined,
    month
  );

  const selectedLocation = locations.find(l => l.id === locationId);
  const monthLabel = monthOptions.find(o => o.value === month)?.label ?? month;

  const handleGenerate = () => {
    if (!locationId) return;
    setGenerated(true);
  };

  // Reset when filters change
  const handleLocationChange = (v: string) => { setLocationId(v); setGenerated(false); };
  const handleMonthChange = (v: string) => { setMonth(v); setGenerated(false); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Compliance Dossier
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consolidated compliance report — tasks, audits, QR forms & training
          </p>
        </div>

        {data && generated && (
          <Button
            onClick={() => exportPDF(data, selectedLocation?.name ?? "Location", monthLabel, company?.name ?? "Company")}
            className="gap-2 shrink-0"
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Select value={locationId} onValueChange={handleLocationChange}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select location…" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Month</label>
              <Select value={month} onValueChange={handleMonthChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!locationId} className="shrink-0">
              Generate Dossier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Building dossier…</span>
        </div>
      )}

      {/* Not generated yet */}
      {!generated && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ShieldCheck className="h-12 w-12 opacity-20" />
          <p className="text-sm">Select a location and month, then click Generate Dossier</p>
        </div>
      )}

      {/* Results */}
      {data && generated && !isLoading && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Task Completions", value: data.tasks.completed, sub: `${data.tasks.withEvidence} with proof`, icon: ListTodo },
              { label: "Audits", value: data.audits.total, sub: `Avg score ${data.audits.avgScore}%`, icon: ClipboardCheck },
              { label: "QR Submissions", value: data.qrForms.total, sub: `${data.qrForms.locked} locked`, icon: ShieldCheck },
              { label: "Training", value: `${data.training.completed}/${data.training.total}`, sub: "completed", icon: GraduationCap },
            ].map(({ label, value, sub, icon: Icon }) => (
              <Card key={label} className="text-center">
                <CardContent className="pt-4 pb-3">
                  <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tasks */}
          <Section icon={ListTodo} title="Tasks & Evidence" meta={`${data.tasks.completed} completions · ${data.tasks.withEvidence} with proof`}>
            {data.tasks.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No task completions this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Task</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Completed By</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Proof</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {data.tasks.items.map((t, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{t.date}</td>
                        <td className="py-2 pr-3 font-medium">{t.title}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{t.completedBy}</td>
                        <td className="py-2"><EvidencePill status={t.evidenceStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Audits */}
          <Section icon={ClipboardCheck} title="Audits & Proof" meta={`${data.audits.total} audits · avg ${data.audits.avgScore}%`}>
            {data.audits.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No audits this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Audit</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Proof</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {data.audits.items.map((a, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{a.date}</td>
                        <td className="py-2 pr-3 font-medium">{a.name}</td>
                        <td className="py-2 pr-3">
                          {a.score !== null ? (
                            <span className={`font-semibold ${a.score >= 80 ? "text-green-600" : a.score >= 60 ? "text-orange-500" : "text-red-500"}`}>
                              {a.score}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-3"><StatusPill status={a.status} /></td>
                        <td className="py-2"><EvidencePill status={a.evidenceStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* QR Forms */}
          <Section icon={ShieldCheck} title="QR Form Submissions" meta={`${data.qrForms.total} total · ${data.qrForms.locked} locked`}>
            {data.qrForms.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No QR form submissions this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Template</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Submitted By</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {data.qrForms.items.map((q, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{q.date}</td>
                        <td className="py-2 pr-3 font-medium">{q.template}</td>
                        <td className="py-2 pr-3"><StatusPill status={q.status} /></td>
                        <td className="py-2 text-muted-foreground">{q.submittedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Training */}
          <Section icon={GraduationCap} title="Training Signoffs" meta={`${data.training.completed}/${data.training.total} completed`}>
            {data.training.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No training assignments this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Start Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Staff</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Module</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {data.training.items.map((t, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{t.startDate}</td>
                        <td className="py-2 pr-3 font-medium">{t.staff}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{t.module}</td>
                        <td className="py-2"><StatusPill status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
