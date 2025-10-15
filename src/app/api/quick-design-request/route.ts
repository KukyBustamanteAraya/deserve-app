// Quick Design Request API - POST create
// Handles design requests from catalog visitors without requiring upfront authentication
// Auto-creates user account, team, and design request

import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to generate unique slug
async function generateUniqueSlug(supabase: any, baseName: string): Promise<string> {
  let slug = generateSlug(baseName);
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      logger.error('Error checking slug uniqueness:', error);
      throw new Error('Failed to generate unique slug');
    }

    if (!data) {
      return slug;
    }

    // Slug exists, try with counter
    slug = `${generateSlug(baseName)}-${counter}`;
    counter++;
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Quick design request received');

    // Parse form data
    const formData = await request.formData();

    const designId = formData.get('design_id') as string;
    const sportId = parseInt(formData.get('sport_id') as string);
    let sportSlug = formData.get('sport_slug') as string;
    const teamName = formData.get('team_name') as string;
    const primaryColor = formData.get('primary_color') as string;
    const secondaryColor = formData.get('secondary_color') as string;
    const accentColor = formData.get('accent_color') as string;
    const organizationType = formData.get('organization_type') as string;
    const additionalSpecifications = formData.get('additional_specifications') as string || '';
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const customRole = formData.get('custom_role') as string || '';
    const isAuthenticated = formData.get('is_authenticated') === 'true';
    const logoFile = formData.get('logo') as File | null;

    logger.info('Form data parsed:', { designId, sportId, sportSlug, teamName, primaryColor, secondaryColor, accentColor, organizationType, email, role, isAuthenticated });

    // Create Supabase clients early for sport_slug lookup
    const supabase = createSupabaseServer();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate sport_slug if missing (fallback for old stored data)
    if (!sportSlug) {
      logger.info('sport_slug missing, attempting to fetch from database using sport_id');

      // Try to get sport slug from database
      const { data: sport } = await supabaseAdmin
        .from('sports')
        .select('slug')
        .eq('id', sportId)
        .single();

      if (sport?.slug) {
        sportSlug = sport.slug;
        logger.info('Generated sport_slug from database:', sportSlug);
      }
    }

    // Validate required fields with detailed error
    const missingFields = [];
    if (!designId) missingFields.push('design_id');
    if (!sportId) missingFields.push('sport_id');
    if (!sportSlug) missingFields.push('sport_slug (could not generate from sport_id)');
    if (!teamName) missingFields.push('team_name');
    if (!primaryColor) missingFields.push('primary_color');
    if (!secondaryColor) missingFields.push('secondary_color');
    if (!accentColor) missingFields.push('accent_color');
    if (!organizationType) missingFields.push('organization_type');
    if (!email) missingFields.push('email');
    if (!role) missingFields.push('role');

    if (missingFields.length > 0) {
      logger.error('Missing required fields:', missingFields);
      return apiValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    let userId: string;
    let userWasCreated = false;

    // Step 1: Get or create user
    if (isAuthenticated) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return apiError('Authentication failed', 401);
      }
      userId = user.id;
    } else {
      // Check if user with this email already exists
      const { data: existingUsers, error: userCheckError } = await supabaseAdmin.auth.admin.listUsers();

      if (userCheckError) {
        logger.error('Error checking existing users:', userCheckError);
        return apiError('Failed to check existing user', 500);
      }

      const existingUser = existingUsers.users.find(u => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
        logger.info('User already exists:', { email, userId });
      } else {
        // Create new user with a temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });

        if (createUserError || !newUser.user) {
          logger.error('Error creating user:', createUserError);
          return apiError('Failed to create user account', 500);
        }

        userId = newUser.user.id;
        userWasCreated = true;
        logger.info('Created new user:', { email, userId });

        // TODO: Send welcome email with password reset link
      }
    }

    // Step 2: Generate unique slug for team
    const teamSlug = await generateUniqueSlug(supabaseAdmin, teamName);

    // Step 3: Upload logo if provided
    let logoUrl: string | null = null;
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${teamSlug}-${Date.now()}.${fileExt}`;
        const filePath = `team-logos/${fileName}`;

        const fileBuffer = await logoFile.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
          .from('products')
          .upload(filePath, fileBuffer, {
            contentType: logoFile.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          logger.error('Error uploading logo:', uploadError);
          // Don't fail the whole request if logo upload fails
        } else {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('products')
            .getPublicUrl(filePath);
          logoUrl = publicUrl;
        }
      } catch (uploadError) {
        logger.error('Error processing logo upload:', uploadError);
        // Continue without logo
      }
    }

    // Step 4: Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: teamName,
        slug: teamSlug,
        sport_id: sportId,
        created_by: userId,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          tertiary: accentColor,
        },
        logo_url: logoUrl,
      })
      .select()
      .single();

    if (teamError || !team) {
      logger.error('Error creating team:', teamError);
      return apiError('Failed to create team', 500);
    }

    logger.info('Created team:', { teamId: team.id, teamSlug: team.slug });

    // Step 5: Add user to team memberships
    // Always set as 'manager' since they are creating the team and need to invite/manage members
    // Their selected role (player, coach, etc.) is stored in the design_request for context
    const membershipRole = 'manager';

    const { error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: membershipRole,
      });

    if (membershipError) {
      logger.error('Error creating team membership:', membershipError);
      // Don't fail the request, team is already created
    }

    // Step 6: Create design request
    const userType = role === 'player' ? 'player' : role === 'coach' ? 'coach' : 'manager';

    // Include role information in notes if it's a custom role
    let requestNotes = additionalSpecifications || '';
    if (role === 'other' && customRole) {
      requestNotes = `Rol: ${customRole}${requestNotes ? '\n\n' + requestNotes : ''}`;
    }

    const { data: designRequest, error: designRequestError } = await supabaseAdmin
      .from('design_requests')
      .insert({
        team_id: team.id,
        requested_by: userId,
        user_id: userId,
        user_type: userType,
        sport_slug: sportSlug,
        design_id: designId,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        feedback: requestNotes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (designRequestError) {
      logger.error('Error creating design request:', designRequestError);
      // Team is created, so return success but with warning
      return apiSuccess(
        {
          team_id: team.id,
          team_slug: team.slug,
          user_id: userId,
          user_created: userWasCreated,
          warning: 'Team created but design request creation failed',
        },
        'Team created successfully, but there was an issue with the design request',
        201
      );
    }

    logger.info('Created design request:', { requestId: designRequest.id });

    // Success!
    return apiSuccess(
      {
        team_id: team.id,
        team_slug: team.slug,
        design_request_id: designRequest.id,
        user_id: userId,
        user_created: userWasCreated,
      },
      'Design request submitted successfully! You will receive an email confirmation.',
      201
    );
  } catch (error) {
    logger.error('Unexpected error in quick design request:', error);
    return apiError('An unexpected error occurred');
  }
}

// Disable other HTTP methods
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
