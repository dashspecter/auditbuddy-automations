import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuditFieldResponse } from "@/hooks/useAuditFieldResponses";

interface FieldResponseDisplayProps {
  fieldResponse: AuditFieldResponse;
  fieldName: string;
}

export default function FieldResponseDisplay({
  fieldResponse,
  fieldName,
}: FieldResponseDisplayProps) {
  const hasObservations = fieldResponse.observations && fieldResponse.observations.trim().length > 0;
  const hasPhotos = fieldResponse.audit_field_photos?.length > 0;
  const hasAttachments = fieldResponse.audit_field_attachments?.length > 0;

  if (!hasObservations && !hasPhotos && !hasAttachments) {
    return null;
  }

  return (
    <Card className="mt-2 bg-muted/30">
      <CardContent className="p-4 space-y-3">
        {/* Observations */}
        {hasObservations && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Observations
            </div>
            <p className="text-sm pl-6">{fieldResponse.observations}</p>
          </div>
        )}

        {/* Photos */}
        {hasPhotos && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              Photos ({fieldResponse.audit_field_photos.length})
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 pl-6">
              {fieldResponse.audit_field_photos.map((photo) => (
                <Dialog key={photo.id}>
                  <DialogTrigger asChild>
                    <div className="relative group cursor-pointer">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || fieldName}
                        className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>{fieldName} - Photo</DialogTitle>
                    </DialogHeader>
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || fieldName}
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

        {/* Attachments */}
        {hasAttachments && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              Attachments ({fieldResponse.audit_field_attachments.length})
            </div>
            <div className="space-y-2 pl-6">
              {fieldResponse.audit_field_attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(attachment.file_url, "_blank")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
