import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, ZoomIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  file_size: number | null;
}

interface PhotoGalleryProps {
  auditId?: string;
  showDeleteButton?: boolean;
  className?: string;
}

export const PhotoGallery = ({ auditId, showDeleteButton = true, className }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadPhotos();
  }, [auditId]);

  const loadPhotos = async () => {
    try {
      let query = supabase
        .from("audit_photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (auditId) {
        query = query.eq("audit_id", auditId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!photoToDelete) return;

    setDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = photoToDelete.photo_url.split('/photos/');
      const filePath = urlParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("photos")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("audit_photos")
        .delete()
        .eq("id", photoToDelete.id);

      if (dbError) throw dbError;

      toast.success("Photo deleted successfully");
      setPhotos(photos.filter((p) => p.id !== photoToDelete.id));
      setPhotoToDelete(null);
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading photos...</span>
        </div>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          No photos yet
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden group relative">
            <div className="aspect-square relative">
              <img
                src={photo.photo_url}
                alt={photo.caption || "Audit photo"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              {showDeleteButton && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(photo);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {photo.caption && (
              <div className="p-2 text-sm text-muted-foreground truncate">
                {photo.caption}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.caption || "Photo"}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.caption || "Audit photo"}
                className="w-full h-auto rounded-lg"
              />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Uploaded: {format(new Date(selectedPhoto.created_at), "PPp")}</p>
                {selectedPhoto.file_size && (
                  <p>Size: {Math.round(selectedPhoto.file_size / 1024)}KB</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
