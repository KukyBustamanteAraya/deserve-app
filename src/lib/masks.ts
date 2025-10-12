/**
 * Mask utilities for boundary-based recoloring
 * Handles silhouette masks and logo protection
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface LogoBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Load and resize silhouette mask to match base image dimensions
 * INVERTS the mask so jersey (black) becomes white (editable)
 * Returns mask buffer with white=editable, black=locked
 */
export async function loadSilhouetteMask(
  maskBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  logger.debug(`[Masks] Loading silhouette mask, target size: ${targetWidth}x${targetHeight}`);

  const mask = sharp(maskBuffer);
  const metadata = await mask.metadata();

  logger.debug(`[Masks] Original mask size: ${metadata.width}x${metadata.height}`);

  // Resize if needed (using NEAREST to preserve sharp edges)
  let processedMask = mask;
  if (metadata.width !== targetWidth || metadata.height !== targetHeight) {
    logger.debug('[Masks] Resizing mask to match base image...');
    processedMask = mask.resize(targetWidth, targetHeight, {
      fit: 'cover',
      kernel: 'nearest', // No antialiasing
    });
  }

  // INVERT the mask: black jersey becomes white (editable for DALL-E)
  logger.debug('[Masks] Inverting mask (jersey will be white/editable)...');
  return processedMask.negate().png().toBuffer();
}

/**
 * Apply logo protection boxes to the silhouette mask
 * Paints black rectangles over logo areas to prevent AI from touching them
 */
export async function applyLogoBoxes(
  maskBuffer: Buffer,
  logoBoxes: LogoBox[]
): Promise<Buffer> {
  if (!logoBoxes || logoBoxes.length === 0) {
    return maskBuffer;
  }

  logger.debug(`[Masks] Applying ${logoBoxes.length} logo protection box(es)...`);

  const mask = sharp(maskBuffer);
  const { width, height } = await mask.metadata();

  if (!width || !height) {
    throw new Error('Invalid mask dimensions');
  }

  // Load mask as raw buffer
  const { data: maskData, info } = await mask.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // Paint black rectangles over logo boxes
  for (const box of logoBoxes) {
    logger.debug(
      `[Masks] Protecting logo box: x=${box.x}, y=${box.y}, w=${box.w}, h=${box.h}`
    );

    const x1 = Math.max(0, Math.floor(box.x));
    const y1 = Math.max(0, Math.floor(box.y));
    const x2 = Math.min(width, Math.ceil(box.x + box.w));
    const y2 = Math.min(height, Math.ceil(box.y + box.h));

    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const idx = (y * width + x) * channels;
        // Paint black (0, 0, 0) - locked region
        maskData[idx] = 0;
        if (channels > 1) maskData[idx + 1] = 0;
        if (channels > 2) maskData[idx + 2] = 0;
      }
    }
  }

  // Convert back to PNG
  return sharp(maskData, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Create a simple rectangular mask (useful for testing)
 */
export async function createRectangleMask(
  width: number,
  height: number,
  padding: number = 50
): Promise<Buffer> {
  logger.debug(`[Masks] Creating rectangle mask: ${width}x${height}, padding=${padding}`);

  const data = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;

      // White rectangle in center, black border
      const isInside =
        x >= padding && x < width - padding && y >= padding && y < height - padding;

      const value = isInside ? 255 : 0;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Validate that mask is valid (has at least some white pixels)
 */
export async function validateMask(maskBuffer: Buffer): Promise<void> {
  const { data, info } = await sharp(maskBuffer).raw().toBuffer({ resolveWithObject: true });

  let whitePixels = 0;
  const totalPixels = info.width! * info.height!;

  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200) {
      whitePixels++;
    }
  }

  const whitePercentage = (whitePixels / totalPixels) * 100;

  logger.debug(`[Masks] Validation: ${whitePercentage.toFixed(1)}% white pixels`);

  if (whitePixels === 0) {
    throw new Error('Mask is completely black - no editable area defined');
  }

  if (whitePixels === totalPixels) {
    logger.warn('[Masks] Warning: Mask is completely white - no locked areas');
  }
}
