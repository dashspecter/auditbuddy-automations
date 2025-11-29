import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Camera,
  Paperclip,
  FileText,
  X,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { useUploadFieldPhoto, useUploadFieldAttachment, useDeleteFieldPhoto, useDeleteFieldAttachment, AuditFieldResponse } from "@/hooks/useAuditFieldResponses";
import { Skeleton } from "@/components/ui/skeleton";

interface FieldResponseInputProps {
  auditId: string;
  fieldId: string;
  sectionId: string;
  fieldResponse?: AuditFieldResponse;
  onObservationChange: (value: string) => void;
  disabled?: boolean;
}

export default function FieldResponseInput({
  auditId,
  fieldId,
  sectionId,
  fieldResponse,
  onObservationChange,
  disabled = false,
}: FieldResponseInputProps) {
  const [observations, setObservations] = useState(fieldResponse?.observations || "");
  const [showObservations, setShowObservations] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useUploadFieldPhoto();
  const uploadAttachment = useUploadFieldAttachment();
  const deletePhoto = useDeleteFieldPhoto();
  const deleteAttachment = useDeleteFieldAttachment();

  const handleObservationChange = (value: string) => {
    setObservations(value);
    onObservationChange(value);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fieldResponse?.id) return;

    uploadPhoto.mutate({
      responseId: fieldResponse.id,
      auditId,
      file,
    });

    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fieldResponse?.id) return;

    uploadAttachment.mutate({
      responseId: fieldResponse.id,
      auditId,
      file,
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const photos = fieldResponse?.audit_field_photos || [];
  const attachments = fieldResponse?.audit_field_attachments || [];
  const hasContent = observations || photos.length > 0 || attachments.length > 0;

  return (
    <div className="space-y-2">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant={showObservations ? "default" : "outline"}
          size="sm"
          onClick={() => setShowObservations(!showObservations)}
          disabled={disabled}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Observations
          {observations && <Badge variant="secondary" className="ml-1">{observations.length}</Badge>}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => photoInputRef.current?.click()}
          disabled={disabled || !fieldResponse?.id}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Add Photo
          {photos.length > 0 && <Badge variant="secondary" className="ml-1">{photos.length}</Badge>}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !fieldResponse?.id}
          className="gap-2"
        >
          <Paperclip className="h-4 w-4" />
          Attach File
          {attachments.length > 0 && <Badge variant="secondary" className="ml-1">{attachments.length}</Badge>}
        </Button>

        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Observations Textarea */}
      {showObservations && (
        <div className="space-y-2">
          <Label>Observations / Notes</Label>
          <Textarea
            value={observations}
            onChange={(e) => handleObservationChange(e.target.value)}
            placeholder="Add any observations, notes, or comments..."
            disabled={disabled}
            rows={3}
          />
        </div>
      )}

      {/* Photos Preview */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <Label>Photos ({photos.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((photo) => (
              <Dialog key={photo.id}>
                <DialogTrigger asChild>
                  <div className="relative group cursor-pointer">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || "Field photo"}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {!disabled && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto.mutate({ photoId: photo.id, auditId });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Photo</DialogTitle>
                  </DialogHeader>
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Field photo"}
                    className="w-full h-auto rounded-lg"
                  />
                  {photo.caption && (
                    <p className="text-sm text-muted-foreground">{photo.caption}</p>
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label>Attachments ({attachments.length})</Label>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(attachment.file_url, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() =>
                            deleteAttachment.mutate({
                              attachmentId: attachment.id,
                              auditId,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {(uploadPhoto.isPending || uploadAttachment.isPending) && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
    </div>
  );
}
