import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageCompression";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvidenceSubjectType =
  | "task_occurrence"
  | "audit_item"
  | "work_order"
  | "incident"
  | "training_signoff";

export type EvidenceStatus = "draft" | "submitted" | "approved" | "rejected";

export interface EvidencePolicy {
  id: string;
  company_id: string;
  location_id: string | null;
  applies_to: string;
  applies_id: string;
  evidence_required: boolean;
  review_required: boolean;
  required_media_types: string[] | null;
  min_media_count: number;
  instructions: string | null;
}

export interface EvidenceMedia {
  id: string;
  packet_id: string;
  storage_path: string;
  media_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface EvidenceEvent {
  id: string;
  packet_id: string;
  actor_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface EvidencePacket {
  id: string;
  company_id: string;
  location_id: string;
  subject_type: EvidenceSubjectType;
  subject_id: string;
  status: EvidenceStatus;
  version: number;
  created_by: string;
  notes: string | null;
  review_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  submitted_at: string | null;
  redacted_at: string | null;
  media?: EvidenceMedia[];
  events?: EvidenceEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCompanyAndLocation(userId: string): Promise<{ companyId: string; locationId: string } | null> {
  const { data: emp } = await supabase
    .from("employees")
    .select("company_id, location_id")
    .eq("user_id", userId)
    .single();

  if (emp?.company_id && emp?.location_id) {
    return { companyId: emp.company_id, locationId: emp.location_id };
  }

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .single();

  if (cu?.company_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("company_id", cu.company_id)
      .limit(1)
      .single();
    if (loc) return { companyId: cu.company_id, locationId: loc.id };
  }
  return null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch evidence policy for a given task template */
export function useEvidencePolicy(appliesTo: string, appliesId: string | undefined) {
  return useQuery({
    queryKey: ["evidence_policy", appliesTo, appliesId],
    enabled: !!appliesId,
    queryFn: async (): Promise<EvidencePolicy | null> => {
      if (!appliesId) return null;
      const { data, error } = await supabase
        .from("evidence_policies")
        .select("*")
        .eq("applies_to", appliesTo)
        .eq("applies_id", appliesId)
        .eq("evidence_required", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

/** Fetch all evidence packets for a given subject (task occurrence, audit item, etc.) */
export function useEvidencePackets(subjectType: EvidenceSubjectType, subjectId: string | undefined) {
  return useQuery({
    queryKey: ["evidence_packets", subjectType, subjectId],
    enabled: !!subjectId,
    queryFn: async (): Promise<EvidencePacket[]> => {
      if (!subjectId) return [];
      const { data, error } = await supabase
        .from("evidence_packets")
        .select(`
          *,
          media:evidence_media(*),
          events:evidence_events(* )
        `)
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvidencePacket[];
    },
    staleTime: 30_000,
  });
}

// ─── Create Evidence Packet ───────────────────────────────────────────────────

export interface CreateEvidencePacketArgs {
  subjectType: EvidenceSubjectType;
  subjectId: string;
  subjectItemId?: string;
  /** Array of data URLs (from camera capture) or File objects */
  mediaFiles: Array<{ dataUrl: string; mimeType: string }>;
  notes?: string;
  clientCapturedAt?: string;
}

export function useCreateEvidencePacket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateEvidencePacketArgs): Promise<string> => {
      if (!user?.id) throw new Error("Not authenticated");

      const ctx = await getCompanyAndLocation(user.id);
      if (!ctx) throw new Error("Could not determine company/location");

      const { companyId, locationId } = ctx;

      // 1. Create the packet row first (status = submitted)
      const { data: packet, error: packetErr } = await supabase
        .from("evidence_packets")
        .insert({
          company_id: companyId,
          location_id: locationId,
          subject_type: args.subjectType,
          subject_id: args.subjectId,
          subject_item_id: args.subjectItemId ?? null,
          status: "submitted",
          created_by: user.id,
          notes: args.notes ?? null,
          submitted_at: new Date().toISOString(),
          client_captured_at: args.clientCapturedAt ?? new Date().toISOString(),
          device_info: {
            platform: navigator.platform,
            userAgent: navigator.userAgent.slice(0, 120),
          },
        })
        .select("id, version")
        .single();

      if (packetErr || !packet) throw packetErr ?? new Error("Failed to create packet");

      const packetId = packet.id;
      const version = packet.version ?? 1;

      // 2. Upload each media file to storage + insert evidence_media row
      const mediaInserts: Array<{
        company_id: string;
        packet_id: string;
        storage_path: string;
        media_type: string;
        mime_type: string;
        size_bytes: number;
      }> = [];

      for (const file of args.mediaFiles) {
        const mediaId = crypto.randomUUID();
        const ext = file.mimeType.includes("png") ? "png" : file.mimeType.includes("webp") ? "webp" : "jpg";
        const storagePath = `${companyId}/${args.subjectType}/${args.subjectId}/packet/${packetId}/v${version}/${mediaId}.${ext}`;

        // Compress if it's an image
        let uploadBlob: Blob;
        if (file.mimeType.startsWith("image/")) {
          const compressed = await compressImage(file.dataUrl, 1920, 1920, 0.82);
          uploadBlob = compressed.blob;
        } else {
          // Convert dataUrl to blob directly
          const res = await fetch(file.dataUrl);
          uploadBlob = await res.blob();
        }

        const { error: uploadErr } = await supabase.storage
          .from("evidence")
          .upload(storagePath, uploadBlob, {
            contentType: file.mimeType,
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        mediaInserts.push({
          company_id: companyId,
          packet_id: packetId,
          storage_path: storagePath,
          media_type: file.mimeType.startsWith("image/") ? "photo" : file.mimeType.startsWith("video/") ? "video" : "file",
          mime_type: file.mimeType,
          size_bytes: uploadBlob.size,
        });
      }

      if (mediaInserts.length > 0) {
        const { error: mediaErr } = await supabase.from("evidence_media").insert(mediaInserts);
        if (mediaErr) throw mediaErr;
      }

      // 3. Log the creation event
      await supabase.from("evidence_events").insert({
        company_id: companyId,
        packet_id: packetId,
        actor_id: user.id,
        event_type: "submitted",
        from_status: null,
        to_status: "submitted",
        payload: {
          media_count: mediaInserts.length,
          subject_type: args.subjectType,
          subject_id: args.subjectId,
        },
      });

      return packetId;
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_packets", args.subjectType, args.subjectId] });
    },
  });
}

// ─── Review Evidence Packet ───────────────────────────────────────────────────

export interface ReviewEvidencePacketArgs {
  packetId: string;
  action: "approved" | "rejected";
  reason?: string;
  subjectType: EvidenceSubjectType;
  subjectId: string;
}

export function useReviewEvidencePacket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ReviewEvidencePacketArgs) => {
      if (!user?.id) throw new Error("Not authenticated");

      const ctx = await getCompanyAndLocation(user.id);
      if (!ctx) throw new Error("Could not determine company");

      const now = new Date().toISOString();

      // Get current packet status for event log
      const { data: current } = await supabase
        .from("evidence_packets")
        .select("status, company_id")
        .eq("id", args.packetId)
        .single();

      const { error: updateErr } = await supabase
        .from("evidence_packets")
        .update({
          status: args.action,
          reviewed_by: user.id,
          reviewed_at: now,
          review_reason: args.reason ?? null,
        })
        .eq("id", args.packetId);

      if (updateErr) throw updateErr;

      // Append event
      await supabase.from("evidence_events").insert({
        company_id: current?.company_id ?? ctx.companyId,
        packet_id: args.packetId,
        actor_id: user.id,
        event_type: args.action,
        from_status: current?.status ?? "submitted",
        to_status: args.action,
        payload: args.reason ? { reason: args.reason } : null,
      });
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_packets", args.subjectType, args.subjectId] });
    },
  });
}

// ─── Get signed URL for a media item ─────────────────────────────────────────

export async function getEvidenceMediaUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("evidence")
    .createSignedUrl(storagePath, 3600); // 1 hour
  return data?.signedUrl ?? null;
}
