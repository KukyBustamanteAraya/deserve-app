'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

export default function ReviewAndSubmitPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    sport_id,
    sport_name,
    selectedTeams,
    gender_category,
    both_config,
    selectedProducts,
    productDesigns,
    colorCustomization,
    quantities,
    institutionId,
    institutionSlug,
    resetWizard,
  } = useDesignRequestWizard();

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No user found');
      }

      // Build brief summary
      const brief = buildBriefSummary();

      // Build selected apparel JSON
      const selectedApparel: any = {
        sport: sport_name,
        sport_id: sport_id,
        gender_category: gender_category,
        products: {
          male: (selectedProducts.male || []).map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            category: p.category,
            designs: productDesigns.male?.[p.slug] || []
          })),
          female: (selectedProducts.female || []).map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            category: p.category,
            designs: productDesigns.female?.[p.slug] || []
          }))
        },
        colors: colorCustomization,
        quantities: quantities
      };

      // Extract colors for quick access
      const homeColors = colorCustomization.male?.home_colors || { primary: '#FFFFFF', secondary: '#FFFFFF', accent: '#FFFFFF' };

      // Create design request for each team
      const requests = [];
      for (const team of selectedTeams) {
        // For institutions: team_id = institution ID, sub_team_id = sub-team ID
        // For single teams: team_id = team ID, sub_team_id = null
        const insertData: any = {
          team_id: institutionId || team.id, // Use institutionId if available, otherwise team.id
          requested_by: user.id,
          brief: brief,
          status: 'pending',
          sport_slug: sport_name?.toLowerCase().replace(/\s+/g, '-'),
          selected_apparel: selectedApparel,
          primary_color: homeColors.primary,
          secondary_color: homeColors.secondary,
          accent_color: homeColors.accent,
        };

        // Only set sub_team_id for institutions
        if (institutionId) {
          insertData.sub_team_id = team.id;
        }

        const { data: designRequest, error: requestError } = await supabase
          .from('design_requests')
          .insert(insertData)
          .select()
          .single();

        if (requestError) throw requestError;
        requests.push(designRequest);
      }

      // Reset wizard state
      resetWizard();

      // Redirect to success page or team dashboard
      router.push(`/mi-equipo/${params.slug}?success=design-request`);
    } catch (err: any) {
      console.error('Error submitting design request:', err);
      setError(err.message || 'Error al enviar la solicitud de diseño');
    } finally {
      setSubmitting(false);
    }
  };

  const buildBriefSummary = (): string => {
    const parts = [];

    // Header
    parts.push('=== SOLICITUD DE DISEÑO ===');
    parts.push('');

    // Sport
    parts.push(`🏃 DEPORTE: ${sport_name}`);
    parts.push('');

    // Teams
    if (selectedTeams.length > 0) {
      parts.push(`👥 EQUIPOS (${selectedTeams.length}):`);
      selectedTeams.forEach(t => {
        parts.push(`  • ${t.name}${t.coach ? ` (DT: ${t.coach})` : ''}`);
      });
      parts.push('');
    }

    // Gender
    if (gender_category) {
      const genderLabel =
        gender_category === 'male' ? '♂️ Hombres' :
        gender_category === 'female' ? '♀️ Mujeres' :
        '👥 Ambos (Hombres y Mujeres)';
      parts.push(`GÉNERO: ${genderLabel}`);

      if (gender_category === 'both' && both_config) {
        if (both_config.same_design) parts.push('  ✓ Mismo diseño para ambos géneros');
        if (both_config.same_colors) parts.push('  ✓ Mismos colores para ambos géneros');
      }
      parts.push('');
    }

    // Products
    parts.push('👕 PRODUCTOS SELECCIONADOS:');
    const maleProducts = selectedProducts.male || [];
    const femaleProducts = selectedProducts.female || [];

    if (maleProducts.length > 0) {
      parts.push('  Hombres:');
      maleProducts.forEach(p => {
        const designs = productDesigns.male?.[p.slug] || [];
        const designName = designs.length > 0 ? designs[0].name : 'Sin diseño';
        parts.push(`    - ${p.name} (Diseño: ${designName})`);
      });
    }

    if (femaleProducts.length > 0 && gender_category === 'both') {
      parts.push('  Mujeres:');
      femaleProducts.forEach(p => {
        const designs = productDesigns.female?.[p.slug] || [];
        const designName = designs.length > 0 ? designs[0].name : 'Sin diseño';
        parts.push(`    - ${p.name} (Diseño: ${designName})`);
      });
    }
    parts.push('');

    // Colors
    if (colorCustomization.male) {
      parts.push('🎨 COLORES:');
      const colorConfig = colorCustomization.male;

      if (colorConfig.home_colors) {
        parts.push('  Local:');
        parts.push(`    Primario: ${colorConfig.home_colors.primary}`);
        parts.push(`    Secundario: ${colorConfig.home_colors.secondary}`);
        parts.push(`    Acento: ${colorConfig.home_colors.accent}`);
      }

      if (colorConfig.away_colors) {
        parts.push('  Visita:');
        parts.push(`    Primario: ${colorConfig.away_colors.primary}`);
        parts.push(`    Secundario: ${colorConfig.away_colors.secondary}`);
        parts.push(`    Acento: ${colorConfig.away_colors.accent}`);
      }
      parts.push('');
    }

    // Quantities
    parts.push('📊 CANTIDADES:');
    const hasQuantities = quantities.male || quantities.female;
    if (hasQuantities) {
      let totalQty = 0;
      let maleQty = 0;
      let femaleQty = 0;

      if (quantities.male) {
        maleQty = Object.values(quantities.male).reduce((sum, qty) => sum + (qty || 0), 0);
        totalQty += maleQty;
      }
      if (quantities.female) {
        femaleQty = Object.values(quantities.female).reduce((sum, qty) => sum + (qty || 0), 0);
        totalQty += femaleQty;
      }

      if (totalQty > 0) {
        if (maleQty > 0) parts.push(`  Hombres: ${maleQty} uniformes`);
        if (femaleQty > 0) parts.push(`  Mujeres: ${femaleQty} uniformes`);
        parts.push(`  TOTAL ESTIMADO: ${totalQty} uniformes`);
      } else {
        parts.push('  (Se agregarán más adelante)');
      }
    } else {
      parts.push('  (Se agregarán más adelante)');
    }
    parts.push('');

    // Footer
    parts.push('---');
    parts.push(`Solicitud creada: ${new Date().toLocaleString('es-CL')}`);

    return parts.join('\n');
  };

  const getCategoryName = (slug: string): string => {
    const nameMap: Record<string, string> = {
      'camiseta': 'Camisetas',
      'shorts': 'Shorts',
      'poleron': 'Polerones',
      'medias': 'Medias',
      'chaqueta': 'Chaquetas',
    };
    return nameMap[slug] || slug;
  };

  const getTotalQuantities = (): { male: number; female: number; total: number } => {
    let maleTotal = 0;
    let femaleTotal = 0;

    if (quantities.male) {
      // Quantities are now flat: { productSlug: quantity }
      maleTotal = Object.values(quantities.male).reduce((sum, qty) => sum + (qty || 0), 0);
    }

    if (quantities.female) {
      // Quantities are now flat: { productSlug: quantity }
      femaleTotal = Object.values(quantities.female).reduce((sum, qty) => sum + (qty || 0), 0);
    }

    return {
      male: maleTotal,
      female: femaleTotal,
      total: maleTotal + femaleTotal,
    };
  };

  const totals = getTotalQuantities();

  return (
    <WizardLayout
      step={6}
      totalSteps={6}
      title="Revisa tu solicitud"
      subtitle="Verifica la información antes de enviar"
      onBack={() => router.push(`/mi-equipo/${params.slug}/design-request/new/quantities`)}
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

        {/* Main Summary Card */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
          <div className="space-y-3">
            {/* Sport & Teams */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Deporte</span>
              <span className="text-white font-medium">{sport_name}</span>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <span className="text-xs text-gray-400 block mb-2">Equipos</span>
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map(team => (
                  <span
                    key={team.id || team.name}
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30"
                  >
                    {team.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="border-t border-gray-700 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Género</span>
                <span className="text-white flex items-center gap-1">
                  {gender_category === 'male' ? '♂️ Hombres' : gender_category === 'female' ? '♀️ Mujeres' : '👥 Ambos'}
                </span>
              </div>
            </div>

            {/* Products */}
            <div className="border-t border-gray-700 pt-3">
              <span className="text-xs text-gray-400 block mb-2">Productos</span>
              <div className="space-y-2">
                {(gender_category === 'male' || gender_category === 'both') && (
                  <div>
                    {(selectedProducts.male || []).map(product => {
                      const designs = productDesigns.male?.[product.slug] || [];
                      return (
                        <div key={product.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{product.name}</span>
                          <span className="text-gray-400">{designs.length > 0 ? designs[0].name : 'Sin diseño'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            {colorCustomization.male && (colorCustomization.male.home_colors || colorCustomization.male.away_colors) && (
              <div className="border-t border-gray-700 pt-3">
                <span className="text-xs text-gray-400 block mb-2">Colores</span>
                <div className="flex gap-4">
                  {colorCustomization.male.home_colors && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Local:</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.home_colors.primary }}></div>
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.home_colors.secondary }}></div>
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.home_colors.accent }}></div>
                      </div>
                    </div>
                  )}
                  {colorCustomization.male.away_colors && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Visita:</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.away_colors.primary }}></div>
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.away_colors.secondary }}></div>
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: colorCustomization.male.away_colors.accent }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantities */}
            {totals.total > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Cantidad estimada</span>
                  <span className="text-lg font-bold text-blue-400">{totals.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button Override */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new/quantities`)}
            className="px-4 py-2 text-sm bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-200 border border-gray-700 rounded-lg hover:bg-gray-800 font-medium transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-8 py-3 text-sm rounded-lg font-bold transition-colors ${
              submitting
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg'
            }`}
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
