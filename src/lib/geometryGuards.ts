/**
 * Geometry validation guards for boundary-mask AI recolor
 * Ensures edited images maintain exact geometry and silhouette
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

/**
 * Assert that geometry is preserved between base and edited images
 * Compares alpha channels to detect any shape/size changes
 * Throws if silhouette differs by more than threshold
 */
export async function assertGeometry(
  base: Buffer,
  edited: Buffer,
  threshold: number = 0.005 // 0.5% by default
): Promise<void> {
  logger.debug('[GeometryGuard] Checking geometry preservation...');

  const [baseData, editedData] = await Promise.all([
    sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(edited).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  // Check dimensions match
  if (
    baseData.info.width !== editedData.info.width ||
    baseData.info.height !== editedData.info.height
  ) {
    throw new Error(
      `GEOMETRY_CHANGED: Dimensions mismatch (${baseData.info.width}x${baseData.info.height} vs ${editedData.info.width}x${editedData.info.height})`
    );
  }

  // Compare alpha channels (every 4th byte starting at index 3)
  let diffs = 0;
  const totalPixels = baseData.data.length / 4;

  for (let i = 3; i < baseData.data.length; i += 4) {
    const basealpha = baseData.data[i];
    const editedAlpha = editedData.data[i];

    // Consider pixels different if alpha differs by more than 10 (out of 255)
    if (Math.abs(baseAlpha - editedAlpha) > 10) {
      diffs++;
    }
  }

  const diffPercentage = diffs / totalPixels;

  logger.debug(
    `[GeometryGuard] Alpha diff: ${diffs} pixels (${(diffPercentage * 100).toFixed(4)}%)`
  );

  if (diffPercentage > threshold) {
    throw new Error(
      `GEOMETRY_CHANGED: ${(diffPercentage * 100).toFixed(2)}% alpha pixels differ (threshold: ${(threshold * 100).toFixed(2)}%)`
    );
  }

  logger.debug('[GeometryGuard] ✓ Geometry preserved - silhouette intact');
}

/**
 * Calculate color difference (Delta E) in Lab space
 * More perceptually accurate than RGB distance
 */
export function calculateDeltaE(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  // Simplified Delta E (not full CIE2000 but good enough)
  return Math.sqrt(dL * dL + da * da + db * db);
}
