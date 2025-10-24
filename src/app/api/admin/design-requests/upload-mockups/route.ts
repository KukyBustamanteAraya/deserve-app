import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Check admin privileges
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const designRequestId = formData.get('designRequestId') as string;
    const slot = formData.get('slot') as string | null; // e.g., 'home_front', 'away_back'
    const file = formData.get('file') as File | null;

    if (!designRequestId) {
      return NextResponse.json({ error: 'designRequestId is required' }, { status: 400 });
    }

    if (!file || !slot) {
      return NextResponse.json({ error: 'file and slot are required' }, { status: 400 });
    }

    // Validate slot format
    const validSlots = ['home_front', 'home_back', 'away_front', 'away_back'];
    if (!validSlots.includes(slot)) {
      return NextResponse.json({ error: 'Invalid slot. Must be one of: home_front, home_back, away_front, away_back' }, { status: 400 });
    }

    // Verify design request exists
    const { data: designRequest, error: fetchError } = await supabase
      .from('design_requests')
      .select('id, team_slug, mockup_urls, mockups, mockup_preference')
      .eq('id', designRequestId)
      .single();

    if (fetchError || !designRequest) {
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${designRequestId}_${slot}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${fileExt}`;
    const filePath = `mockups/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('design-mockups')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Upload error:', toSupabaseError(uploadError));
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('design-mockups')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Parse slot to update correct JSONB path
    const [colorScheme, view] = slot.split('_'); // e.g., ['home', 'front'] or ['away', 'back']

    // Get existing mockups JSONB or initialize empty object
    const existingMockups = designRequest.mockups || {};

    // Update the specific slot in JSONB structure
    const updatedMockups = {
      ...existingMockups,
      [colorScheme]: {
        ...(existingMockups[colorScheme] || {}),
        [view]: publicUrl,
      },
    };

    // Update design request with new structured mockup
    const { error: updateError } = await supabase
      .from('design_requests')
      .update({
        mockups: updatedMockups,
        updated_at: new Date().toISOString(),
      })
      .eq('id', designRequestId);

    if (updateError) {
      logger.error('Update error:', toSupabaseError(updateError));
      throw new Error('Failed to update design request with mockup URL');
    }

    // Log activity
    await supabase.from('design_request_activity').insert({
      design_request_id: designRequestId,
      action: 'mockup_uploaded',
      description: `Admin uploaded ${slot.replace('_', ' ')} mockup`,
      metadata: { slot, url: publicUrl },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      slot,
      url: publicUrl,
      message: `Successfully uploaded ${slot.replace('_', ' ')} mockup`,
    });
  } catch (error: any) {
    logger.error('Error uploading mockup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
