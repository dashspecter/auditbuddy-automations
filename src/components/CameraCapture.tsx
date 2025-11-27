import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera as CameraIcon, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { dataUrlToOptimizedBlob, IMAGE_SETTINGS } from "@/lib/fileOptimization";

interface CameraCaptureProps {
  onPhotoUploaded?: (url: string) => void;
  className?: string;
}

export const CameraCapture = ({ onPhotoUploaded, className }: CameraCaptureProps) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      setPhoto(image.dataUrl || null);
    } catch (error) {
      console.error("Error taking photo:", error);
      toast.error("Failed to capture photo");
    }
  };

  const selectFromGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      setPhoto(image.dataUrl || null);
    } catch (error) {
      console.error("Error selecting photo:", error);
      toast.error("Failed to select photo");
    }
  };

  const uploadPhoto = async () => {
    if (!photo || !user) {
      toast.error("No photo to upload or user not authenticated");
      return;
    }

    setUploading(true);

    try {
      // Optimize image before upload
      const optimizedBlob = await dataUrlToOptimizedBlob(photo, {
        maxWidth: IMAGE_SETTINGS.MAX_WIDTH,
        maxHeight: IMAGE_SETTINGS.MAX_HEIGHT,
        quality: IMAGE_SETTINGS.QUALITY,
      });

      // Generate unique filename
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Upload optimized image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("photos")
        .upload(fileName, optimizedBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("photos")
        .getPublicUrl(data.path);

      toast.success("Photo uploaded successfully!");
      onPhotoUploaded?.(publicUrl);
      setPhoto(null);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
  };

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
            <div className="flex gap-3">
              <Button
                onClick={uploadPhoto}
                disabled={uploading}
                className="flex-1"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              <Button
                onClick={takePhoto}
                variant="outline"
                size="lg"
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
