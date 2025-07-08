import React from 'react';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  resize?: 'contain' | 'cover' | 'stretch';
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  fileSize?: number;
}

/**
 * Comprehensive image optimization utility
 * Handles compression, resizing, and format optimization
 */
export class ImageOptimizer {
  // Default settings for different use cases
  static readonly PRESETS = {
    // For post uploads - high quality but optimized
    POST_UPLOAD: {
      maxWidth: 1080,
      maxHeight: 1080,
      quality: 0.85,
      format: 'jpeg' as const,
      resize: 'cover' as const,
    },
    // For Azure Vision API - smaller for faster processing
    AZURE_VISION: {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.7,
      format: 'jpeg' as const,
      resize: 'cover' as const,
    },
    // For avatars - smaller and highly compressed
    AVATAR: {
      maxWidth: 300,
      maxHeight: 300,
      quality: 0.8,
      format: 'jpeg' as const,
      resize: 'cover' as const,
    },
    // For thumbnails - very small
    THUMBNAIL: {
      maxWidth: 150,
      maxHeight: 150,
      quality: 0.7,
      format: 'jpeg' as const,
      resize: 'cover' as const,
    },
  };

  /**
   * Optimize image with given options
   */
  static async optimizeImage(
    imageUri: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    try {
      // Get original image info
      const originalInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Calculate optimal dimensions
      const { width: originalWidth, height: originalHeight } = originalInfo;
      const { targetWidth, targetHeight } = this.calculateOptimalDimensions(
        originalWidth,
        originalHeight,
        options.maxWidth || 1080,
        options.maxHeight || 1080,
        options.resize || 'cover'
      );

      // Prepare manipulation actions
      const actions: ImageManipulator.Action[] = [];

      // Add resize action if needed
      if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
        actions.push({
          resize: {
            width: targetWidth,
            height: targetHeight,
          },
        });
      }

      // Determine format
      const format = this.getOptimalFormat(options.format);

      // Apply optimizations
      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: options.quality || 0.85,
        format,
        base64: false, // Don't generate base64 by default for better performance
      });

      return {
        uri: result.uri,
        width: result.width || targetWidth,
        height: result.height || targetHeight,
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error('Failed to optimize image. Please try again.');
    }
  }

  /**
   * Optimize image for post upload (high quality, optimized size)
   */
  static async optimizeForPost(imageUri: string): Promise<OptimizedImageResult> {
    return this.optimizeImage(imageUri, this.PRESETS.POST_UPLOAD);
  }

  /**
   * Optimize image for Azure Vision API (smaller, faster)
   */
  static async optimizeForAzureVision(imageUri: string): Promise<OptimizedImageResult> {
    return this.optimizeImage(imageUri, this.PRESETS.AZURE_VISION);
  }

  /**
   * Optimize image for avatar upload
   */
  static async optimizeForAvatar(imageUri: string): Promise<OptimizedImageResult> {
    return this.optimizeImage(imageUri, this.PRESETS.AVATAR);
  }

  /**
   * Get image info without processing
   */
  static async getImageInfo(imageUri: string): Promise<{ width: number; height: number }> {
    try {
      const info = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return {
        width: info.width || 0,
        height: info.height || 0,
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    resizeMode: 'contain' | 'cover' | 'stretch'
  ): { targetWidth: number; targetHeight: number } {
    if (resizeMode === 'stretch') {
      return { targetWidth: maxWidth, targetHeight: maxHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    const maxAspectRatio = maxWidth / maxHeight;

    let targetWidth: number;
    let targetHeight: number;

    if (resizeMode === 'contain') {
      // Fit within bounds, maintaining aspect ratio
      if (aspectRatio > maxAspectRatio) {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / aspectRatio);
      } else {
        targetHeight = maxHeight;
        targetWidth = Math.round(maxHeight * aspectRatio);
      }
    } else {
      // Cover bounds, maintaining aspect ratio (crop if needed)
      if (aspectRatio > maxAspectRatio) {
        targetHeight = maxHeight;
        targetWidth = Math.round(maxHeight * aspectRatio);
      } else {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / aspectRatio);
      }

      // Ensure we don't exceed maximum dimensions
      if (targetWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / aspectRatio);
      }
      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    return { targetWidth, targetHeight };
  }

  /**
   * Get optimal image format based on platform and preferences
   */
  private static getOptimalFormat(
    preferredFormat?: 'jpeg' | 'png' | 'webp'
  ): ImageManipulator.SaveFormat {
    if (preferredFormat === 'png') {
      return ImageManipulator.SaveFormat.PNG;
    }
    // Default to JPEG for best compression and compatibility
    return ImageManipulator.SaveFormat.JPEG;
  }

  /**
   * Progressive image loading utility
   */
  static async createProgressiveVersions(imageUri: string): Promise<{
    thumbnail: string;
    medium: string;
    full: string;
  }> {
    try {
      const [thumbnail, medium, full] = await Promise.all([
        this.optimizeImage(imageUri, this.PRESETS.THUMBNAIL),
        this.optimizeImage(imageUri, {
          maxWidth: 540,
          maxHeight: 540,
          quality: 0.8,
          format: 'jpeg',
          resize: 'cover',
        }),
        this.optimizeForPost(imageUri),
      ]);

      return {
        thumbnail: thumbnail.uri,
        medium: medium.uri,
        full: full.uri,
      };
    } catch (error) {
      console.error('Error creating progressive versions:', error);
      throw error;
    }
  }

  /**
   * Estimate file size reduction
   */
  static estimateCompressionRatio(
    originalWidth: number,
    originalHeight: number,
    options: ImageOptimizationOptions
  ): number {
    const originalPixels = originalWidth * originalHeight;
    const targetWidth = options.maxWidth || originalWidth;
    const targetHeight = options.maxHeight || originalHeight;
    const targetPixels = targetWidth * targetHeight;

    const dimensionRatio = Math.min(targetPixels / originalPixels, 1);
    const qualityRatio = options.quality || 0.85;

    return dimensionRatio * qualityRatio;
  }
}

/**
 * Hook for image optimization with loading states
 */
export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [optimizationProgress, setOptimizationProgress] = React.useState(0);

  const optimizeImage = async (
    imageUri: string,
    options?: ImageOptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<OptimizedImageResult> => {
    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOptimizationProgress((prev) => {
          const next = prev + 10;
          if (onProgress) onProgress(next);
          return next > 90 ? 90 : next;
        });
      }, 100);

      const result = await ImageOptimizer.optimizeImage(imageUri, options);

      clearInterval(progressInterval);
      setOptimizationProgress(100);
      if (onProgress) onProgress(100);

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 200));

      return result;
    } catch (error) {
      setOptimizationProgress(0);
      throw error;
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress(0);
    }
  };

  return {
    optimizeImage,
    isOptimizing,
    optimizationProgress,
  };
};

// Re-export for convenience
export default ImageOptimizer;
