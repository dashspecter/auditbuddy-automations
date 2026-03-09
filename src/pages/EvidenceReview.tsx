import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { EvidencePacketViewer } from "@/components/evidence/EvidencePacketViewer";
import { EvidenceStatusBadge } from "@/components/evidence/EvidenceStatusBadge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, startOfWeek, isAfter } from "date-fns";
import { Camera, Search, Filter, ShieldCheck, Loader2, User, CheckCircle2, X, HelpCircle, ChevronDown, Info } from "lucide-react";
import { useBulkApproveEvidence } from "@/hooks/useEvidencePackets";
import type { EvidenceSubjectType, EvidenceStatus } from "@/hooks/useEvidencePackets";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceRow {
  id: string;
  subject_type: EvidenceSubjectType;
  subject_id: string;
  status: EvidenceStatus;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  redacted_at: string | null;
}

type DateFilter = "all" | "today" | "yesterday" | "this_week";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAllEvidencePackets(companyId: string | undefined) {
  return useQuery({
    queryKey: ["evidence_packets_all", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("evidence_packets")
        .select("id, subject_type, subject_id, status, created_at, created_by, notes, redacted_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as EvidenceRow[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

/** Fetch task titles for a set of task IDs */
function useTaskTitles(taskIds: string[]) {
  return useQuery({
    queryKey: ["task_titles_for_evidence", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const t of data ?? []) map[t.id] = t.title;
      return map;
    },
    enabled: taskIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

/** Fetch employee names for a set of user_ids (auth UIDs) */
function useEmployeeNames(companyId: string | undefined, userIds: string[]) {
  return useQuery({
    queryKey: ["employee_names_for_evidence", companyId, userIds],
    queryFn: async () => {
      if (!companyId || userIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from("employees")
        .select("user_id, full_name")
        .eq("company_id", companyId)
        .in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const e of data ?? []) {
        if (e.user_id) map[e.user_id] = e.full_name;
      }
      return map;
    },
    enabled: !!companyId && userIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

// ─── Date filter helper ───────────────────────────────────────────────────────

function matchesDateFilter(createdAt: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const date = new Date(createdAt);
  if (filter === "today") return isToday(date);
  if (filter === "yesterday") return isYesterday(date);
  if (filter === "this_week") return isAfter(date, startOfWeek(new Date(), { weekStartsOn: 1 }));
  return true;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvidenceReview() {
  const { company } = useCompanyContext();
  const { data: rolesData } = useUserRoles();

  const canReview = !!(
    rolesData?.isManager ||
    rolesData?.isAdmin ||
    rolesData?.companyRole === "company_owner" ||
    rolesData?.companyRole === "company_admin"
  );
  const canRedact = !!(rolesData?.isAdmin || rolesData?.companyRole === "company_owner");

  const [statusFilter, setStatusFilter] = useState("submitted");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [viewerPacket, setViewerPacket] = useState<EvidenceRow | null>(null);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bulkApprove = useBulkApproveEvidence();

  const { data: packets = [], isLoading } = useAllEvidencePackets(company?.id);

  // Derive unique task IDs and user IDs for secondary lookups
  const taskIds = useMemo(
    () => [...new Set(packets.filter((p) => p.subject_type === "task_occurrence").map((p) => p.subject_id))],
    [packets]
  );
  const userIds = useMemo(
    () => [...new Set(packets.map((p) => p.created_by).filter(Boolean) as string[])],
    [packets]
  );

  const { data: taskTitles = {} } = useTaskTitles(taskIds);
  const { data: employeeNames = {} } = useEmployeeNames(company?.id, userIds);

  const filtered = packets.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!matchesDateFilter(p.created_at, dateFilter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const taskTitle = (p.subject_type === "task_occurrence" ? taskTitles[p.subject_id] : "") ?? "";
    const submitter = p.created_by ? employeeNames[p.created_by] ?? "" : "";
    return (
      p.subject_type.toLowerCase().includes(q) ||
      taskTitle.toLowerCase().includes(q) ||
      submitter.toLowerCase().includes(q) ||
      (p.notes ?? "").toLowerCase().includes(q)
    );
  });

  const statusCounts = packets.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  // Selection helpers — only for "submitted" filter
  const isSelectionMode = statusFilter === "submitted" && canReview;
  const selectableIds = useMemo(
    () => (isSelectionMode ? filtered.map((p) => p.id) : []),
    [filtered, isSelectionMode]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  }, [allSelected, selectableIds]);

  // Clear selection when filters change
  const handleStatusFilter = (v: string) => {
    setStatusFilter(v);
    setSelected(new Set());
  };

  const handleDateFilter = (v: DateFilter) => {
    setDateFilter(v);
    setSelected(new Set());
  };

  const handleBulkApprove = async () => {
    setConfirmOpen(false);
    const ids = [...selected];
    try {
      const result = await bulkApprove.mutateAsync(ids);
      setSelected(new Set());
      if (result.failedIds.length === 0) {
        toast.success(`${result.successCount} packet${result.successCount !== 1 ? "s" : ""} approved`);
      } else {
        toast.warning(`${result.successCount} approved, ${result.failedIds.length} failed`);
      }
    } catch {
      toast.error("Bulk approve failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Evidence Review
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve proof-of-work submissions
          </p>
        </div>

        {/* Status summary chips with tooltips */}
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap gap-2">
            {([
              ["submitted", "Awaiting manager review. The task is completed but proof has not been verified yet."],
              ["approved", "Proof accepted by a manager. The task completion is confirmed."],
              ["rejected", "Proof was rejected. The task was reset to pending and the employee was notified to resubmit."],
            ] as [string, string][]).map(([s, tip]) => (
              <Tooltip key={s}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={statusFilter === s ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleStatusFilter(s)}
                  >
                    {s}: {statusCounts[s] ?? 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Collapsible help banner */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>How does evidence review work?</span>
            <ChevronDown className="h-3 w-3 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
              <p><strong className="text-foreground">Submitted</strong> — The employee completed the task and uploaded proof. It's waiting for your review.</p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
              <p><strong className="text-foreground">Approved</strong> — You accepted the proof. The task stays marked as completed and counts towards the employee's score.</p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
              <p><strong className="text-foreground">Rejected</strong> — The proof was not adequate. The task resets to pending, the employee is notified, and it won't count until they resubmit valid proof.</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by task name, submitter, or notes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date quick-filters */}
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "All dates"],
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["this_week", "This week"],
          ] as [DateFilter, string][]).map(([value, label]) => (
            <Badge
              key={value}
              variant={dateFilter === value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleDateFilter(value)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Camera className="h-10 w-10 opacity-30" />
          <p className="text-sm">No evidence packets found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {isSelectionMode && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task / Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted by</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((packet) => {
                const taskTitle =
                  packet.subject_type === "task_occurrence"
                    ? taskTitles[packet.subject_id]
                    : null;
                const submitter = packet.created_by
                  ? employeeNames[packet.created_by]
                  : null;
                const isChecked = selected.has(packet.id);

                return (
                  <tr
                    key={packet.id}
                    className={`hover:bg-muted/30 transition-colors ${isChecked ? "bg-primary/5" : ""}`}
                  >
                    {isSelectionMode && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(packet.id)}
                          aria-label={`Select ${taskTitle ?? packet.subject_type}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {taskTitle ?? packet.subject_type.replace(/_/g, " ")}
                        </span>
                        {taskTitle && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {packet.subject_type.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {submitter ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          {submitter}
                        </span>
                      ) : (
                        <span className="text-muted-foreground opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EvidenceStatusBadge status={packet.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(packet.created_at), "MMM d, h:mm a")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">
                      {packet.notes ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setViewerPacket(packet)}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk action bar */}
      <StickyActionBar show={selected.size > 0}>
        <div className="flex items-center justify-between w-full gap-3">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmOpen(true)}
              disabled={bulkApprove.isPending}
            >
              {bulkApprove.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Bulk Approve
            </Button>
          </div>
        </div>
      </StickyActionBar>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {selected.size} evidence packet{selected.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This will mark all selected submissions as approved. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleBulkApprove}
              disabled={bulkApprove.isPending}
            >
              {bulkApprove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Approve {selected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence viewer dialog */}
      {viewerPacket && (
        <EvidencePacketViewer
          open={!!viewerPacket}
          onClose={() => setViewerPacket(null)}
          subjectType={viewerPacket.subject_type}
          subjectId={viewerPacket.subject_id}
          canReview={canReview}
          canRedact={canRedact}
        />
      )}
    </div>
  );
}
