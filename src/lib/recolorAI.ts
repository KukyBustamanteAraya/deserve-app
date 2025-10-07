/**
 * AI Mode Recolor
 * Uses OpenAI gpt-image-1 or dall-e-2 for single-pass recoloring
 * This is the fallback mode when masks are not available
 */

import { editOnce } from './openaiImages';
import sharp from 'sharp';

export interface RecolorAIOptions {
  templateBuffer: Buffer;
  colors: {
    primary: string;
    secondary?: string;
    tertiary?: string;
  };
  masks?: {
    body?: Buffer;
    sleeves?: Buffer;
    trims?: Buffer;
  };
}

/**
 * Recolor template using OpenAI image editing (AI Mode)
 *
 * Two approaches:
 * 1. With masks: Use one AI edit per layer, then composite locally with sharp
 * 2. Without masks: Single AI edit with comprehensive prompt
 *
 * Both approaches are single-pass (no iterative degradation)
 */
export async function recolorAI(options: RecolorAIOptions): Promise<Buffer> {
  const { templateBuffer, colors, masks } = options;

  console.log('[AIMode] Starting AI recolor...');

  // Approach 1: Masks available - do one edit per layer, composite locally
  if (masks && (masks.body || masks.sleeves || masks.trims)) {
    console.log('[AIMode] Using mask-based approach with local compositing');

    const layers: sharp.OverlayOptions[] = [];
    const template = sharp(templateBuffer);
    const metadata = await template.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid template image dimensions');
    }

    // Edit body with primary color
    if (masks.body && colors.primary) {
      console.log(`[AIMode] Recoloring body to ${colors.primary}`);
      const prompt = `Recolor only the white pixels of the mask to ${colors.primary}. Preserve all fabric texture, wrinkles, seams, and shadows. Do not modify logos or text.`;

      const editedBody = await editOnce({
        base: templateBuffer,
        mask: masks.body,
        prompt,
        size: width >= 1536 ? '1536x1536' : '1024x1024',
      });

      layers.push({
        input: editedBody,
        blend: 'over',
      });
    }

    // Edit sleeves with secondary color
    if (masks.sleeves && colors.secondary) {
      console.log(`[AIMode] Recoloring sleeves to ${colors.secondary}`);
      const prompt = `Recolor only the white pixels of the mask to ${colors.secondary}. Preserve all fabric texture, wrinkles, seams, and shadows. Do not modify logos or text.`;

      const editedSleeves = await editOnce({
        base: templateBuffer,
        mask: masks.sleeves,
        prompt,
        size: width >= 1536 ? '1536x1536' : '1024x1024',
      });

      layers.push({
        input: editedSleeves,
        blend: 'over',
      });
    }

    // Edit trims with tertiary color
    if (masks.trims && colors.tertiary) {
      console.log(`[AIMode] Recoloring trims to ${colors.tertiary}`);
      const prompt = `Recolor only the white pixels of the mask to ${colors.tertiary}. Preserve all fabric texture, wrinkles, seams, and shadows. Do not modify logos or text.`;

      const editedTrims = await editOnce({
        base: templateBuffer,
        mask: masks.trims,
        prompt,
        size: width >= 1536 ? '1536x1536' : '1024x1024',
      });

      layers.push({
        input: editedTrims,
        blend: 'over',
      });
    }

    // Composite all layers
    if (layers.length > 0) {
      console.log(`[AIMode] Compositing ${layers.length} layers...`);
      return template.composite(layers).png().toBuffer();
    }

    return template.png().toBuffer();
  }

  // Approach 2: No masks - single AI edit with comprehensive prompt
  console.log('[AIMode] Using maskless approach (single comprehensive prompt)');

  const colorDescriptions = [];
  if (colors.primary) colorDescriptions.push(`main body to ${colors.primary}`);
  if (colors.secondary) colorDescriptions.push(`sleeves/accents to ${colors.secondary}`);
  if (colors.tertiary) colorDescriptions.push(`trims/borders to ${colors.tertiary}`);

  const prompt = `Recolor this sports jersey: change ${colorDescriptions.join(', ')}. Keep the exact same design composition, fabric texture, wrinkles, seams, highlights, and shadows. Do not alter logos, text, or background. Preserve all visual details except colors.`;

  console.log(`[AIMode] Prompt: ${prompt}`);

  const metadata = await sharp(templateBuffer).metadata();
  const { width, height } = metadata;

  const result = await editOnce({
    base: templateBuffer,
    prompt,
    size: width && width >= 1536 ? '1536x1536' : '1024x1024',
  });

  console.log('[AIMode] Recolor complete!');
  return result;
}
