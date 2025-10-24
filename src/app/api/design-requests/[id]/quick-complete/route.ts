import { createSupabaseServer } from '@/lib/supabase/server-client';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServer();

  // Use admin client to bypass RLS for sub-team creation
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const {
      institutionId,
      institutionName,
      sportId,
      sportName,
      sportSlug,
      subTeamName,
      genderCategory,
      rosterSize,
      productIds
    } = await req.json();

    // Validate required fields
    if (!institutionId || !institutionName || !sportId || !subTeamName || !genderCategory || !rosterSize || !productIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[Quick-Complete] ========================================');
    console.log('[Quick-Complete] Starting setup for:', { institutionId, institutionName, subTeamName, sportId, sportSlug, genderCategory, rosterSize, productCount: productIds.length });
    console.log('[Quick-Complete] ========================================');

    // 0. Update institution name if provided (using admin client to bypass RLS)
    const { error: nameUpdateError } = await supabaseAdmin
      .from('teams')
      .update({ name: institutionName })
      .eq('id', institutionId)
      .eq('team_type', 'institution'); // Safety check

    if (nameUpdateError) {
      console.error('[Quick-Complete] Error updating institution name:', nameUpdateError);
      return NextResponse.json(
        { error: 'Failed to update institution name', details: nameUpdateError.message },
        { status: 500 }
      );
    }

    console.log('[Quick-Complete] Institution name updated successfully');

    // Generate slug for sub-team
    const generateSlug = (name: string) => {
      return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const subTeamSlug = generateSlug(subTeamName);

    // 1. Create institution_sub_teams record using admin client
    const { data: subTeam, error: subTeamError } = await supabaseAdmin
      .from('institution_sub_teams')
      .insert({
        institution_team_id: institutionId,
        sport_id: sportId,
        name: subTeamName,
        slug: subTeamSlug,
        gender_category: genderCategory,
        active: true
      })
      .select()
      .single();

    if (subTeamError) {
      console.error('[Quick-Complete] Error creating sub-team:', subTeamError);
      return NextResponse.json(
        { error: 'Failed to create sub-team', details: subTeamError.message },
        { status: 500 }
      );
    }

    console.log('[Quick-Complete] Sub-team created:', { id: subTeam.id, name: subTeam.name });

    // 1b. Create placeholder roster members for the sub-team
    const placeholderMembers = Array.from({ length: rosterSize }, (_, i) => ({
      sub_team_id: subTeam.id,
      player_name: `Jugador ${i + 1}`,
      jersey_number: i + 1,  // INTEGER not string!
      size: null,
      email: null,
      position: null
    }));

    const { error: membersError } = await supabaseAdmin
      .from('institution_sub_team_members')
      .insert(placeholderMembers);

    if (membersError) {
      console.error('[Quick-Complete] ❌ CRITICAL: Error creating roster members:', membersError);
      return NextResponse.json(
        { error: 'Failed to create roster members', details: membersError.message },
        { status: 500 }
      );
    }

    console.log('[Quick-Complete] ✅ Created', rosterSize, 'placeholder roster members');

    // 1c. Add sport to institution's sports array if not already there
    const { data: institution, error: fetchInstitutionError } = await supabaseAdmin
      .from('teams')
      .select('sports')
      .eq('id', institutionId)
      .single();

    if (!fetchInstitutionError && institution) {
      const currentSports = institution.sports || [];
      if (!currentSports.includes(sportSlug)) {
        const updatedSports = [...currentSports, sportSlug];
        await supabaseAdmin
          .from('teams')
          .update({ sports: updatedSports })
          .eq('id', institutionId);
        console.log('[Quick-Complete] Added sport to institution:', sportSlug);
      }
    }

    // 2. Fetch full product details to build selected_apparel
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        category,
        price_clp,
        product_type_slug
      `)
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: productsError.message },
        { status: 500 }
      );
    }

    // 3. Get design request details (colors and design)
    const { data: designRequest, error: drError } = await supabaseAdmin
      .from('design_requests')
      .select(`
        design_id,
        primary_color,
        secondary_color,
        accent_color,
        sport_slug,
        designs (
          id,
          name,
          slug
        )
      `)
      .eq('id', params.id)
      .single();

    if (drError) {
      console.error('Error fetching design request:', drError);
      return NextResponse.json(
        { error: 'Failed to fetch design request', details: drError.message },
        { status: 500 }
      );
    }

    // 4. Build selected_apparel JSON
    const selectedApparel = {
      sport: sportName,
      sport_id: sportId,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        price_clp: p.price_clp,
        designs: [{
          id: designRequest.designs.id,
          name: designRequest.designs.name,
          slug: designRequest.designs.slug
        }],
        colors: {
          primary: designRequest.primary_color,
          secondary: designRequest.secondary_color,
          accent: designRequest.accent_color
        }
      })),
      base_colors: {
        primary: designRequest.primary_color,
        secondary: designRequest.secondary_color,
        accent: designRequest.accent_color
      }
    };

    // 5. Update design_request with complete data using admin client
    const { error: updateError } = await supabaseAdmin
      .from('design_requests')
      .update({
        sub_team_id: subTeam.id,
        selected_apparel: selectedApparel,
        estimated_roster_size: rosterSize,
        mockup_preference: 'both' // Default to both home/away
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating design request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update design request', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Quick-Complete] ========================================');
    console.log('[Quick-Complete] ✅ ALL OPERATIONS COMPLETED SUCCESSFULLY:');
    console.log('[Quick-Complete]   - Institution ID:', institutionId);
    console.log('[Quick-Complete]   - Institution Name:', institutionName);
    console.log('[Quick-Complete]   - Sub-Team ID:', subTeam.id);
    console.log('[Quick-Complete]   - Sub-Team Name:', subTeam.name);
    console.log('[Quick-Complete]   - Sub-Team Slug:', subTeam.slug);
    console.log('[Quick-Complete]   - Sport Added:', sportSlug);
    console.log('[Quick-Complete]   - Roster Members Created:', rosterSize);
    console.log('[Quick-Complete]   - Design Request ID:', params.id);
    console.log('[Quick-Complete] ========================================');

    return NextResponse.json({
      success: true,
      subTeamId: subTeam.id,
      message: 'Team setup completed successfully'
    });
  } catch (error) {
    console.error('[Quick-Complete] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
