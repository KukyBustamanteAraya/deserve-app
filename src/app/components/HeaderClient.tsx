'use client';

import { useAuth } from './AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState, useEffect, useRef, memo } from 'react';
import { useUserProfile, getDisplayName } from '@/hooks/useUserProfile';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  team_type?: 'single_team' | 'institution';
}

interface LogoSettings {
  mode: 'text' | 'logo';
  primaryLogoUrl: string | null;
  secondaryLogoUrl: string | null;
}

const Header = memo(function Header() {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getBrowserClient();

  // Team dropdown state
  const [teams, setTeams] = useState<Team[]>([]);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hamburger menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Team selection menu state
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

  // Logo settings state
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    mode: 'text',
    primaryLogoUrl: null,
    secondaryLogoUrl: null,
  });

  const isLoginPage = pathname === '/login';
  const isTeamPage = pathname === '/mi-equipo';
  const isCatalogPage = pathname?.startsWith('/catalog');

  // Fetch user's teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) {
        setTeams([]);
        return;
      }

      setLoadingTeams(true);
      try {
        const { data: memberships } = await supabase
          .from('team_memberships')
          .select('team_id, team:teams(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (memberships && memberships.length > 0) {
          const userTeams = memberships.map((m: any) => m.team).filter(Boolean);
          setTeams(userTeams);
        } else {
          setTeams([]);
        }
      } catch (error) {
        logger.error('Error fetching teams:', toError(error));
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [user, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTeamDropdown(false);
      }
    };

    if (showTeamDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTeamDropdown]);

  // Load logo settings
  useEffect(() => {
    async function loadLogoSettings() {
      try {
        const res = await fetch('/api/admin/theme/logo');
        if (res.ok) {
          const data = await res.json();
          if (data.mode || data.primaryLogoUrl || data.secondaryLogoUrl) {
            setLogoSettings({
              mode: data.mode || 'text',
              primaryLogoUrl: data.primaryLogoUrl || null,
              secondaryLogoUrl: data.secondaryLogoUrl || null,
            });
          }
        }
      } catch (error) {
        logger.error('Error loading logo settings:', toError(error));
      }
    }
    loadLogoSettings();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Handle My Team button click
  const handleMyTeamClick = (e: React.MouseEvent) => {
    if (teams.length === 0) {
      // No teams - go to team creation page
      router.push('/mi-equipo');
    } else {
      // Has teams - show team menu in header
      e.preventDefault();
      setIsTeamMenuOpen(true);
    }
  };

  // Handle team selection from menu
  const handleTeamSelectFromMenu = (teamSlug: string) => {
    setIsTeamMenuOpen(false);
    router.push(`/mi-equipo/${teamSlug}`);
  };

  // Navigate to specific team
  const handleTeamSelect = (teamSlug: string) => {
    setShowTeamDropdown(false);
    router.push(`/mi-equipo/${teamSlug}`);
  };

  // Memoize the button content to reduce flickering
  const buttonContent = useMemo(() => {
    // Show consistent placeholder while loading to prevent layout shift
    if (loading) {
      return <div className="w-32 h-12 flex items-center justify-center">
        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>;
    }

    // Authenticated states
    if (user) {
      return (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleMyTeamClick}
            className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-full font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group inline-flex items-center gap-2 whitespace-nowrap"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">Mi Equipo</span>
          </button>

          {/* Dropdown menu */}
          {showTeamDropdown && teams.length > 1 && (
            <div className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 py-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-700">
                <p className="text-sm font-semibold text-gray-300">Selecciona tu equipo</p>
              </div>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team.slug)}
                  className="relative w-full px-4 py-3 hover:bg-white/5 transition-colors text-left flex items-center gap-3 group overflow-hidden"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="flex gap-1 relative">
                    <div
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: team.colors.primary }}
                    />
                    <div
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: team.colors.secondary }}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <p className="font-semibold text-white group-hover:text-[#e21c21] transition-colors">
                      {team.name}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {team.team_type === 'institution' ? 'Institución' : 'Equipo Individual'}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-[#e21c21] transition-colors relative"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Not authenticated - only show login button if not on login page
    if (!isLoginPage) {
      return (
        <Link
          href="/login"
          className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-full font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group inline-block whitespace-nowrap"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Iniciar Sesión</span>
        </Link>
      );
    }

    // On login page, no button needed
    return <div className="w-32 h-12"></div>; // Maintain layout consistency
  }, [user, loading, isLoginPage, teams, showTeamDropdown]);

  // Menu items - replace Orders with Admin for admin users
  const menuItems = useMemo(() => {
    const isAdmin = profile?.is_admin || false;

    return [
      { href: '/', label: 'Inicio', action: null },
      { href: '/catalog', label: 'Productos', action: null },
      // Show Admin for admins, Orders for regular users
      isAdmin
        ? { href: '/admin', label: 'Admin', action: null }
        : { href: '/orders', label: 'Pedidos', action: null },
      { href: '/dashboard', label: 'Ajustes', action: null },
      { href: '#', label: 'Cerrar Sesión', action: 'logout' }, // Logout button
    ];
  }, [profile]);

  const handleMenuItemClick = (href: string, action?: string | null) => {
    setIsMenuOpen(false);

    if (action === 'logout') {
      handleLogout();
    } else {
      router.push(href);
    }
  };

  return (
    <div className="w-full sticky z-50 px-4 pt-4" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl group">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

        <div className="max-w-7xl mx-auto py-4 relative h-20">
          {!isMenuOpen && !isTeamMenuOpen ? (
            // Normal Header
            <div className="flex justify-between items-center px-4 h-full">
              {/* Left side - Hamburger button */}
              <div className="flex-1 flex items-center">
                {user && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(true);
                    }}
                    className="relative p-2 sm:p-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-lg transition-all border border-gray-700 hover:border-[#e21c21]/50 shadow-lg overflow-hidden group"
                    aria-label="Menu"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <svg className="w-6 h-6 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Center - Logo */}
              <div className="flex justify-center">
                <Link href="/" className="h-8 flex items-center hover:opacity-80 transition-opacity">
                  {logoSettings.mode === 'logo' && logoSettings.primaryLogoUrl ? (
                    <img
                      src={logoSettings.primaryLogoUrl}
                      alt="Logo"
                      className="h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl font-black text-[#e21c21] drop-shadow-[0_2px_8px_rgba(226,28,33,0.3)]">DESERVE</span>
                  )}
                </Link>
              </div>

              {/* Right side - Mi Equipo / Login button */}
              <div className="flex-1 flex justify-end items-center min-h-[3rem]">
              <div className="hidden sm:block">
                {buttonContent}
              </div>
              {/* Compact version for very small screens */}
              <div className="sm:hidden">
                {loading ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : user ? (
                  <div className="relative">
                    <button
                      onClick={handleMyTeamClick}
                      className="relative px-3 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-full text-xs font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group inline-flex items-center gap-1"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Equipo</span>
                    </button>

                    {/* Mobile Dropdown */}
                    {showTeamDropdown && teams.length > 1 && (
                      <div className="absolute right-0 mt-2 w-72 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                        <div className="px-3 py-2 border-b border-gray-700">
                          <p className="text-xs font-semibold text-gray-300">Selecciona tu equipo</p>
                        </div>
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => handleTeamSelect(team.slug)}
                            className="relative w-full px-3 py-2 hover:bg-white/5 transition-colors text-left flex items-center gap-2 group overflow-hidden"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <div className="flex gap-1 relative">
                              <div
                                className="w-2 h-6 rounded"
                                style={{ backgroundColor: team.colors.primary }}
                              />
                              <div
                                className="w-2 h-6 rounded"
                                style={{ backgroundColor: team.colors.secondary }}
                              />
                            </div>
                            <div className="flex-1 min-w-0 relative">
                              <p className="text-sm font-semibold text-white group-hover:text-[#e21c21] transition-colors truncate">
                                {team.name}
                              </p>
                              <p className="text-xs text-gray-400 capitalize">
                                {team.team_type === 'institution' ? 'Institución' : 'Equipo'}
                              </p>
                            </div>
                            <svg
                              className="w-4 h-4 text-gray-400 group-hover:text-[#e21c21] transition-colors flex-shrink-0 relative"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : !isLoginPage ? (
                  <Link
                    href="/login"
                    className="relative px-3 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-full text-xs font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group inline-block"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Login</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          ) : null}

          {isMenuOpen && !isTeamMenuOpen ? (
            // Menu View - Close button + 4 Glass Cards, same height
            <div className="absolute inset-0 flex items-center px-4 h-full gap-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl">
              {/* Close button */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="relative p-2 text-gray-300 hover:text-[#e21c21] focus:outline-none transition-colors rounded-lg hover:bg-white/5 flex-shrink-0"
                aria-label="Cerrar menú"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Menu Cards */}
              <div className="flex-1 grid grid-cols-5 gap-2">
                {menuItems.map((item, index) => {
                  const isActive = pathname === item.href ||
                                  (item.href !== '/' && pathname?.startsWith(item.href));
                  const isAdminButton = item.label === 'Admin';
                  const isLogoutButton = item.action === 'logout';

                  return (
                    <button
                      key={item.href + item.label}
                      onClick={() => handleMenuItemClick(item.href, item.action)}
                      className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-lg transition-all overflow-hidden group animate-slide-in-from-right ${
                        isLogoutButton
                          ? 'bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 text-red-400 border border-red-500/50 hover:border-red-500 hover:text-red-300'
                          : isAdminButton
                          ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white font-bold shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                          : isActive
                          ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white font-semibold shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                          : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white border border-gray-700 hover:border-[#e21c21]/50'
                      }`}
                      style={{
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        animationDelay: `${index * 0.08}s`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      {/* Glass shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="text-[10px] sm:text-xs md:text-sm relative whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {isTeamMenuOpen ? (
            // Team Selection View - Team Glass Cards + Close button (right side)
            <div className="absolute inset-0 flex items-center px-4 h-full gap-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl">
              {/* "View All Teams" Icon Button - auto width */}
              <button
                onClick={() => {
                  setIsTeamMenuOpen(false);
                  router.push('/mi-equipo');
                }}
                className="relative flex items-center justify-center p-2 sm:p-3 rounded-full transition-all overflow-hidden group bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 flex-shrink-0"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                {/* Glass shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Icon only */}
                <svg className="w-5 h-5 sm:w-6 sm:h-6 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>

              {/* Team Cards Container - horizontally scrollable */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-2 sm:gap-3 min-w-min">
                  {/* Individual Team Cards */}
                  {teams.map((team, index) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelectFromMenu(team.slug)}
                      className="relative flex items-center justify-center py-2 px-3 sm:py-3 sm:px-6 rounded-full transition-all overflow-hidden group bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white border border-gray-700 hover:border-[#e21c21]/50 shadow-lg hover:shadow-[#e21c21]/30 flex-shrink-0 animate-slide-in-from-left"
                      style={{
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        animationDelay: `${index * 0.08}s`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      {/* Glass shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                      {/* Content wrapper to center everything */}
                      <div className="relative flex items-center gap-2 sm:gap-3">
                        {/* Team colors */}
                        <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                          <div
                            className="w-1.5 h-4 sm:w-2 sm:h-6 rounded"
                            style={{ backgroundColor: team.colors.primary }}
                          />
                          <div
                            className="w-1.5 h-4 sm:w-2 sm:h-6 rounded"
                            style={{ backgroundColor: team.colors.secondary }}
                          />
                        </div>

                        {/* Team name */}
                        <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">{team.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsTeamMenuOpen(false)}
                className="relative p-2 text-gray-300 hover:text-[#e21c21] focus:outline-none transition-colors rounded-lg hover:bg-white/5 flex-shrink-0"
                aria-label="Cerrar menú"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default Header;