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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, ImageIcon, Loader2, FileCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompleteActionItem, type CorrectiveActionItem } from "@/hooks/useCorrectiveActions";
import { useCreateEvidencePacket } from "@/hooks/useEvidencePackets";

interface CapturedFile {
  dataUrl: string;
  mimeType: string;
  previewUrl: string;
}

interface ResolutionReportModalProps {
  open: boolean;
  item: CorrectiveActionItem;
  companyId: string;
  caTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResolutionReportModal({
  open,
  item,
  companyId,
  caTitle,
  onClose,
  onSuccess,
}: ResolutionReportModalProps) {
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [captured, setCaptured] = useState<CapturedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const completeItem = useCompleteActionItem();
  const createPacket = useCreateEvidencePacket();

  const minNotesLength = 10;
  const notesValid = notes.trim().length >= minNotesLength;
  const canSubmit = notesValid && confirmed && !isSubmitting;

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are supported");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCaptured((prev) => [...prev, { dataUrl, mimeType: file.type, previewUrl: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeCapture = useCallback((index: number) => {
    setCaptured((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      let evidencePacketId: string | undefined;

      // If photos were captured, create an evidence packet
      if (captured.length > 0) {
        evidencePacketId = await createPacket.mutateAsync({
          subjectType: "corrective_action_item",
          subjectId: item.corrective_action_id,
          subjectItemId: item.id,
          mediaFiles: captured.map((c) => ({ dataUrl: c.dataUrl, mimeType: c.mimeType })),
          notes: notes.trim(),
          clientCapturedAt: new Date().toISOString(),
        });
      }

      await completeItem.mutateAsync({
        item,
        companyId,
        evidencePacketId,
        completionNotes: notes.trim(),
      });

      toast.success("Resolution submitted — your manager will be notified for verification.");
      resetForm();
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit resolution.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNotes("");
    setConfirmed(false);
    setCaptured([]);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Resolution Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context */}
          <div className="flex gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{caTitle}</p>
            </div>
          </div>

          {/* Instructions from the item */}
          {item.instructions && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              <span className="font-medium text-foreground">Instructions: </span>
              {item.instructions}
            </div>
          )}

          {/* Completion notes - required */}
          <div className="space-y-1.5">
            <Label htmlFor="resolution-notes" className="text-sm font-medium">
              What did you do to fix this? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe the corrective action you took..."
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className={cn(
                notes.length > 0 && !notesValid && "border-warning focus-visible:ring-warning"
              )}
            />
            {notes.length > 0 && !notesValid && (
              <p className="text-xs text-warning">
                Please provide at least {minNotesLength} characters ({minNotesLength - notes.trim().length} more needed)
              </p>
            )}
          </div>

          {/* Optional photo proof */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Photo proof <span className="text-muted-foreground font-normal">(optional but recommended)</span>
            </Label>

            {captured.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {captured.map((c, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={c.previewUrl} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-col gap-1"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-xs">Take Photo</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              <Button
                type="button"
                variant="outline"
                className="h-12 flex-col gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">Upload</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {captured.length === 0 && (
              <div className="flex items-center gap-2 py-3 px-3 border border-dashed rounded-lg text-muted-foreground">
                <ImageIcon className="h-4 w-4 opacity-40" />
                <p className="text-xs">No photos — you can still submit without one</p>
              </div>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
            <Checkbox
              id="confirm-resolution"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-resolution" className="text-sm leading-snug cursor-pointer">
              I confirm this issue has been properly resolved
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 sm:flex-none gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                Submit Resolution
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}