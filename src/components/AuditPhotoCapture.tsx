import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera as CameraIcon, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage, getDataUrlSizeKB } from "@/lib/imageCompression";

interface AuditPhotoCaptureProps {
  auditId: string;
  onPhotoUploaded?: (photoId: string, url: string) => void;
  className?: string;
}

export const AuditPhotoCapture = ({ auditId, onPhotoUploaded, className }: AuditPhotoCaptureProps) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [originalSizeKB, setOriginalSizeKB] = useState<number>(0);
  const [compressedSizeKB, setCompressedSizeKB] = useState<number>(0);
  const { user } = useAuth();

  const handleImageCapture = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });

      if (!image.dataUrl) {
        toast.error("Failed to capture image");
        return;
      }

      setCompressing(true);
      const originalSize = getDataUrlSizeKB(image.dataUrl);
      setOriginalSizeKB(originalSize);

      // Compress the image
      const compressed = await compressImage(image.dataUrl, 1920, 1920, 0.8);
      setCompressedSizeKB(compressed.sizeKB);
      setPhoto(compressed.dataUrl);
      
      toast.success(`Image compressed: ${originalSize}KB → ${compressed.sizeKB}KB`);
    } catch (error) {
      console.error("Error capturing image:", error);
      toast.error("Failed to capture image");
    } finally {
      setCompressing(false);
    }
  };

  const takePhoto = () => handleImageCapture(CameraSource.Camera);
  const selectFromGallery = () => handleImageCapture(CameraSource.Photos);

  const uploadPhoto = async () => {
    if (!photo || !user) {
      toast.error("No photo to upload or user not authenticated");
      return;
    }

    setUploading(true);

    try {
      // Convert data URL to blob
      const response = await fetch(photo);
      const blob = await response.blob();

      // Generate unique filename
      const fileName = `${user.id}/${auditId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("photos")
        .getPublicUrl(uploadData.path);

      // Save photo metadata to database
      const { data: photoData, error: dbError } = await supabase
        .from("audit_photos")
        .insert({
          audit_id: auditId,
          user_id: user.id,
          photo_url: publicUrl,
          caption: caption || null,
          file_size: blob.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success("Photo uploaded successfully!");
      onPhotoUploaded?.(photoData.id, publicUrl);
      
      // Reset form
      setPhoto(null);
      setCaption("");
      setOriginalSizeKB(0);
      setCompressedSizeKB(0);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setCaption("");
    setOriginalSizeKB(0);
    setCompressedSizeKB(0);
  };

  if (compressing) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Compressing image...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {!photo ? (
          <div className="flex flex-col gap-3">
            <Button
              onClick={takePhoto}
              variant="default"
              className="w-full"
              size="lg"
            >
              <CameraIcon className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
            <Button
              onClick={selectFromGallery}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ImageIcon className="mr-2 h-5 w-5" />
              Choose from Gallery
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={photo}
                alt="Captured"
                className="w-full h-auto max-h-96 object-contain"
              />
              <Button
                onClick={clearPhoto}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {compressedSizeKB > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Compressed: {originalSizeKB}KB → {compressedSizeKB}KB 
                ({Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)}% reduction)
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                placeholder="Add a description for this photo"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={uploadPhoto}
                disabled={uploading}
                className="flex-1"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Photo
                  </>
                )}
              </Button>
              <Button
                onClick={takePhoto}
                variant="outline"
                size="lg"
                disabled={uploading}
              >
                <CameraIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
