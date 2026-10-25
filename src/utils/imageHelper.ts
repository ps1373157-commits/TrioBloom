/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ProcessedImage {
  blob: Blob;
  aspectRatio: number;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 1600; // Optimal for mobile Android and web viewing

/**
 * Validates file MIME type and size.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, or WebP).'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image size is ${sizeInMb}MB. Please choose an image under 10MB.`
    };
  }

  return { valid: true };
}

/**
 * Compresses and resizes an image on the client side using HTMLCanvasElement.
 * Calculates aspect ratio to prevent cumulative layout shift.
 */
export async function processAndCompressImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;
      const aspectRatio = origWidth / Math.max(1, origHeight);

      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
        if (origWidth > origHeight) {
          targetWidth = MAX_DIMENSION;
          targetHeight = Math.round(MAX_DIMENSION / aspectRatio);
        } else {
          targetHeight = MAX_DIMENSION;
          targetWidth = Math.round(MAX_DIMENSION * aspectRatio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback: return raw file if canvas context unavailable
        resolve({
          blob: file,
          aspectRatio,
          width: origWidth,
          height: origHeight,
          fileSize: file.size,
          mimeType: file.type
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Prefer WebP or JPEG for compression
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? 0.85 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              blob: file,
              aspectRatio,
              width: origWidth,
              height: origHeight,
              fileSize: file.size,
              mimeType: file.type
            });
            return;
          }

          resolve({
            blob,
            aspectRatio,
            width: targetWidth,
            height: targetHeight,
            fileSize: blob.size,
            mimeType: blob.type || outputType
          });
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load and process selected image.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Downloads a photo to the user's device.
 */
export async function downloadPhoto(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `triobloom-memory-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Direct blob download failed, falling back to link open:', err);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
