import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvidencePacketViewer } from "@/components/evidence/EvidencePacketViewer";
import { EvidenceStatusBadge } from "@/components/evidence/EvidenceStatusBadge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Camera, Search, Filter, ShieldCheck, Loader2, User } from "lucide-react";
import type { EvidenceSubjectType, EvidenceStatus } from "@/hooks/useEvidencePackets";

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
  const [search, setSearch] = useState("");
  const [viewerPacket, setViewerPacket] = useState<EvidenceRow | null>(null);

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

        {/* Status summary chips */}
        <div className="flex flex-wrap gap-2">
          {["submitted", "approved", "rejected"].map((s) => (
            <Badge
              key={s}
              variant={statusFilter === s ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(s)}
            >
              {s}: {statusCounts[s] ?? 0}
            </Badge>
          ))}
        </div>
      </div>

      {/* Filters */}
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

                return (
                  <tr key={packet.id} className="hover:bg-muted/30 transition-colors">
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
