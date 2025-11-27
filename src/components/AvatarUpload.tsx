import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { optimizeImage, MAX_FILE_SIZES, formatFileSize } from "@/lib/fileOptimization";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (url: string) => void;
  className?: string;
}

export const AvatarUpload = ({ 
  currentAvatarUrl, 
  onAvatarUpdate,
  className 
}: AvatarUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Optimize and compress the image
      const originalSize = file.size;
      const optimized = await optimizeImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        maxSizeBytes: MAX_FILE_SIZES.AVATAR,
      });

      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload optimized image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, optimized.blob, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const savedKB = Math.round((originalSize - optimized.blob.size) / 1024);
      if (savedKB > 10) {
        toast.success(`Image optimized: saved ${savedKB}KB`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      onAvatarUpdate?.(publicUrl);
      
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <Avatar className="h-32 w-32">
        <AvatarImage src={avatarUrl || undefined} alt="Profile avatar" />
        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
          <User className="h-12 w-12" />
        </AvatarFallback>
      </Avatar>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Avatar
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or WEBP (max {formatFileSize(MAX_FILE_SIZES.AVATAR)})
      </p>
    </div>
  );
};
