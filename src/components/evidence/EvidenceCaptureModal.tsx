import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Info, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateEvidencePacket, type EvidencePolicy, type EvidenceSubjectType } from "@/hooks/useEvidencePackets";

interface CapturedFile {
  dataUrl: string;
  mimeType: string;
  previewUrl: string;
}

interface EvidenceCaptureModalProps {
  open: boolean;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  subjectItemId?: string;
  policy: EvidencePolicy | null;
  onComplete: (packetId: string) => void;
  onCancel: () => void;
  title?: string;
}

export function EvidenceCaptureModal({
  open,
  subjectType,
  subjectId,
  subjectItemId,
  policy,
  onComplete,
  onCancel,
  title = "Add Proof",
}: EvidenceCaptureModalProps) {
  const [captured, setCaptured] = useState<CapturedFile[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const createPacket = useCreateEvidencePacket();
  const minCount = policy?.min_media_count ?? 1;
  const instructions = policy?.instructions;

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`Unsupported file type: ${file.type}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCaptured((prev) => [
          ...prev,
          { dataUrl, mimeType: file.type, previewUrl: dataUrl },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeCapture = useCallback((index: number) => {
    setCaptured((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (captured.length < minCount) {
      toast.error(`Please add at least ${minCount} photo${minCount > 1 ? "s" : ""}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const packetId = await createPacket.mutateAsync({
        subjectType,
        subjectId,
        subjectItemId,
        mediaFiles: captured.map((c) => ({ dataUrl: c.dataUrl, mimeType: c.mimeType })),
        notes: notes.trim() || undefined,
        clientCapturedAt: new Date().toISOString(),
      });

      toast.success("Proof submitted successfully");
      setCaptured([]);
      setNotes("");
      onComplete(packetId);
    } catch (err) {
      console.error("EvidenceCaptureModal submit error:", err);
      toast.error("Failed to submit proof. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setCaptured([]);
    setNotes("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions panel */}
          {instructions && (
            <div className="flex gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{instructions}</p>
            </div>
          )}

          {/* Media requirement indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Photos captured
            </span>
            <span
              className={cn(
                "font-medium",
                captured.length >= minCount ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}
            >
              {captured.length} / {minCount} required
            </span>
          </div>

          {/* Captured media previews */}
          {captured.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {captured.map((c, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={c.previewUrl}
                    alt={`Capture ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeCapture(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Capture buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Camera capture (opens device camera on mobile) */}
            <Button
              type="button"
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-xs">Take Photo</span>
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* File upload fallback */}
            <Button
              type="button"
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">Upload File</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4"
              className="hidden"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Empty state */}
          {captured.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg text-muted-foreground gap-2">
              <ImageIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No photos yet</p>
              <p className="text-xs opacity-70">Tap "Take Photo" or "Upload File" above</p>
            </div>
          )}

          {/* Notes field */}
          <div className="space-y-1.5">
            <Label htmlFor="evidence-notes" className="text-sm">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="evidence-notes"
              placeholder="Add any relevant notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || captured.length < minCount}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Submit Proof
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
