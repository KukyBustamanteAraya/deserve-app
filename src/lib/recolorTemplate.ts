/**
 * Template Mode Recolor
 * Uses sharp for pixel-perfect compositing with masks
 * This is the preferred mode when masks are available
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface RecolorOptions {
  templateBuffer: Buffer;
  colors: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  masks: {
    body: Buffer;
    sleeves: Buffer;
    trims?: Buffer;
  };
}

/**
 * Convert hex color to RGB object
 * @example "#FF5733" -> { r: 255, g: 87, b: 51 }
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

/**
 * Create a solid color layer from a mask
 * White pixels in mask become the target color
 * Preserves alpha channel from mask for blending
 */
async function createColorLayer(
  maskBuffer: Buffer,
  color: string,
  width: number,
  height: number
): Promise<Buffer> {
  const rgb = hexToRgb(color);

  // Load mask and extract alpha channel
  const mask = sharp(maskBuffer).resize(width, height, { fit: 'cover' });
  const { data: maskData, info } = await mask.raw().toBuffer({ resolveWithObject: true });

  // Create RGBA buffer with solid color and mask alpha
  const colorData = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const maskOffset = i * info.channels;

    // Use mask's first channel as alpha (white=255=opaque)
    const alpha = maskData[maskOffset];

    colorData[offset] = rgb.r;
    colorData[offset + 1] = rgb.g;
    colorData[offset + 2] = rgb.b;
    colorData[offset + 3] = alpha;
  }

  return sharp(colorData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Recolor template using sharp compositing (Template Mode)
 *
 * Process:
 * 1. Load template image
 * 2. For each mask, create a solid color layer
 * 3. Composite all layers over template using multiply blend
 * 4. Return final PNG
 *
 * Multiply blend mode preserves texture, wrinkles, and shadows
 * while changing the color.
 */
export async function recolorTemplate(options: RecolorOptions): Promise<Buffer> {
  const { templateBuffer, colors, masks } = options;

  logger.debug('[TemplateMode] Starting recolor with masks', { masks: Object.keys(masks) });

  // Load template and get dimensions
  const template = sharp(templateBuffer);
  const metadata = await template.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error('Invalid template image dimensions');
  }

  logger.debug(`[TemplateMode] Template size: ${width}x${height}`);

  // Start with original template
  let composite = template;

  // Build composite layers (body and sleeves required, trims optional)
  const layers: sharp.OverlayOptions[] = [];

  // Layer 1: Body (primary color) - REQUIRED
  logger.debug('[TemplateMode] Creating body layer', { color: colors.primary });
  const bodyLayer = await createColorLayer(masks.body, colors.primary, width, height);
  layers.push({
    input: bodyLayer,
    blend: 'multiply',
  });

  // Layer 2: Sleeves (secondary color) - REQUIRED
  logger.debug('[TemplateMode] Creating sleeves layer', { color: colors.secondary });
  const sleevesLayer = await createColorLayer(masks.sleeves, colors.secondary, width, height);
  layers.push({
    input: sleevesLayer,
    blend: 'multiply',
  });

  // Layer 3: Trims (tertiary color) - OPTIONAL
  if (masks.trims && colors.tertiary) {
    logger.debug('[TemplateMode] Creating trims layer', { color: colors.tertiary });
    const trimsLayer = await createColorLayer(masks.trims, colors.tertiary, width, height);
    layers.push({
      input: trimsLayer,
      blend: 'multiply',
    });
  }

  // Composite all layers at once
  logger.debug(`[TemplateMode] Compositing ${layers.length} layers...`);
  const result = await composite.composite(layers).png().toBuffer();

  logger.debug('[TemplateMode] Recolor complete!');
  return result;
}
