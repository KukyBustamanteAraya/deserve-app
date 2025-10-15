'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuickDesignRequest, UserRole } from '@/store/quick-design-request';
import { createClient } from '@/lib/supabase/client';

export default function OrganizationStep() {
  const router = useRouter();
  const params = useParams();
  const designSlug = params.slug as string;
  const supabase = createClient();

  const {
    designId,
    designName,
    sportId,
    teamName,
    primaryColor,
    secondaryColor,
    accentColor,
    mockups,
    selectedTeamId,
    organizationType,
    logoFile,
    logoUrl,
    additionalSpecifications,
    email,
    role,
    customRole,
    isAuthenticated,
    setOrganizationType,
    setLogoFile,
    setLogoUrl,
    setAdditionalSpecifications,
    setEmail,
    setRole,
    setCustomRole,
    setIsAuthenticated,
    canProceedToStep3,
    reset,
  } = useQuickDesignRequest();

  const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);
  const [teamHasLogo, setTeamHasLogo] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Accordion state - track which section is expanded
  const [expandedSection, setExpandedSection] = useState<'organizationType' | 'role' | 'logo'>('organizationType');

  // Check if component has mounted
  useEffect(() => {
    setMounted(true);
    // Clear organization type and role on mount to ensure nothing is pre-selected
    setOrganizationType(null);
    setRole(null);
    setCustomRole('');
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        setEmail(user.email || '');
      }
    };
    checkAuth();
  }, []);

  // Auto-expand next section based on form completion
  useEffect(() => {
    if (!mounted || selectedTeamId) return; // Skip if not mounted or using existing team

    // If both organizationType and role are filled, expand logo
    if (organizationType && role && (role !== 'other' || customRole.trim())) {
      setExpandedSection('logo');
    }
    // If organizationType is filled, expand role
    else if (organizationType) {
      setExpandedSection('role');
    }
    // Otherwise, keep organizationType expanded
    else {
      setExpandedSection('organizationType');
    }
  }, [organizationType, role, customRole, mounted, selectedTeamId]);

  // Check if selected team has a logo
  useEffect(() => {
    const checkTeamLogo = async () => {
      if (selectedTeamId) {
        const { data: team } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('id', selectedTeamId)
          .single();

        setTeamHasLogo(!!team?.logo_url);
      }
    };
    checkTeamLogo();
  }, [selectedTeamId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    setUploadError('');
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      setLogoUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Prepare form data for file upload
      const formData = new FormData();

      // Get sportSlug from store, or generate from sportName if missing
      const { sportSlug, sportName } = useQuickDesignRequest.getState();
      const finalSportSlug = sportSlug || sportName?.toLowerCase().replace(/\s+/g, '-') || '';

      formData.append('design_id', designId || '');
      formData.append('sport_id', sportId?.toString() || '');
      formData.append('sport_slug', finalSportSlug);
      formData.append('team_name', teamName);
      formData.append('primary_color', primaryColor);
      formData.append('secondary_color', secondaryColor);
      formData.append('accent_color', accentColor);
      formData.append('organization_type', organizationType || '');
      formData.append('additional_specifications', additionalSpecifications);
      formData.append('email', email);
      formData.append('role', role || '');
      formData.append('custom_role', customRole || '');
      formData.append('is_authenticated', isAuthenticated.toString());

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/quick-design-request', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar el pedido');
      }

      // Success! Show success message briefly, then redirect
      setShowSuccess(true);
      const teamSlug = result.data?.team_slug;

      // Wait 1.5 seconds to show success message, then redirect
      setTimeout(() => {
        reset(); // Clear wizard state
        if (teamSlug) {
          router.push(`/mi-equipo/${teamSlug}?request_created=true`);
        } else {
          router.push('/catalog?request_created=true');
        }
      }, 1500);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Error al enviar el pedido');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/designs/${designSlug}`);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const selectedMockup = mockups[selectedMockupIndex];

  // Base roles for single teams
  const baseRoles: { value: UserRole; label: string; description: string; icon: string }[] = [
    {
      value: 'player',
      label: 'Jugador',
      description: 'Soy parte del equipo',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      value: 'coach',
      label: 'Entrenador',
      description: 'Dirijo y entreno al equipo',
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    {
      value: 'manager',
      label: 'Manager',
      description: 'Gestiono y administro el equipo',
      icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    },
  ];

  // Additional role for institutions
  const otherRole = {
    value: 'other' as UserRole,
    label: 'Otro',
    description: 'Especifica tu rol',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  // Show "Other" option only for institutions
  const roles = organizationType === 'institution' ? [...baseRoles, otherRole] : baseRoles;

  // Validation: need org type, role, and email (if not authenticated)
  const canSubmit = selectedTeamId
    ? true
    : canProceedToStep3() && (isAuthenticated || (email.trim() && isValidEmail(email)));

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Design Image Section - matching design page layout */}
        <div className="space-y-4 mb-2 fixed top-24 left-0 right-0 md:relative z-40 md:z-auto px-4 md:px-0 pt-2 md:pt-0 pb-2 md:pb-0">
          {/* Main Mockup Image */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden aspect-square flex items-center justify-center shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            {selectedMockup ? (
              <img
                src={selectedMockup.mockup_url}
                alt={`${designName} - ${selectedMockup.view_angle}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-center p-12">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-300">No hay mockup disponible para este deporte</p>
              </div>
            )}
          </div>

          {/* Mockup Thumbnails */}
          {mockups.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {mockups.map((mockup, index) => (
                <button
                  key={mockup.id}
                  onClick={() => setSelectedMockupIndex(index)}
                  className={`aspect-square rounded-lg border-2 overflow-hidden transition-all backdrop-blur-sm ${
                    index === selectedMockupIndex
                      ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/20'
                      : 'border-gray-700 hover:border-[#e21c21]/50 bg-gray-800/50'
                  }`}
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <img
                    src={mockup.mockup_url}
                    alt={`Vista ${mockup.view_angle}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer for mobile fixed image */}
        <div className="h-[calc(100vw-2rem)] md:h-0"></div>

        {/* Organization Form - matching design page card styling */}
        <div className="space-y-2.5 mt-4 md:mt-0">
          {/* Only show organization type for NEW teams */}
          {!selectedTeamId && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              {/* Collapsible Header */}
              <button
                onClick={() => setExpandedSection('organizationType')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-300">
                    ¿Es para un equipo individual o una institución? *
                  </span>
                  {organizationType && expandedSection !== 'organizationType' && (
                    <span className="text-[10px] sm:text-xs text-[#e21c21] font-medium">
                      {organizationType === 'single_team' ? 'Equipo Individual' : 'Institución'}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${
                    expandedSection === 'organizationType' ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Collapsible Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  expandedSection === 'organizationType'
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                  <div className="grid grid-cols-2 gap-2">
                  {/* Single Team */}
                  <button
                    onClick={() => setOrganizationType('single_team')}
                    className={`relative p-3 rounded-lg border-2 transition-all overflow-hidden group ${
                      organizationType === 'single_team'
                        ? 'border-[#e21c21] bg-[#e21c21]/10'
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative flex flex-col items-center text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                        organizationType === 'single_team' ? 'bg-[#e21c21]/20' : 'bg-gray-700'
                      }`}>
                        <svg className={`w-5 h-5 ${organizationType === 'single_team' ? 'text-[#e21c21]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className={`text-xs font-semibold mb-0.5 ${organizationType === 'single_team' ? 'text-[#e21c21]' : 'text-white'}`}>
                        Equipo Individual
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Un solo equipo
                      </p>
                    </div>
                  </button>

                  {/* Institution */}
                  <button
                    onClick={() => setOrganizationType('institution')}
                    className={`relative p-3 rounded-lg border-2 transition-all overflow-hidden group ${
                      organizationType === 'institution'
                        ? 'border-[#e21c21] bg-[#e21c21]/10'
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative flex flex-col items-center text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                        organizationType === 'institution' ? 'bg-[#e21c21]/20' : 'bg-gray-700'
                      }`}>
                        <svg className={`w-5 h-5 ${organizationType === 'institution' ? 'text-[#e21c21]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className={`text-xs font-semibold mb-0.5 ${organizationType === 'institution' ? 'text-[#e21c21]' : 'text-white'}`}>
                        Institución
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Colegio, club, etc.
                      </p>
                    </div>
                  </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection - Only show for NEW teams */}
          {!selectedTeamId && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              {/* Collapsible Header */}
              <button
                onClick={() => setExpandedSection('role')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-300">
                    ¿Cuál es tu rol? *
                  </span>
                  {role && expandedSection !== 'role' && (
                    <span className="text-[10px] sm:text-xs text-[#e21c21] font-medium">
                      {role === 'player' && 'Jugador'}
                      {role === 'coach' && 'Entrenador'}
                      {role === 'manager' && 'Manager'}
                      {role === 'other' && (customRole || 'Otro')}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${
                    expandedSection === 'role' ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Collapsible Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  expandedSection === 'role'
                    ? 'max-h-[500px] opacity-100'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-2">
                    Selecciona la opción que mejor te describe
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roles.map((roleOption) => (
                    <button
                      key={roleOption.value}
                      onClick={() => {
                        setRole(roleOption.value);
                        // Clear customRole when switching away from "other"
                        if (roleOption.value !== 'other') {
                          setCustomRole('');
                        }
                      }}
                      className={`relative p-2 sm:p-2.5 rounded-lg border-2 transition-all text-left overflow-hidden group ${
                        role === roleOption.value
                          ? 'border-[#e21c21] bg-[#e21c21]/10'
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="relative flex items-start gap-2">
                        <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                          role === roleOption.value ? 'bg-[#e21c21]/20' : 'bg-gray-700'
                        }`}>
                          <svg
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${role === roleOption.value ? 'text-[#e21c21]' : 'text-gray-400'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleOption.icon} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-[11px] sm:text-xs mb-0.5 ${role === roleOption.value ? 'text-[#e21c21]' : 'text-white'}`}>
                            {roleOption.label}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">
                            {roleOption.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Role Input - Only show when "Other" is selected */}
                {role === 'other' && (
                  <div className="mt-2">
                    <label htmlFor="custom-role" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1">
                      Especifica tu rol *
                    </label>
                    <input
                      id="custom-role"
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Ej: Presidente del club..."
                      className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none"
                    />
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Logo Upload - Show for new teams OR existing teams without logo */}
          {(!selectedTeamId || !teamHasLogo) && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              {/* Collapsible Header */}
              <button
                onClick={() => setExpandedSection('logo')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-300">
                    Logo del equipo (opcional)
                  </span>
                  {logoFile && expandedSection !== 'logo' && (
                    <span className="text-[10px] sm:text-xs text-[#e21c21] font-medium">
                      {logoFile.name}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${
                    expandedSection === 'logo' ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Collapsible Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  expandedSection === 'logo'
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                  {!logoUrl ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full p-3 border-2 border-dashed border-gray-600 rounded-lg hover:border-[#e21c21]/50 transition-all overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="relative flex flex-col items-center text-center">
                        <svg className="w-7 h-7 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-white font-medium text-xs mb-0.5">Haz clic para subir</p>
                        <p className="text-[10px] text-gray-400">PNG, JPG o GIF (máx. 5MB)</p>
                      </div>
                    </button>
                    {uploadError && (
                      <p className="mt-1.5 text-[10px] sm:text-xs text-red-400">{uploadError}</p>
                    )}
                  </div>
                ) : (
                  <div className="relative bg-gray-800/50 border border-gray-600 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-10 h-10 object-cover rounded border border-gray-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-xs truncate">{logoFile?.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveLogo}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Email Input - Only show for non-authenticated users */}
          {!selectedTeamId && !isAuthenticated && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative">
                <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1">
                  Email *
                </label>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-2">
                  Te enviaremos actualizaciones sobre tu pedido
                </p>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none ${
                    email && !isValidEmail(email)
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:border-[#e21c21]'
                  }`}
                />
                {email && !isValidEmail(email) && (
                  <p className="mt-1 text-[10px] sm:text-xs text-red-400">Por favor ingresa un email válido</p>
                )}
              </div>
            </div>
          )}

          {/* Info message for non-authenticated users */}
          {!selectedTeamId && !isAuthenticated && (
            <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 sm:p-3">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-200 text-[10px] sm:text-xs leading-relaxed">
                    <span className="font-semibold">Información importante:</span> Crearemos una cuenta para ti automáticamente para que puedas hacer seguimiento de tu pedido.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="relative bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 sm:p-3 animate-fade-in">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-200 text-xs sm:text-sm font-semibold">¡Solicitud enviada con éxito!</p>
                  <p className="text-green-200 text-xs sm:text-sm">Redirigiendo a tu equipo...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="relative bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 sm:p-3">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-200 text-xs sm:text-sm font-semibold">Error</p>
                  <p className="text-red-200 text-xs sm:text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={handleBack}
              className="relative px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-700/70"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`relative flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 cursor-pointer'
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                {isSubmitting ? 'Enviando...' : 'Enviar pedido'}
                {!isSubmitting && (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
