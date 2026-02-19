import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CASeverity = "low" | "medium" | "high" | "critical";
export type CAStatus = "open" | "in_progress" | "pending_verification" | "closed" | "reopened" | "cancelled";
export type CAItemStatus = "open" | "in_progress" | "done" | "verified" | "rejected";
export type CASourceType = "audit_item_result" | "incident" | "asset_downtime" | "manual" | "test_submission";

export interface CorrectiveAction {
  id: string;
  company_id: string;
  location_id: string;
  source_type: CASourceType;
  source_id: string;
  title: string;
  description: string | null;
  severity: CASeverity;
  status: CAStatus;
  owner_user_id: string | null;
  owner_role: string | null;
  due_at: string;
  requires_approval: boolean;
  approval_role: string | null;
  approved_by: string | null;
  approved_at: string | null;
  closed_at: string | null;
  stop_the_line: boolean;
  stop_released_by: string | null;
  stop_released_at: string | null;
  stop_release_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  locations?: { name: string };
  items?: CorrectiveActionItem[];
  events?: CorrectiveActionEvent[];
}

export interface CorrectiveActionItem {
  id: string;
  company_id: string;
  corrective_action_id: string;
  title: string;
  instructions: string | null;
  assignee_user_id: string | null;
  assignee_role: string | null;
  due_at: string;
  status: CAItemStatus;
  evidence_required: boolean;
  evidence_packet_id: string | null;
  completed_by: string | null;
  completed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
}

export interface CorrectiveActionEvent {
  id: string;
  company_id: string;
  corrective_action_id: string;
  actor_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface CorrectiveActionRule {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  trigger_type: "audit_fail" | "incident_repeat" | "asset_downtime_pattern" | "test_fail";
  trigger_config: Record<string, unknown>;
  created_at: string;
}

export interface LocationRiskState {
  company_id: string;
  location_id: string;
  is_restricted: boolean;
  restricted_reason: string | null;
  restricted_ca_id: string | null;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCompanyId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (data?.company_id) return data.company_id;

  const { data: emp } = await supabase
    .from("employees")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return emp?.company_id ?? null;
}

async function logEvent(
  companyId: string,
  caId: string,
  actorId: string,
  eventType: string,
  payload?: Record<string, unknown>
) {
  await supabase.from("corrective_action_events").insert({
    company_id: companyId,
    corrective_action_id: caId,
    actor_id: actorId,
    event_type: eventType,
    payload: (payload ?? null) as import("@/integrations/supabase/types").Json,
  });
}

// ─── SLA helper ───────────────────────────────────────────────────────────────

export function getSLAPercent(createdAt: string, dueAt: string): number {
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const end = new Date(dueAt).getTime();
  if (end <= start) return 100;
  return Math.min(100, Math.round(((now - start) / (end - start)) * 100));
}

export function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date();
}

// ─── List hooks ───────────────────────────────────────────────────────────────

export interface CAFilters {
  locationId?: string;
  status?: CAStatus | "all";
  severity?: CASeverity | "all";
}

export function useCorrectiveActions(filters?: CAFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["corrective_actions", filters],
    enabled: !!user?.id,
    queryFn: async (): Promise<CorrectiveAction[]> => {
      const companyId = await getCompanyId(user!.id);
      if (!companyId) return [];

      let q = supabase
        .from("corrective_actions")
        .select("*, locations(name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (filters?.locationId && filters.locationId !== "all") {
        q = q.eq("location_id", filters.locationId);
      }
      if (filters?.status && filters.status !== "all") {
        q = q.eq("status", filters.status);
      }
      if (filters?.severity && filters.severity !== "all") {
        q = q.eq("severity", filters.severity);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CorrectiveAction[];
    },
    staleTime: 30_000,
  });
}

