'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import { GenderBadge } from '@/components/team/orders/GenderBadge';

export default function ReviewAndSubmitPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  const {
    selectedTeams,
    teamProducts,
    teamProductDesigns,
    baseColors,
    colorOverrides,
    teamRosterEstimates,
    mockupPreference,
    institutionId,
    institutionSlug,
    generateBulkOrderId,
    bulkOrderId,
    resetWizard,
  } = useDesignRequestWizard();

  // Load team type on mount
  useEffect(() => {
    async function loadTeamType() {
      const supabase = getBrowserClient();
      const { data: team } = await supabase
        .from('teams')
        .select('team_type')
        .eq('slug', slug)
        .single();

      if (team) {
        setTeamType(team.team_type);
      }
    }

    loadTeamType();

    // Generate bulk order ID if multiple teams
    if (selectedTeams.length > 1 && !bulkOrderId) {
      generateBulkOrderId();
    }
  }, [slug, selectedTeams.length]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No user found');
      }

      // Generate bulk order ID if not already generated
      let finalBulkOrderId = bulkOrderId;
      if (selectedTeams.length > 1 && !finalBulkOrderId) {
        generateBulkOrderId();
        finalBulkOrderId = crypto.randomUUID();
      }

      const createdRequests = [];

      // Create one design request per team
      for (const team of selectedTeams) {
        const teamId = team.id || team.slug || team.name;
        const products = teamProducts[teamId] || [];
        const rosterEstimate = teamRosterEstimates[teamId] || 20;

        // Build selected_apparel JSON for this team
        const selectedApparel: any = {
          sport: team.sport_name,
          sport_id: team.sport_id,
          products: products.map(product => {
            const designs = teamProductDesigns[teamId]?.[product.id] || [];
            const overrideKey = `${teamId}:${product.id}`;
            const colors = colorOverrides[overrideKey] || baseColors;

            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              category: product.category,
              price_clp: product.price_clp,
              designs: designs.map(d => ({
                id: d.id,
                name: d.name,
                slug: d.slug,
                mockup_url: d.mockup_url,
              })),
              colors: {
                primary: colors.primary_color,
                secondary: colors.secondary_color,
                accent: colors.tertiary_color,
              },
            };
          }),
          base_colors: {
            primary: baseColors.primary_color,
            secondary: baseColors.secondary_color,
            accent: baseColors.tertiary_color,
          },
        };

        // Build brief summary for this team
        const brief = buildBriefSummaryForTeam(team, teamId);

        // Extract primary design ID (prefer first product's first design)
        let primaryDesignId: string | null = null;
        if (products.length > 0) {
          const firstProduct = products[0];
          const designs = teamProductDesigns[teamId]?.[firstProduct.id] || [];
          if (designs.length > 0) {
            primaryDesignId = designs[0].id;
          }
        }

        // Get colors for this team
        const teamColors = colorOverrides[`${teamId}:${products[0]?.id}`] || baseColors;

        // Prepare insert data
        const insertData: any = {
          team_id: institutionId || team.id,
          requested_by: user.id,
          brief: brief,
          status: 'pending',
          sport_slug: team.sport_name?.toLowerCase().replace(/\s+/g, '-'),
          selected_apparel: selectedApparel,
          primary_color: teamColors.primary_color,
          secondary_color: teamColors.secondary_color,
          accent_color: teamColors.tertiary_color,
          design_id: primaryDesignId,
          estimated_roster_size: rosterEstimate,
          mockup_preference: mockupPreference,
          mockups: {},
        };

        // Set sub_team_id for institutions
        if (institutionId) {
          insertData.sub_team_id = team.id;
        }

        // Set bulk_order_id if multiple teams
        if (selectedTeams.length > 1) {
          insertData.bulk_order_id = finalBulkOrderId;
          insertData.is_part_of_bulk = true;
        }

        console.log('[Review] Inserting design request:', {
          teamName: team.name,
          teamId: insertData.team_id,
          subTeamId: insertData.sub_team_id,
          bulkOrderId: insertData.bulk_order_id,
          productsCount: products.length,
          designId: primaryDesignId,
          rosterEstimate,
          selected_apparel: selectedApparel,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            price_clp: p.price_clp
          }))
        });

        // Insert design request
        const { data: designRequest, error: requestError } = await supabase
          .from('design_requests')
          .insert(insertData)
          .select()
          .single();

        if (requestError) {
          console.error('[Review] Error inserting design request:', requestError);
          throw requestError;
        }

        createdRequests.push(designRequest);

        // Auto-populate roster if this is an institution and has estimate
        if (institutionId && rosterEstimate > 0 && team.id) {
          try {
            console.log('[Review] Auto-populating roster for:', team.name, 'Size:', rosterEstimate);

            const populateResponse = await fetch(`/api/roster/auto-populate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sub_team_id: team.id,
                estimated_size: rosterEstimate,
              }),
            });

            if (populateResponse.ok) {
              const result = await populateResponse.json();
              console.log('[Review] Auto-population successful:', result);
            } else {
              console.error('[Review] Auto-population failed');
            }
          } catch (popError) {
            console.error('[Review] Error during auto-population:', popError);
          }
        }

        // Update team colors in database
        if (team.id) {
          const teamColorsObject = {
            primary: teamColors.primary_color,
            secondary: teamColors.secondary_color,
            accent: teamColors.tertiary_color,
            tertiary: teamColors.tertiary_color, // Backwards compatibility
          };

          if (institutionId) {
            // Update sub-team colors
            await supabase
              .from('institution_sub_teams')
              .update({ colors: teamColorsObject })
              .eq('id', team.id);
          } else {
            // Update team colors
            await supabase
              .from('teams')
              .update({ colors: teamColorsObject })
              .eq('id', team.id);
          }
        }
      }

      console.log('[Review] Successfully created', createdRequests.length, 'design requests');
      if (finalBulkOrderId) {
        console.log('[Review] Bulk order ID:', finalBulkOrderId);
      }

      // Reset wizard state
      resetWizard();

      // Redirect to success page
      router.push(`/mi-equipo/${slug}?success=design-request`);
    } catch (err: any) {
      console.error('Error submitting design request:', err);
      setError(err.message || 'Error al enviar la solicitud de diseño');
    } finally {
      setSubmitting(false);
    }
  };

  const buildBriefSummaryForTeam = (team: any, teamId: string): string => {
    const parts = [];
    const products = teamProducts[teamId] || [];

    parts.push('=== SOLICITUD DE DISEÑO ===');
    parts.push('');
    parts.push(`👥 EQUIPO: ${team.name}`);
    parts.push(`🏃 DEPORTE: ${team.sport_name}`);
    if (team.coach) {
      parts.push(`👔 ENTRENADOR: ${team.coach}`);
    }
    parts.push('');

    parts.push('👕 PRODUCTOS SELECCIONADOS:');
    products.forEach(product => {
      const designs = teamProductDesigns[teamId]?.[product.id] || [];
      const designName = designs.length > 0 ? designs[0].name : 'Sin diseño';
      parts.push(`  - ${product.name} (Diseño: ${designName})`);
    });
    parts.push('');

    parts.push('🎨 COLORES:');
    const firstProduct = products[0];
    const overrideKey = firstProduct ? `${teamId}:${firstProduct.id}` : null;
    const colors = overrideKey ? (colorOverrides[overrideKey] || baseColors) : baseColors;
    parts.push(`  Primario: ${colors.primary_color}`);
    parts.push(`  Secundario: ${colors.secondary_color}`);
    parts.push(`  Acento: ${colors.tertiary_color}`);
    parts.push('');

    const rosterEstimate = teamRosterEstimates[teamId] || 0;
    if (rosterEstimate > 0) {
      parts.push(`📊 TAMAÑO ESTIMADO DEL ROSTER: ${rosterEstimate} jugadores`);
      parts.push('');
    }

    parts.push('---');
    parts.push(`Solicitud creada: ${new Date().toLocaleString('es-CL')}`);

    return parts.join('\n');
  };

  const currentStep = teamType === 'single_team' ? 4 : 6;
  const totalWizardSteps = teamType === 'single_team' ? 4 : 6;

  const backDestination = teamType === 'single_team'
    ? `/mi-equipo/${slug}/design-request/new/colors`
    : `/mi-equipo/${slug}/design-request/new/quantities`;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title="Revisa tu solicitud"
      subtitle={selectedTeams.length > 1 ? `${selectedTeams.length} equipos seleccionados` : "Verifica la información antes de enviar"}
      onBack={() => router.push(backDestination)}
      onContinue={handleSubmit}
      canContinue={!submitting}
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="relative bg-gradient-to-br from-red-800/30 via-red-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-3 border border-red-500/30">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Multi-Team Summary */}
        {selectedTeams.length > 1 && (
          <div className="relative bg-gradient-to-br from-blue-800/30 via-blue-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📦</span>
              <h3 className="text-base font-semibold text-white">Pedido Múltiple</h3>
            </div>
            <p className="text-sm text-blue-200">
              Se crearán {selectedTeams.length} solicitudes de diseño vinculadas en un solo pedido.
            </p>
          </div>
        )}

        {/* Per-Team Summary Cards */}
        {selectedTeams.map((team) => {
          const teamId = team.id || team.slug || team.name;
          const products = teamProducts[teamId] || [];
          const rosterEstimate = teamRosterEstimates[teamId] || 0;

          // Determine gender category
          // Use team.gender_category directly (teams always have this set now)
          // Fallback: parse from name if legacy data lacks gender_category
          const teamGenderCategory = team.gender_category ||
            (team.name.toLowerCase().includes('women') || team.name.toLowerCase().includes('femenino')
              ? 'female'
              : 'male');

          return (
            <div
              key={teamId}
              className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700"
            >
              <div className="space-y-3">
                {/* Team Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{team.name}</h3>
                    <GenderBadge
                      gender={teamGenderCategory as 'male' | 'female' | 'both'}
                      size="sm"
                    />
                  </div>
                  <span className="text-xs text-gray-400">{team.sport_name}</span>
                </div>

                {/* Products */}
                <div className="border-t border-gray-700 pt-3">
                  <span className="text-xs text-gray-400 block mb-2">Productos ({products.length})</span>
                  <div className="space-y-1">
                    {products.map(product => {
                      const designs = teamProductDesigns[teamId]?.[product.id] || [];
                      const designName = designs.length > 0 ? designs[0].name : 'Sin diseño';

                      return (
                        <div key={product.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{product.name}</span>
                          <span className="text-gray-400">{designName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Colors */}
                <div className="border-t border-gray-700 pt-3">
                  <span className="text-xs text-gray-400 block mb-2">Colores</span>
                  <div className="flex gap-1">
                    {products.length > 0 && (() => {
                      const firstProduct = products[0];
                      const overrideKey = `${teamId}:${firstProduct.id}`;
                      const colors = colorOverrides[overrideKey] || baseColors;

                      return (
                        <>
                          <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: colors.primary_color }}></div>
                          <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: colors.secondary_color }}></div>
                          <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: colors.tertiary_color }}></div>
                          {colorOverrides[overrideKey] && (
                            <span className="ml-2 text-[10px] text-blue-400">Personalizado</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Roster Estimate */}
                {rosterEstimate > 0 && (
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Tamaño estimado</span>
                      <span className="text-sm font-semibold text-blue-400">{rosterEstimate} jugadores</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </WizardLayout>
  );
}
