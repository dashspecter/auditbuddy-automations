/**
 * Comprehensive file optimization utility for images and documents
 * Ensures all uploads are properly sized and compressed
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB for images
  DOCUMENT: 10 * 1024 * 1024, // 10MB for documents
  AVATAR: 2 * 1024 * 1024, // 2MB for avatars
};

// Image compression settings
export const IMAGE_SETTINGS = {
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
  QUALITY: 0.85,
  THUMBNAIL_SIZE: 400,
  THUMBNAIL_QUALITY: 0.8,
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File | Blob): boolean => {
  const type = file.type || '';
  return type.startsWith('image/');
};

/**
 * Get file extension from filename or mime type
 */
export const getFileExtension = (file: File): string => {
  if (file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  }
  // Fallback to mime type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return mimeMap[file.type] || 'bin';
};

/**
 * Compress and optimize an image file
 */
export const optimizeImage = async (
  file: File | Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeBytes?: number;
  } = {}
): Promise<{ blob: Blob; sizeKB: number; width: number; height: number }> => {
  const {
    maxWidth = IMAGE_SETTINGS.MAX_WIDTH,
    maxHeight = IMAGE_SETTINGS.MAX_HEIGHT,
    quality = IMAGE_SETTINGS.QUALITY,
    maxSizeBytes = MAX_FILE_SIZES.IMAGE,
  } = options;

  // Check initial file size
  if (file.size > maxSizeBytes) {
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
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

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            resolve({
              blob,
              sizeKB: Math.round(blob.size / 1024),
              width,
              height,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Optimize any file type (images get compressed, others get validated)
 */
export const optimizeFile = async (
  file: File,
  options: {
    maxSizeBytes?: number;
    compressImages?: boolean;
  } = {}
): Promise<{ file: File | Blob; sizeKB: number; wasCompressed: boolean }> => {
  const {
    maxSizeBytes = isImageFile(file) ? MAX_FILE_SIZES.IMAGE : MAX_FILE_SIZES.DOCUMENT,
    compressImages = true,
  } = options;

  // For images, compress them
  if (isImageFile(file) && compressImages) {
    try {
      const optimized = await optimizeImage(file, { maxSizeBytes });
      return {
        file: new File([optimized.blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }),
        sizeKB: optimized.sizeKB,
        wasCompressed: true,
      };
    } catch (error) {
      // If compression fails, validate original file
      if (file.size > maxSizeBytes) {
        throw error;
      }
      return {
        file,
        sizeKB: Math.round(file.size / 1024),
        wasCompressed: false,
      };
    }
  }

  // For non-images, just validate size
  if (file.size > maxSizeBytes) {
    throw new Error(
      `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`
    );
  }

  return {
    file,
    sizeKB: Math.round(file.size / 1024),
    wasCompressed: false,
  };
};

/**
 * Batch optimize multiple files
 */
export const optimizeFiles = async (
  files: File[],
  options: {
    maxSizeBytes?: number;
    compressImages?: boolean;
    onProgress?: (index: number, total: number) => void;
  } = {}
): Promise<Array<{ file: File | Blob; originalName: string; sizeKB: number; wasCompressed: boolean }>> => {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    if (options.onProgress) {
      options.onProgress(i + 1, files.length);
    }

    const result = await optimizeFile(files[i], options);
    results.push({
      ...result,
      originalName: files[i].name,
    });
  }

  return results;
};

/**
 * Convert data URL to optimized blob
 */
export const dataUrlToOptimizedBlob = async (
  dataUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Blob> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const result = await optimizeImage(blob, options);
  return result.blob;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
