// POST /api/admin/designs/bulk - Bulk create designs from template
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError } from '@/lib/api-response';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(request: Request) {
  try {
    logger.info('Bulk design upload - Starting');
    await requireAdmin();
    logger.info('Bulk design upload - Admin check passed');

    const supabase = await createSupabaseServer();
    logger.info('Bulk design upload - Supabase client created');

    // Log request details for debugging
    const contentType = request.headers.get('content-type');
    logger.info('Bulk design upload - Request details', {
      contentType,
      method: request.method,
    });

    // Parse FormData
    const formData = await request.formData();
    logger.info('Bulk design upload - FormData parsed');

    // Extract data from form
    const templateDesignId = formData.get('template_design_id') as string;
    const images = formData.getAll('images') as File[];
    const names = formData.getAll('names') as string[];

    logger.info('Bulk design upload - Data extracted', {
      templateDesignId,
      imageCount: images.length,
      nameCount: names.length,
    });

    // Validation
    if (!templateDesignId) {
      return apiError('template_design_id is required', 400);
    }

    if (!images || images.length === 0) {
      return apiError('At least one image is required', 400);
    }

    if (!names || names.length === 0 || names.length !== images.length) {
      return apiError('Each image must have a corresponding name', 400);
    }

    // Fetch template design with mockups
    const { data: templateDesign, error: fetchError } = await supabase
      .from('designs')
      .select(
        `
        *,
        design_mockups (
          id,
          sport_id,
          product_type_slug,
          product_id,
          view_angle,
          is_primary,
          sort_order,
          sports:sport_id (
            id,
            slug,
            name
          )
        )
      `
      )
      .eq('id', templateDesignId)
      .single();

    if (fetchError || !templateDesign) {
      logger.error('Template design not found:', toSupabaseError(fetchError));
      return apiError('Template design not found', 404);
    }

    // Ensure template has at least one mockup (to copy settings from)
    if (!templateDesign.design_mockups || templateDesign.design_mockups.length === 0) {
      return apiError('Template design must have at least one mockup to copy settings from', 400);
    }

    // Use the first (primary) mockup as template for mockup settings
    const templateMockup = templateDesign.design_mockups.find((m: any) => m.is_primary) || templateDesign.design_mockups[0];

    // Track results
    const successes: string[] = [];
    const errors: { name: string; error: string }[] = [];

    // Process each image sequentially to avoid slug conflicts
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const name = names[i].trim();

      try {
        // Generate slug from name
        let slug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/^-+|-+$/g, '');

        // Check slug uniqueness and add suffix if needed
        let uniqueSlug = slug;
        let counter = 1;
        while (true) {
          const { data: existing } = await supabase.from('designs').select('id').eq('slug', uniqueSlug).single();

          if (!existing) break; // Slug is unique

          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }

        // Create design record (copy template settings)
        const { data: newDesign, error: designError } = await supabase
          .from('designs')
          .insert({
            name,
            slug: uniqueSlug,
            description: templateDesign.description,
            designer_name: templateDesign.designer_name,
            style_tags: templateDesign.style_tags || [],
            color_scheme: templateDesign.color_scheme || [],
            is_customizable: templateDesign.is_customizable,
            allows_recoloring: templateDesign.allows_recoloring,
            featured: false, // Don't auto-feature bulk uploads
            active: false, // Start as draft
          })
          .select()
          .single();

        if (designError || !newDesign) {
          logger.error(`Failed to create design for ${name}`, toSupabaseError(designError));
          errors.push({ name, error: designError?.message || 'Failed to create design' });
          continue;
        }

        // Upload image to storage
        const fileExt = image.name.split('.').pop();
        const fileName = `${newDesign.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `design-images/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('designs').upload(filePath, image, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          logger.error(`Failed to upload image for ${name}:`, toSupabaseError(uploadError));
          // Delete the design since we can't upload the image
          await supabase.from('designs').delete().eq('id', newDesign.id);
          errors.push({ name, error: `Image upload failed: ${uploadError.message}` });
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('designs').getPublicUrl(filePath);

        // Create mockup record (copy template mockup settings)
        const { error: mockupError } = await supabase.from('design_mockups').insert({
          design_id: newDesign.id,
          sport_id: templateMockup.sport_id,
          product_type_slug: templateMockup.product_type_slug,
          product_id: templateMockup.product_id || null,
          mockup_url: publicUrl,
          view_angle: templateMockup.view_angle || 'front',
          is_primary: true, // First mockup is always primary
          sort_order: 0,
        });

        if (mockupError) {
          logger.error(`Failed to create mockup for ${name}:`, mockupError);
          // Delete the design and uploaded file
          await supabase.from('designs').delete().eq('id', newDesign.id);
          await supabase.storage.from('designs').remove([filePath]);
          errors.push({ name, error: `Mockup creation failed: ${mockupError.message}` });
          continue;
        }

        // Success!
        successes.push(name);
        logger.info(`Successfully created design: ${name} (${uniqueSlug})`);
      } catch (error: any) {
        logger.error(`Unexpected error creating design ${name}:`, error);
        errors.push({ name, error: error.message || 'Unexpected error' });
      }
    }

    // Return results
    return apiSuccess(
      {
        successes,
        errors,
        total: images.length,
        successful: successes.length,
        failed: errors.length,
      },
      `Created ${successes.length} of ${images.length} designs`,
      201
    );
  } catch (error: any) {
    logger.error('Unexpected error in bulk design creation:', {
      message: error?.message,
      stack: error?.stack,
      error: error,
    });
    return apiError(`An unexpected error occurred during bulk upload: ${error?.message || 'Unknown error'}`);
  }
}

// Explicitly disable other methods
export async function GET() {
  return apiError('Method not allowed', 405);
}

export async function PATCH() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}
