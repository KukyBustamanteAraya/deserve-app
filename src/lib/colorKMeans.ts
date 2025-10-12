/**
 * K-means clustering in Lab color space
 * Used to detect dominant colors in an image for AI color mapping hints
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface LabColor {
  L: number;
  a: number;
  b: number;
}

interface ColorCluster {
  hex: string;
  lab: LabColor;
  rgb: RGBColor;
  pixelCount: number;
  proportion: number;
}

/**
 * Convert RGB to XYZ color space (D65 illuminant)
 */
function rgbToXyz(rgb: RGBColor): { x: number; y: number; z: number } {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  // Observer = 2°, Illuminant = D65
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  return { x, y, z };
}

/**
 * Convert XYZ to Lab color space (D65 illuminant)
 */
function xyzToLab(xyz: { x: number; y: number; z: number }): LabColor {
  // D65 reference white
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;

  // Lab transform
  const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L, a, b };
}

/**
 * Convert RGB to Lab color space
 */
function rgbToLab(rgb: RGBColor): LabColor {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

/**
 * Convert Lab to RGB color space
 */
function labToRgb(lab: LabColor): RGBColor {
  // D65 reference white
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let fy = (lab.L + 16) / 116;
  let fx = lab.a / 500 + fy;
  let fz = fy - lab.b / 200;

  const xr = fx * fx * fx > 0.008856 ? fx * fx * fx : (fx - 16 / 116) / 7.787;
  const yr = fy * fy * fy > 0.008856 ? fy * fy * fy : (fy - 16 / 116) / 7.787;
  const zr = fz * fz * fz > 0.008856 ? fz * fz * fz : (fz - 16 / 116) / 7.787;

  const x = refX * xr;
  const y = refY * yr;
  const z = refZ * zr;

  // XYZ to RGB
  let r = x * 0.032406 + y * -0.015372 + z * -0.004986;
  let g = x * -0.009689 + y * 0.018758 + z * 0.00041;
  let b = x * 0.000557 + y * -0.002040 + z * 0.010570;

  // Gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
  };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(rgb: RGBColor): string {
  const r = rgb.r.toString(16).padStart(2, '0');
  const g = rgb.g.toString(16).padStart(2, '0');
  const b = rgb.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Calculate Euclidean distance in Lab space
 */
function labDistance(a: LabColor, b: LabColor): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * K-means clustering in Lab color space
 * Returns k dominant color clusters sorted by pixel count (descending)
 */
export async function kmeansLab(
  imageBuffer: Buffer,
  maskBuffer: Buffer | undefined,
  k: number = 3,
  maxIterations: number = 20
): Promise<ColorCluster[]> {
  logger.debug(`[K-means] Starting with k=${k}, maxIter=${maxIterations}`);

  // Load image
  const { data: imageData, info: imageInfo } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = imageInfo;

  // Load mask if provided
  let maskData: Buffer | undefined;
  if (maskBuffer) {
    const maskInfo = await sharp(maskBuffer)
      .resize(width, height, { fit: 'cover', kernel: 'nearest' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    maskData = maskInfo.data;
  }

  // Extract pixels inside mask (or all pixels if no mask)
  const pixels: { rgb: RGBColor; lab: LabColor }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Check mask - only include white pixels (>200)
      if (maskData) {
        const maskIdx = (y * width + x) * (maskData.length / (width * height));
        const maskValue = maskData[maskIdx];
        if (maskValue < 200) continue;
      }

      const rgb: RGBColor = {
        r: imageData[idx],
        g: imageData[idx + 1],
        b: imageData[idx + 2],
      };

      const lab = rgbToLab(rgb);
      pixels.push({ rgb, lab });
    }
  }

  logger.debug(`[K-means] Sampled ${pixels.length} pixels`);

  if (pixels.length === 0) {
    throw new Error('No pixels found inside mask');
  }

  // Downsample if too many pixels (for performance)
  const maxSamples = 10000;
  const sampledPixels =
    pixels.length > maxSamples
      ? pixels.filter((_, i) => i % Math.ceil(pixels.length / maxSamples) === 0)
      : pixels;

  logger.debug(`[K-means] Using ${sampledPixels.length} samples for clustering`);

  // Initialize centroids randomly
  const centroids: LabColor[] = [];
  for (let i = 0; i < k; i++) {
    const randomIdx = Math.floor(Math.random() * sampledPixels.length);
    centroids.push({ ...sampledPixels[randomIdx].lab });
  }

  // K-means iterations
  let assignments: number[] = new Array(sampledPixels.length).fill(0);
  let converged = false;

  for (let iter = 0; iter < maxIterations && !converged; iter++) {
    // Assignment step: assign each pixel to nearest centroid
    const newAssignments = sampledPixels.map((pixel) => {
      let minDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = labDistance(pixel.lab, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }

      return bestCluster;
    });

    // Check convergence
    converged = newAssignments.every((a, i) => a === assignments[i]);
    assignments = newAssignments;

    if (converged) {
      logger.debug(`[K-means] Converged at iteration ${iter + 1}`);
      break;
    }

    // Update step: recalculate centroids
    for (let c = 0; c < k; c++) {
      const clusterPixels = sampledPixels.filter((_, i) => assignments[i] === c);

      if (clusterPixels.length === 0) {
        // Empty cluster - reinitialize randomly
        const randomIdx = Math.floor(Math.random() * sampledPixels.length);
        centroids[c] = { ...sampledPixels[randomIdx].lab };
        continue;
      }

      const sumL = clusterPixels.reduce((sum, p) => sum + p.lab.L, 0);
      const suma = clusterPixels.reduce((sum, p) => sum + p.lab.a, 0);
      const sumb = clusterPixels.reduce((sum, p) => sum + p.lab.b, 0);

      centroids[c] = {
        L: sumL / clusterPixels.length,
        a: suma / clusterPixels.length,
        b: sumb / clusterPixels.length,
      };
    }
  }

  // Count pixels per cluster (using full pixel set, not just samples)
  const clusterCounts = new Array(k).fill(0);

  for (const pixel of pixels) {
    let minDist = Infinity;
    let bestCluster = 0;

    for (let c = 0; c < k; c++) {
      const dist = labDistance(pixel.lab, centroids[c]);
      if (dist < minDist) {
        minDist = dist;
        bestCluster = c;
      }
    }

    clusterCounts[bestCluster]++;
  }

  // Build result clusters
  const totalPixels = pixels.length;
  const clusters: ColorCluster[] = centroids.map((lab, i) => {
    const rgb = labToRgb(lab);
    return {
      hex: rgbToHex(rgb),
      lab,
      rgb,
      pixelCount: clusterCounts[i],
      proportion: clusterCounts[i] / totalPixels,
    };
  });

  // Sort by pixel count descending
  clusters.sort((a, b) => b.pixelCount - a.pixelCount);

  logger.debug(
    '[K-means] Clusters:',
    clusters.map((c) => `${c.hex} (${(c.proportion * 100).toFixed(1)}%)`)
  );

  return clusters;
}

/**
 * Detect dominant colors with automatic fallback from k=4 to k=3
 */
export async function detectDominantColors(
  imageBuffer: Buffer,
  maskBuffer: Buffer | undefined
): Promise<{ primary: string; secondary: string; tertiary: string }> {
  let clusters: ColorCluster[];

  try {
    // Try k=4 first
    clusters = await kmeansLab(imageBuffer, maskBuffer, 4);

    // If we got 4 good clusters, merge the two smallest
    if (clusters.length === 4) {
      logger.debug('[K-means] Merging smallest two clusters from k=4');
      clusters = clusters.slice(0, 3);
    }
  } catch (error) {
    logger.warn('[K-means] k=4 failed, falling back to k=3');
    clusters = await kmeansLab(imageBuffer, maskBuffer, 3);
  }

  // Ensure we have at least 3 clusters
  if (clusters.length < 3) {
    // Pad with neutral gray
    while (clusters.length < 3) {
      clusters.push({
        hex: '#808080',
        lab: { L: 50, a: 0, b: 0 },
        rgb: { r: 128, g: 128, b: 128 },
        pixelCount: 0,
        proportion: 0,
      });
    }
  }

  return {
    primary: clusters[0].hex,
    secondary: clusters[1].hex,
    tertiary: clusters[2].hex,
  };
}
