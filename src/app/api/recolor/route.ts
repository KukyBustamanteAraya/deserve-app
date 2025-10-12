/**
 * Lock-Geometry Recolor API (Pixel-Perfect)
 * POST /api/recolor
 *
 * Requires masks - fails fast if masks missing
 * Never uses DALL-E - only Sharp compositing
 * Validates geometry and colors after recolor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { downloadImage, tryDownload, uploadPng } from '@/lib/storage';
import { recolorTemplate } from '@/lib/recolorTemplate';
import { assertGeometryLocked, assertColorTargets } from '@/lib/guards';
import { saveRenderResult, type RenderSpec } from '@/lib/designRequests';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Colorway {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

interface RecolorRequest {
  designRequestId: string;
  templateUrl: string;
  colors: Colorway;
  designSlug: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.debug('[Recolor API] Request received (Lock-Geometry Mode)');

  try {
    const supabase = createSupabaseServer();

    // Parse request body
    const body: RecolorRequest = await request.json();
    const { designRequestId, templateUrl, colors, designSlug } = body;

    // Validate required fields
    if (!designRequestId || !templateUrl || !colors || !designSlug) {
      return NextResponse.json(
        { error: 'Missing required fields: designRequestId, templateUrl, colors, designSlug' },
        { status: 400 }
      );
    }

    // Validate that templateUrl is not a logo
    if (templateUrl.includes('/logos/') || templateUrl.includes('logo')) {
      return NextResponse.json(
        { error: 'BAD_INPUT: templateUrl must be a product template, not a logo' },
        { status: 400 }
      );
    }

    logger.debug(`[Recolor] Design request: ${designRequestId}`);
    logger.debug(`[Recolor] Template: ${templateUrl}`);
    logger.debug(`[Recolor] Colors: ${JSON.stringify(colors)}`);
    logger.debug(`[Recolor] Design slug: ${designSlug}`);

    // Fetch design request to verify it exists
    const { data: designRequest, error: fetchError } = await supabase
      .from('design_requests')
      .select('*')
      .eq('id', designRequestId)
      .single();

    if (fetchError || !designRequest) {
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }

    // Optional: Check authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.is_admin || false;
      const isOwner = designRequest.user_id === user.id || designRequest.requested_by === user.id;

      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Update status to rendering
    await supabase
      .from('design_requests')
      .update({ status: 'rendering' })
      .eq('id', designRequestId);

    // Log activity
    if (user) {
      await supabase.from('design_request_activity').insert({
        design_request_id: designRequestId,
        action: 'recolor_started',
        description: `Lock-Geometry recolor: ${colors.primary}, ${colors.secondary || 'N/A'}, ${colors.tertiary || 'N/A'}`,
        created_by: user.id,
      });
    }

    // Download template image
    logger.debug('[Recolor] Downloading template...');
    const templateBuffer = await downloadImage(templateUrl);

    // REQUIRE masks - no fallback to AI
    logger.debug(`[Recolor] Loading masks for design: ${designSlug}`);
    const maskUrls = {
      body: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/masks/${designSlug}/body.png`,
      sleeves: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/masks/${designSlug}/sleeves.png`,
      trims: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/masks/${designSlug}/trims.png`,
    };

    const masks = {
      body: await tryDownload(maskUrls.body),
      sleeves: await tryDownload(maskUrls.sleeves),
      trims: await tryDownload(maskUrls.trims),
    };

    // Check if required masks exist
    if (!masks.body || !masks.sleeves) {
      logger.error('[Recolor] MASKS_MISSING: Required masks (body, sleeves) not found');
      return NextResponse.json(
        {
          error: 'MASKS_MISSING',
          message: `Required masks not found for design "${designSlug}". Please create body.png and sleeves.png masks in Supabase Storage under /masks/${designSlug}/`,
          missing: {
            body: !masks.body,
            sleeves: !masks.sleeves,
          },
        },
        { status: 409 }
      );
    }

    logger.debug('[Recolor] ✓ Required masks loaded (body, sleeves)');
    if (masks.trims) {
      logger.debug('[Recolor] ✓ Optional mask loaded (trims)');
    }

    // Perform pixel-perfect recoloring using template mode ONLY
    logger.debug('[Recolor] Starting pixel-perfect recolor (Template Mode only)...');
    const recoloredBuffer = await recolorTemplate({
      templateBuffer,
      colors,
      masks: {
        body: masks.body,
        sleeves: masks.sleeves,
        trims: masks.trims,
      },
    });

    // VALIDATE: Geometry must be locked
    logger.debug('[Recolor] Validating geometry lock...');
    await assertGeometryLocked({
      base: templateBuffer,
      result: recoloredBuffer,
    });

    // VALIDATE: Colors must match targets
    logger.debug('[Recolor] Validating color targets...');
    await assertColorTargets({
      result: recoloredBuffer,
      masks: {
        body: masks.body,
        sleeves: masks.sleeves,
        trims: masks.trims,
      },
      colors,
    });

    // Upload result to Supabase Storage
    const fileName = `${designRequestId}-${Date.now()}.png`;
    logger.debug('[Recolor] Uploading validated result...');
    const publicUrl = await uploadPng('renders', fileName, recoloredBuffer, supabase);

    // Build render spec
    const renderSpec: RenderSpec = {
      mode: 'template',
      colors,
      templateUrl,
      masks: {
        body: maskUrls.body,
        sleeves: maskUrls.sleeves,
        trims: masks.trims ? maskUrls.trims : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    // Save to database
    await saveRenderResult({
      designRequestId,
      renderSpec,
      outputUrl: publicUrl,
      supabase,
    });

    // Log completion
    if (user) {
      await supabase.from('design_request_activity').insert({
        design_request_id: designRequestId,
        action: 'recolor_completed',
        description: 'Pixel-perfect recolor completed with geometry validation',
        metadata: { output_url: publicUrl, mode: 'template' },
        created_by: user.id,
      });
    }

    const duration = Date.now() - startTime;
    logger.debug(`[Recolor] ✓ Success! Output: ${publicUrl}`);
    logger.debug(`[Recolor] Total time: ${duration}ms`);

    return NextResponse.json({
      ok: true,
      outputUrl: publicUrl,
      renderSpec,
      mode: 'template',
      duration,
    });
  } catch (error: any) {
    logger.error('[Recolor API] ===== ERROR =====');
    logger.error('[Recolor API] Message:', error?.message);
    logger.error('[Recolor API] Stack:', error?.stack);

    // Handle specific errors
    if (error?.message?.includes('GEOMETRY_CHANGED')) {
      return NextResponse.json(
        {
          error: 'GEOMETRY_CHANGED',
          details: error.message,
          message:
            'Silhouette drift detected. The recolored image differs from the original geometry.',
        },
        { status: 422 }
      );
    }

    if (error?.message?.includes('COLOR_TARGET_FAILED')) {
      return NextResponse.json(
        {
          error: 'COLOR_TARGET_FAILED',
          details: error.message,
          message: 'Color did not reach acceptable threshold after recoloring.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate mockup',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
