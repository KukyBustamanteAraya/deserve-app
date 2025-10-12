import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
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

    if (!designRequestId) {
      return NextResponse.json({ error: 'designRequestId is required' }, { status: 400 });
    }

    // Get all files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('mockup_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Verify design request exists
    const { data: designRequest, error: fetchError } = await supabase
      .from('design_requests')
      .select('id, team_slug, mockup_urls')
      .eq('id', designRequestId)
      .single();

    if (fetchError || !designRequest) {
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }

    const uploadedUrls: string[] = [];

    // Upload each file to Supabase Storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${designRequestId}_mockup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${fileExt}`;
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
        logger.error('Upload error:', uploadError);
        throw new Error(`Failed to upload file ${file.name}: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('design-mockups')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    // Append new URLs to existing mockup_urls array
    const existingMockups = designRequest.mockup_urls || [];
    const updatedMockups = [...existingMockups, ...uploadedUrls];

    // Update design request with new mockup URLs
    const { error: updateError } = await supabase
      .from('design_requests')
      .update({
        mockup_urls: updatedMockups,
        updated_at: new Date().toISOString(),
      })
      .eq('id', designRequestId);

    if (updateError) {
      logger.error('Update error:', updateError);
      throw new Error('Failed to update design request with mockup URLs');
    }

    // Log activity
    await supabase.from('design_request_activity').insert({
      design_request_id: designRequestId,
      action: 'mockups_uploaded',
      description: `Admin uploaded ${uploadedUrls.length} new mockup(s)`,
      metadata: { uploadedUrls },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedUrls.length,
      urls: uploadedUrls,
      message: `Successfully uploaded ${uploadedUrls.length} mockup(s)`,
    });
  } catch (error: any) {
    logger.error('Error uploading mockups:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
