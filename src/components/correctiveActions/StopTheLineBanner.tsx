import { useState } from "react";
import { AlertOctagon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReleaseStopTheLine, type CorrectiveAction } from "@/hooks/useCorrectiveActions";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface StopTheLineBannerProps {
  ca: CorrectiveAction;
  locationName?: string;
  canRelease?: boolean;
}

export function StopTheLineBanner({ ca, locationName, canRelease = false }: StopTheLineBannerProps) {
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [reason, setReason] = useState("");
  const releaseSTL = useReleaseStopTheLine();

  const isReleased = !!ca.stop_released_at;
  if (isReleased) return null;

  const handleRelease = async () => {
    if (!reason.trim()) {
      toast.error("A reason is required to release stop-the-line.");
      return;
    }
    try {
      await releaseSTL.mutateAsync({
        caId: ca.id,
        companyId: ca.company_id,
        locationId: ca.location_id,
        reason,
      });
      toast.success("Stop-the-line released.");
      setReleaseOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to release stop-the-line.";
      toast.error(message);
    }
  };

  return (
    <>
      <div className="rounded-lg border-2 border-destructive bg-destructive/8 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertOctagon className="h-6 w-6 text-destructive shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="font-bold text-destructive text-sm">
              STOP THE LINE — {locationName ?? "Location Restricted"}
            </p>
            <p className="text-destructive/80 text-xs mt-0.5 truncate">
              {ca.title} · Operations are restricted until this CA is resolved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/corrective-actions/${ca.id}`}>
            <Button variant="destructive" size="sm">View CA</Button>
          </Link>
          {canRelease && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setReleaseOpen(true)}
            >
              Release
            </Button>
          )}
        </div>
      </div>

      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              Release Stop-the-Line
            </DialogTitle>
            <DialogDescription>
              This will lift the restriction on <strong>{locationName}</strong>. You must provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for releasing stop-the-line..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRelease}
              disabled={releaseSTL.isPending || !reason.trim()}
            >
              {releaseSTL.isPending ? "Releasing..." : "Confirm Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
