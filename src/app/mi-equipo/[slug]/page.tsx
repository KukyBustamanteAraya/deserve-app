'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { SplitPayButton } from '@/components/payment/SplitPayButton';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url?: string;
  owner_id: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  created_at: string;
  output_url?: string;
  mockup_urls?: string[];
  render_spec?: any;
}

export default function TeamPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [designRequest, setDesignRequest] = useState<DesignRequest | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [params.slug]);

  // Poll for design request updates when status is "rendering"
  useEffect(() => {
    if (designRequest?.status === 'rendering') {
      const interval = setInterval(() => {
        loadTeamData();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [designRequest?.status]);

  // Trigger page entrance animation and celebration
  useEffect(() => {
    // Check if this is a fresh navigation from customization
    const isNewTeam = sessionStorage.getItem('newTeamCreated');

    // Fade in the page
    setTimeout(() => setPageVisible(true), 100);

    // Show celebration if new team
    if (isNewTeam === 'true') {
      setTimeout(() => setShowCelebration(true), 800);
      setTimeout(() => setShowCelebration(false), 4000);
      sessionStorage.removeItem('newTeamCreated');
    }
  }, []);

  const loadTeamData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Get team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Generate share link
      const origin = window.location.origin;
      setShareLink(`${origin}/join/${params.slug}`);

      // Get team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_memberships')
        .select('user_id, role')
        .eq('team_id', teamData.id);

      if (membersError) throw membersError;

      // Set members directly - profile details not available due to auth.users access restrictions
      if (membersData && membersData.length > 0) {
        setMembers(membersData);
      } else {
        setMembers([]);
      }

      // Get design request with mockup data
      const { data: designData, error: designError } = await supabase
        .from('design_requests')
        .select('id, status, product_name, created_at, output_url, mockup_urls, render_spec')
        .eq('team_slug', params.slug)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!designError && designData) {
        setDesignRequest(designData);
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !team) return;

    setInviting(true);
    try {
      // Generate invite token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Create invite in database
      const { error: dbError } = await supabase
        .from('team_invites')
        .insert({
          team_id: team.id,
          email: inviteEmail,
          token,
        });

      if (dbError) throw dbError;

      // Send email via API route
      const response = await fetch('/api/send-team-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          teamSlug: params.slug,
          teamName: team.name,
          inviterName: user?.email || 'Un compañero de equipo',
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar invitación');
      }

      alert(`¡Invitación enviada a ${inviteEmail}! Revisa tu email.`);
      setInviteEmail('');
    } catch (error: any) {
      console.error('Error sending invite:', error);
      alert(error.message || 'Error al enviar invitación. Intenta de nuevo.');
    } finally {
      setInviting(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('¡Link copiado!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Equipo no encontrado</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === team.owner_id;

  return (
    <div
      className={`min-h-screen bg-gray-50 transition-opacity duration-700 ${
        pageVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Confetti animation */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: i % 3 === 0 ? team.colors.primary : i % 3 === 1 ? team.colors.secondary : team.colors.accent,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Welcome Message */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce-in">
            <div
              className="bg-white rounded-2xl shadow-2xl px-12 py-8 border-4"
              style={{ borderColor: team.colors.primary }}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: team.colors.primary }}>
                ¡Bienvenido a tu equipo!
              </h2>
              <p className="text-gray-600">Tu diseño está siendo procesado</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner with team colors */}
      <CustomizeBanner
        teamName={team.name}
        customColors={team.colors}
        customLogoUrl={team.logo_url}
        readonly={true}
      />

      <div className="max-w-5xl mx-auto px-4 py-12 pt-64">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Design Status */}
            {designRequest && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Estado del diseño</h2>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-medium text-gray-900">{designRequest.product_name}</p>
                    <p className="text-sm text-gray-600">
                      Solicitado el {new Date(designRequest.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      designRequest.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : designRequest.status === 'rendering'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {designRequest.status === 'ready' ? '✓ Listo' :
                     designRequest.status === 'rendering' ? '⏳ Generando...' :
                     '📝 Pendiente'}
                  </span>
                </div>

                {/* Rendering Progress */}
                {designRequest.status === 'rendering' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm font-medium text-blue-900">
                        Tu diseño personalizado está siendo generado con IA...
                      </p>
                    </div>
                    <p className="text-xs text-blue-700">
                      Esto puede tomar 30-60 segundos. La página se actualizará automáticamente.
                    </p>
                  </div>
                )}

                {/* Mockup Gallery */}
                {designRequest.status === 'ready' && designRequest.mockup_urls && designRequest.mockup_urls.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">¡Tu diseño está listo!</h3>
                      {designRequest.output_url && (
                        <a
                          href={designRequest.output_url}
                          download
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium transition-colors"
                        >
                          Descargar
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {designRequest.mockup_urls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <Image
                            src={url}
                            alt={`Mockup ${idx + 1}`}
                            width={400}
                            height={400}
                            className="rounded-lg border-2 border-gray-200 shadow-md hover:shadow-xl transition-shadow object-cover w-full"
                          />
                          {idx === designRequest.mockup_urls!.length - 1 && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Más reciente
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Members */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Miembros del equipo</h2>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user_id === user?.id ? 'Tú' : `Miembro ${member.user_id.substring(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                    </div>
                    {member.user_id === team.owner_id && (
                      <span
                        className="px-2 py-1 text-xs rounded-full font-medium"
                        style={{
                          backgroundColor: `${team.colors.primary}20`,
                          color: team.colors.primary
                        }}
                      >
                        Propietario
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Link */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compartir equipo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comparte este link para que otros se unan a tu equipo
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 text-white text-sm rounded transition-opacity hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})`
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Invite Member (Owner only) */}
            {isOwner && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invitar miembro</h3>
                <form onSubmit={handleInvite} className="space-y-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full px-4 py-2 text-white rounded transition-opacity hover:opacity-90 disabled:bg-gray-400"
                    style={!inviting ? {
                      background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})`
                    } : {}}
                  >
                    {inviting ? 'Enviando...' : 'Enviar invitación'}
                  </button>
                </form>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/catalog')}
                  className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  Ver catálogo
                </button>
                {designRequest?.status === 'ready' && user && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">
                      <p className="font-semibold">Pago de prueba</p>
                      <p className="text-xs">Ejemplo: CLP $500 (5,000 centavos)</p>
                    </div>
                    <SplitPayButton
                      orderId={designRequest.id}
                      userId={user.id}
                      amountCents={50000}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
