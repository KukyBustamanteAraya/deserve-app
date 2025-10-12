/**
 * Simple AI Recolor API
 * POST /api/recolor-boundary
 *
 * Uses DALL-E 2 with simple prompt to recreate jersey in user's colors
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { downloadImage, uploadPng } from '@/lib/storage';
import { editMultiVariant } from '@/lib/openaiImages';
import { saveRenderResult, type RenderSpec } from '@/lib/designRequests';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for multi-variant generation

interface RecolorBoundaryRequest {
  designRequestId: string;
  baseUrl: string;
  silhouetteMaskUrl: string; // Keep for API compatibility but won't use
  colors: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  n?: number; // Number of variants to generate (default 1)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.debug('[Simple-Recolor] Request received');

  try {
    const supabase = createSupabaseServer();
    const body: RecolorBoundaryRequest = await request.json();
    const { designRequestId, baseUrl, colors, n = 1 } = body;

    // Validate required fields
    if (!designRequestId || !baseUrl || !colors) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.debug(`[Simple-Recolor] Design request: ${designRequestId}`);
    logger.debug(`[Simple-Recolor] Base: ${baseUrl}`);
    logger.debug(`[Simple-Recolor] Colors: ${JSON.stringify(colors)}`);
    logger.debug(`[Simple-Recolor] Generating ${n} variant(s)`);

    // Update status (skip if test ID)
    if (!designRequestId.toString().startsWith('test-')) {
      await supabase
        .from('design_requests')
        .update({ status: 'rendering' })
        .eq('id', designRequestId);
    }

    // Step 1: Download base image
    logger.debug('[Simple-Recolor] Downloading base image...');
    const baseBuffer = await downloadImage(baseUrl);

    // Get base dimensions
    const baseMetadata = await sharp(baseBuffer).metadata();
    const { width: baseWidth, height: baseHeight } = baseMetadata;

    if (!baseWidth || !baseHeight) {
      throw new Error('Invalid base image dimensions');
    }

    logger.debug(`[Simple-Recolor] Base dimensions: ${baseWidth}x${baseHeight}`);

    // Step 2: Build simple, direct prompt
    const prompt = buildSimpleRecolorPrompt(colors);
    logger.debug(`[Simple-Recolor] Prompt: ${prompt}`);

    // Step 3: Determine optimal size for DALL-E 2
    const size = baseWidth >= 2048 ? '2048x2048' : baseWidth >= 1536 ? '1536x1536' : '1024x1024';

    // Step 4: Create a simple full-image mask (edit entire image)
    const fullMask = await createFullImageMask(baseWidth, baseHeight);

    // Step 5: Call DALL-E 2 with simple prompt
    logger.debug(`[Simple-Recolor] Calling DALL-E 2 (${size}, n=${n})...`);
    const variants = await editMultiVariant({
      base: baseBuffer,
      mask: fullMask,
      prompt,
      size,
      n,
      retries: 3,
    });

    logger.debug(`[Simple-Recolor] Received ${variants.length} variant(s)`);

    // Step 6: Use first successful variant (simplified - no complex evaluation)
    let finalBuffer = variants[0];

    // Step 7: Resize back to original dimensions if needed
    const variantMetadata = await sharp(finalBuffer).metadata();
    if (variantMetadata.width !== baseWidth || variantMetadata.height !== baseHeight) {
      logger.debug(`[Simple-Recolor] Resizing from ${variantMetadata.width}x${variantMetadata.height} to ${baseWidth}x${baseHeight}...`);

      finalBuffer = await sharp(finalBuffer)
        .resize(baseWidth, baseHeight, { kernel: 'lanczos3' })
        .png()
        .toBuffer();

      logger.debug('[Simple-Recolor] Resizing complete');
    }

    // Step 8: Upload result
    const fileName = `${designRequestId}-recolor-${Date.now()}.png`;
    logger.debug('[Simple-Recolor] Uploading result...');
    const publicUrl = await uploadPng('renders', fileName, finalBuffer, supabase);

    // Step 9: Build render spec
    const renderSpec: RenderSpec = {
      mode: 'simple_ai',
      baseImage: baseUrl,
      colorway: colors,
      rules: {
        onlyChangeColors: true,
        keepDesignIntact: true,
      },
      export: {
        format: 'png',
        sameSizeAsBase: true,
      },
      timestamp: new Date().toISOString(),
    };

    // Step 10: Save to database (skip if test ID)
    if (!designRequestId.toString().startsWith('test-')) {
      await saveRenderResult({
        designRequestId,
        renderSpec,
        outputUrl: publicUrl,
        supabase,
      });
    }

    const duration = Date.now() - startTime;
    logger.debug(`[Simple-Recolor] ✓ Success! Duration: ${duration}ms`);
    logger.debug(`[Simple-Recolor] Output: ${publicUrl}`);

    return NextResponse.json({
      ok: true,
      outputUrl: publicUrl,
      renderSpec,
      duration,
    });
  } catch (error: any) {
    logger.error('[Simple-Recolor] ===== ERROR =====');
    logger.error('[Simple-Recolor] Message:', error?.message);
    logger.error('[Simple-Recolor] Stack:', error?.stack);

    return NextResponse.json(
      {
        error: 'Failed to recolor',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build simple, direct prompt for DALL-E 2
 * DALL-E 2 has 1000 char limit
 */
function buildSimpleRecolorPrompt(colors: {
  primary: string;
  secondary: string;
  tertiary?: string;
}): string {
  const tertiaryColor = colors.tertiary || '#808080';

  return `Recreate this exact sports jersey/uniform design using these specific colors:
- Primary color: ${colors.primary}
- Secondary color: ${colors.secondary}
- Tertiary/accent color: ${tertiaryColor}

Keep the exact same style, design patterns, stripes, graphics, and overall look.
Only change the colors to match the ones specified above.
Maintain all details, seams, wrinkles, shadows, and textures.
Do not add or remove any design elements.`;
}

/**
 * Create a simple full-image mask (white = entire image is editable)
 * DALL-E 2 requires a mask with transparency to know what to edit
 */
async function createFullImageMask(width: number, height: number): Promise<Buffer> {
  // Create a fully white PNG with alpha channel
  const whitePixel = Buffer.from([255, 255, 255, 255]); // RGBA white
  const pixelCount = width * height;
  const imageData = Buffer.alloc(pixelCount * 4);

  // Fill with white pixels
  for (let i = 0; i < pixelCount; i++) {
    imageData.set(whitePixel, i * 4);
  }

  return sharp(imageData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}