export function useCorrectiveAction(id: string | undefined) {
  return useQuery({
    queryKey: ["corrective_action", id],
    enabled: !!id,
    queryFn: async (): Promise<CorrectiveAction | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("corrective_actions")
        .select(`
          *,
          locations(name),
          items:corrective_action_items(*),
          events:corrective_action_events(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CorrectiveAction | null;
    },
    staleTime: 15_000,
  });
}

// ─── Create CA ────────────────────────────────────────────────────────────────

export interface BundleItemArgs {
  title: string;
  instructions?: string;
  assigneeRole?: string; // e.g. "store_manager", "area_manager", "admin"
  dueAt: string;
  evidenceRequired?: boolean;
}

export interface CreateCAArgs {
  locationId: string;
  sourceType: CASourceType;
  sourceId: string;
  title: string;
  description?: string;
  severity: CASeverity;
  dueAt: string;
  ownerUserId?: string;
  requiresApproval?: boolean;
  approvalRole?: string;
  stopTheLine?: boolean;
  bundleItems?: BundleItemArgs[];
}

export function useCreateCorrectiveAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateCAArgs): Promise<string> => {
      if (!user?.id) throw new Error("Not authenticated");
      const companyId = await getCompanyId(user.id);
      if (!companyId) throw new Error("No company found");

      // Insert CA
      const { data: ca, error: caErr } = await supabase
        .from("corrective_actions")
        .insert({
          company_id: companyId,
          location_id: args.locationId,
          source_type: args.sourceType,
          source_id: args.sourceId,
          title: args.title,
          description: args.description ?? null,
          severity: args.severity,
          due_at: args.dueAt,
          owner_user_id: args.ownerUserId ?? null,
          requires_approval: args.requiresApproval ?? false,
          approval_role: args.approvalRole ?? null,
          stop_the_line: args.stopTheLine ?? false,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (caErr || !ca) throw caErr ?? new Error("Failed to create CA");

      // If stop_the_line, set location_risk_state
      if (args.stopTheLine) {
        await supabase.from("location_risk_state").upsert({
          company_id: companyId,
          location_id: args.locationId,
          is_restricted: true,
          restricted_reason: args.title,
          restricted_ca_id: ca.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id,location_id" });
      }

      // Insert bundle items — resolve role to user at the location
      if (args.bundleItems?.length) {
        // Build a role→user_id map for this location so we can auto-assign
        const roleUserMap: Record<string, string> = {};
        const rolesToResolve = [...new Set(args.bundleItems.map(i => i.assigneeRole).filter(Boolean))] as string[];
        if (rolesToResolve.length > 0) {
          // company_role values in company_users (admin, manager…)
          const { data: companyUserRows } = await supabase
            .from("company_users")
            .select("user_id, company_role")
            .eq("company_id", companyId)
            .in("company_role", rolesToResolve);
          (companyUserRows ?? []).forEach(r => {
            if (!roleUserMap[r.company_role]) roleUserMap[r.company_role] = r.user_id;
          });

          // Also check employees table for location-specific roles
          const { data: empRows } = await supabase
            .from("employees")
            .select("user_id, role")
            .eq("company_id", companyId)
            .eq("location_id", args.locationId)
            .in("role", rolesToResolve);
          (empRows ?? []).forEach(r => {
            if (r.role && !roleUserMap[r.role]) roleUserMap[r.role] = r.user_id;
          });
        }

        const items = args.bundleItems.map(item => ({
          company_id: companyId,
          corrective_action_id: ca.id,
          title: item.title,
          instructions: item.instructions ?? null,
          assignee_user_id: (item.assigneeRole ? roleUserMap[item.assigneeRole] ?? null : null),
          assignee_role: item.assigneeRole ?? null,
          due_at: item.dueAt,
          evidence_required: item.evidenceRequired ?? false,
        }));
        const { error: itemErr } = await supabase.from("corrective_action_items").insert(items);
        if (itemErr) throw itemErr;
      }

      // Log created event
      await logEvent(companyId, ca.id, user.id, "created", {
        severity: args.severity,
        source_type: args.sourceType,
        source_id: args.sourceId,
        item_count: args.bundleItems?.length ?? 0,
      });

      return ca.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corrective_actions"] });
      queryClient.invalidateQueries({ queryKey: ["location_risk_state"] });
    },
  });
}

// ─── Update status ────────────────────────────────────────────────────────────

export interface UpdateCAStatusArgs {
  id: string;
  status: CAStatus;
  companyId: string;
  reason?: string;
}

export function useUpdateCAStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdateCAStatusArgs) => {
      if (!user?.id) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = { status: args.status };
      if (args.status === "closed") updates.closed_at = new Date().toISOString();
      if (args.status === "closed" && args.reason) updates.review_reason = args.reason;

      const { error } = await supabase
        .from("corrective_actions")
        .update(updates)
        .eq("id", args.id);
      if (error) throw error;

      await logEvent(args.companyId, args.id, user.id, "status_changed", {
        to_status: args.status,
        reason: args.reason ?? null,
      });
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["corrective_action", args.id] });
      queryClient.invalidateQueries({ queryKey: ["corrective_actions"] });
    },
  });
}

// ─── Complete action item ─────────────────────────────────────────────────────

export interface CompleteItemArgs {
  item: CorrectiveActionItem;
  evidencePacketId?: string;
  companyId: string;
}

export function useCompleteActionItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CompleteItemArgs) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (args.item.evidence_required && !args.evidencePacketId) {
        throw new Error("Evidence packet required before marking done");
      }

      const { error } = await supabase
        .from("corrective_action_items")
        .update({
          status: "done",
          completed_by: user.id,
          completed_at: new Date().toISOString(),
          evidence_packet_id: args.evidencePacketId ?? null,
        })
        .eq("id", args.item.id);
      if (error) throw error;

      await logEvent(args.companyId, args.item.corrective_action_id, user.id, "item_completed", {
        item_id: args.item.id,
        item_title: args.item.title,
        has_evidence: !!args.evidencePacketId,
      });
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["corrective_action", args.item.corrective_action_id] });
    },
  });
}

// ─── Verify action item ───────────────────────────────────────────────────────

export interface VerifyItemArgs {
  item: CorrectiveActionItem;
  action: "verified" | "rejected";
  notes?: string;
  companyId: string;
}

export function useVerifyActionItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: VerifyItemArgs) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("corrective_action_items")
        .update({
          status: args.action,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_notes: args.notes ?? null,
        })
        .eq("id", args.item.id);
      if (error) throw error;

      await logEvent(args.companyId, args.item.corrective_action_id, user.id,
        args.action === "verified" ? "item_verified" : "item_rejected",
        {
          item_id: args.item.id,
          item_title: args.item.title,
          notes: args.notes ?? null,
        }
      );
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["corrective_action", args.item.corrective_action_id] });
    },
  });
}

// ─── Release stop-the-line ────────────────────────────────────────────────────

export interface ReleaseSTLArgs {
  caId: string;
  companyId: string;
  locationId: string;
  reason: string;
}

export function useReleaseStopTheLine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ReleaseSTLArgs) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Update CA
      await supabase.from("corrective_actions").update({
        stop_released_by: user.id,
        stop_released_at: new Date().toISOString(),
        stop_release_reason: args.reason,
      }).eq("id", args.caId);

      // Update location risk state
      await supabase.from("location_risk_state").upsert({
        company_id: args.companyId,
        location_id: args.locationId,
        is_restricted: false,
        restricted_reason: null,
        restricted_ca_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,location_id" });

      await logEvent(args.companyId, args.caId, user.id, "stop_released", {
        reason: args.reason,
      });
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["corrective_action", args.caId] });
      queryClient.invalidateQueries({ queryKey: ["corrective_actions"] });
      queryClient.invalidateQueries({ queryKey: ["location_risk_state"] });
    },
  });
}

// ─── Location risk state ──────────────────────────────────────────────────────

export function useLocationRiskState(locationId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["location_risk_state", locationId],
    enabled: !!locationId && !!user?.id,
    queryFn: async (): Promise<LocationRiskState | null> => {
      if (!locationId) return null;
      const companyId = await getCompanyId(user!.id);
      if (!companyId) return null;

      const { data } = await supabase
        .from("location_risk_state")
        .select("*")
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .maybeSingle();
      return data as LocationRiskState | null;
    },
    staleTime: 30_000,
  });
}

export function useAllLocationRiskStates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["location_risk_state_all"],
    enabled: !!user?.id,
    queryFn: async (): Promise<LocationRiskState[]> => {
      const companyId = await getCompanyId(user!.id);
      if (!companyId) return [];
      const { data } = await supabase
        .from("location_risk_state")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_restricted", true);
      return (data ?? []) as LocationRiskState[];
    },
    staleTime: 30_000,
  });
}

// ─── CA Rules ─────────────────────────────────────────────────────────────────

export function useCorrectiveActionRules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["corrective_action_rules"],
    enabled: !!user?.id,
    queryFn: async (): Promise<CorrectiveActionRule[]> => {
      const companyId = await getCompanyId(user!.id);
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("corrective_action_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CorrectiveActionRule[];
    },
    staleTime: 60_000,
  });
}

export function useCreateCARule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: Omit<CorrectiveActionRule, "id" | "created_at" | "company_id">) => {
      if (!user?.id) throw new Error("Not authenticated");
      const companyId = await getCompanyId(user.id);
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("corrective_action_rules").insert({
        name: args.name,
        enabled: args.enabled,
        trigger_type: args.trigger_type,
        trigger_config: args.trigger_config as import("@/integrations/supabase/types").Json,
        company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corrective_action_rules"] }),
  });
}

export function useUpdateCARule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trigger_config, ...updates }: Partial<CorrectiveActionRule> & { id: string }) => {
      const { error } = await supabase.from("corrective_action_rules").update({
        ...updates,
        ...(trigger_config !== undefined
          ? { trigger_config: trigger_config as import("@/integrations/supabase/types").Json }
          : {}),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corrective_action_rules"] }),
  });
}

export function useDeleteCARule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("corrective_action_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corrective_action_rules"] }),
  });
}

// ─── Approve & Close ──────────────────────────────────────────────────────────

export interface ApproveCAAArgs {
  caId: string;
  companyId: string;
}

export function useApproveAndCloseCA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ApproveCAAArgs) => {
      if (!user?.id) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("corrective_actions")
        .update({
          status: "closed",
          approved_by: user.id,
          approved_at: now,
          closed_at: now,
        })
        .eq("id", args.caId);
      if (error) throw error;
      await logEvent(args.companyId, args.caId, user.id, "approved", {});
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["corrective_action", args.caId] });
      queryClient.invalidateQueries({ queryKey: ["corrective_actions"] });
    },
  });
}

// ─── Check if CA exists for a source ─────────────────────────────────────────

export function useCAForSource(sourceType: CASourceType, sourceId: string | undefined) {
  return useQuery({
    queryKey: ["ca_for_source", sourceType, sourceId],
    enabled: !!sourceId,
    queryFn: async (): Promise<CorrectiveAction | null> => {
      if (!sourceId) return null;
      const { data } = await supabase
        .from("corrective_actions")
        .select("id, status, title")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as CorrectiveAction | null;
    },
    staleTime: 30_000,
  });
}
