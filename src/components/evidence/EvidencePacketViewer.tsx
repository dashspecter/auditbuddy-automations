import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useEvidencePackets,
  useReviewEvidencePacket,
  getEvidenceMediaUrl,
  type EvidenceSubjectType,
  type EvidencePacket,
} from "@/hooks/useEvidencePackets";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Media Viewer ────────────────────────────────────────────────────────────

function MediaGallery({ packet }: { packet: EvidencePacket }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const media = packet.media ?? [];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        media.map(async (m) => {
          const url = await getEvidenceMediaUrl(m.storage_path);
          return [m.id, url ?? ""] as [string, string];
        })
      );
      if (!cancelled) setUrls(Object.fromEntries(entries));
    };
    if (media.length > 0) load();
    return () => { cancelled = true; };
  }, [media.length, packet.id]);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg text-muted-foreground gap-2">
        <Camera className="h-6 w-6 opacity-40" />
        <p className="text-sm">No media attached</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {media.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setLightboxIdx(i)}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity"
          >
            {urls[m.id] ? (
              <img src={urls[m.id]} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-foreground/80 hover:text-foreground opacity-80"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {lightboxIdx > 0 && (
            <button
              type="button"
              className="absolute left-4 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => Math.max(0, (p ?? 1) - 1)); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIdx < media.length - 1 && (
            <button
              type="button"
              className="absolute right-4 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => Math.min(media.length - 1, (p ?? 0) + 1)); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          {urls[media[lightboxIdx].id] && (
            <img
              src={urls[media[lightboxIdx].id]}
              alt="Evidence"
              className="max-h-[85vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <span className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIdx + 1} / {media.length}
          </span>
        </div>
      )}
    </>
  );
}

// ─── Event Timeline ───────────────────────────────────────────────────────────

function EventTimeline({ packet }: { packet: EvidencePacket }) {
  const events = [...(packet.events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (events.length === 0) return null;

  const eventIcon: Record<string, JSX.Element> = {
    submitted: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    approved: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
    rejected: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    redacted: <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />,
    versioned: <Camera className="h-3.5 w-3.5 text-primary" />,
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</p>
      <div className="space-y-1.5">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5">{eventIcon[ev.event_type] ?? <Clock className="h-3.5 w-3.5" />}</span>
            <div>
              <span className="capitalize font-medium text-foreground">{ev.event_type}</span>
              {(ev.payload as any)?.reason && (
                <span className="ml-1 italic">— "{(ev.payload as any).reason}"</span>
              )}
              <span className="ml-2">{format(new Date(ev.created_at), "MMM d, h:mm a")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Review Panel ─────────────────────────────────────────────────────────────

function ReviewPanel({ packet, subjectType, subjectId }: {
  packet: EvidencePacket;
  subjectType: EvidenceSubjectType;
  subjectId: string;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const reviewMutation = useReviewEvidencePacket();

  if (packet.status !== "submitted") return null;

  const handleApprove = async () => {
    try {
      await reviewMutation.mutateAsync({ packetId: packet.id, action: "approved", subjectType, subjectId });
      toast.success("Proof approved");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        packetId: packet.id,
        action: "rejected",
        reason: rejectReason.trim(),
        subjectType,
        subjectId,
      });
      toast.success("Proof rejected");
      setRejectReason("");
      setShowRejectInput(false);
    } catch {
      toast.error("Failed to reject");
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Review</p>
      {!showRejectInput ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApprove}
            disabled={reviewMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 gap-1.5"
            onClick={() => setShowRejectInput(true)}
            disabled={reviewMutation.isPending}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for rejection..."
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowRejectInput(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handleReject}
              disabled={reviewMutation.isPending || !rejectReason.trim()}
            >
              {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────

interface EvidencePacketViewerProps {
  open: boolean;
  onClose: () => void;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  /** If true, show approve/reject controls (managers only) */
  canReview?: boolean;
}

export function EvidencePacketViewer({
  open,
  onClose,
  subjectType,
  subjectId,
  canReview = false,
}: EvidencePacketViewerProps) {
  const { data: packets = [], isLoading } = useEvidencePackets(subjectType, subjectId);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const packet = packets[selectedIdx] ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Evidence
            {packets.length > 1 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({packets.length} versions)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : packets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Camera className="h-8 w-8 opacity-40" />
            <p className="text-sm">No evidence packets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Version selector */}
            {packets.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {packets.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md border transition-colors",
                      i === selectedIdx
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    v{p.version}
                  </button>
                ))}
              </div>
            )}

            {packet && (
              <>
                {/* Status + meta */}
                <div className="flex items-center justify-between">
                  <EvidenceStatusBadge status={packet.status} />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(packet.created_at), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>

                {/* Media gallery */}
                <MediaGallery packet={packet} />

                {/* Notes */}
                {packet.notes && (
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p>{packet.notes}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {packet.status === "rejected" && packet.review_reason && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                    <p className="text-xs font-medium text-destructive mb-1">Rejection reason</p>
                    <p>{packet.review_reason}</p>
                  </div>
                )}

                {/* Review buttons (managers) */}
                {canReview && (
                  <ReviewPanel packet={packet} subjectType={subjectType} subjectId={subjectId} />
                )}

                {/* Event timeline */}
                <EventTimeline packet={packet} />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
