/**
 * Compress an image to reduce file size while maintaining quality
 */
export const compressImage = async (
  dataUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<{ dataUrl: string; blob: Blob; sizeKB: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = Math.round(width / aspectRatio);
        } else {
          height = maxHeight;
          width = Math.round(height * aspectRatio);
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              dataUrl: reader.result as string,
              blob,
              sizeKB: Math.round(blob.size / 1024),
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

/**
 * Get original image size from data URL
 */
export const getImageSize = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
};

/**
 * Calculate file size from data URL in KB
 */
export const getDataUrlSizeKB = (dataUrl: string): number => {
  const base64Length = dataUrl.split(',')[1]?.length || 0;
  // Base64 encoding increases size by ~33%, so divide by 1.33 to get approximate original size
  return Math.round((base64Length * 0.75) / 1024);
};
