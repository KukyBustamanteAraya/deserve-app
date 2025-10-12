'use client';

import { useAuth } from './AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useUserProfile, getDisplayName } from '@/hooks/useUserProfile';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

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

export default function Header() {
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
        logger.error('Error fetching teams:', error);
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
    } else if (teams.length === 1) {
      // Single team - navigate directly
      router.push('/mi-equipo');
    } else {
      // Multiple teams - show dropdown
      e.preventDefault();
      setShowTeamDropdown(!showTeamDropdown);
    }
  };

  // Navigate to specific team
  const handleTeamSelect = (teamId: string) => {
    setShowTeamDropdown(false);
    router.push(`/mi-equipo?team=${teamId}`);
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
            className="bg-[#e21c21] text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 inline-flex items-center gap-2 whitespace-nowrap"
          >
            Mi Equipo
            {teams.length > 1 && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showTeamDropdown ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Dropdown menu */}
          {showTeamDropdown && teams.length > 1 && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Selecciona tu equipo</p>
              </div>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3 group"
                >
                  <div className="flex gap-1">
                    <div
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: team.colors.primary }}
                    />
                    <div
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: team.colors.secondary }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 group-hover:text-[#e21c21] transition-colors">
                      {team.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {team.team_type === 'institution' ? 'Institución' : 'Equipo Individual'}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-[#e21c21] transition-colors"
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
          className="bg-[#e21c21] text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 inline-block whitespace-nowrap"
        >
          Iniciar Sesión
        </Link>
      );
    }

    // On login page, no button needed
    return <div className="w-32 h-12"></div>; // Maintain layout consistency
  }, [user, loading, isLoginPage, teams, showTeamDropdown, handleMyTeamClick, handleTeamSelect]);

  return (
    <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto py-4">
        <div className="flex justify-between items-center px-4">
          {/* Left side - Hamburger Menu */}
          <div className="flex-1 flex items-center">
            {user && <HamburgerMenu onLogout={handleLogout} />}
          </div>

          {/* Center - Logo */}
          <div className="flex justify-center">
            <Link href="/" className="h-12 flex items-center hover:opacity-80 transition-opacity">
              <span className="text-xl sm:text-2xl font-black text-[#e21c21]">DESERVE</span>
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
                    className="bg-[#e21c21] text-white px-3 py-2 rounded-full text-xs font-semibold hover:bg-black transition-colors inline-flex items-center gap-1"
                  >
                    Equipo
                    {teams.length > 1 && (
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${showTeamDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Mobile Dropdown */}
                  {showTeamDropdown && teams.length > 1 && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-700">Selecciona tu equipo</p>
                      </div>
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => handleTeamSelect(team.id)}
                          className="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left flex items-center gap-2 group"
                        >
                          <div className="flex gap-1">
                            <div
                              className="w-2 h-6 rounded"
                              style={{ backgroundColor: team.colors.primary }}
                            />
                            <div
                              className="w-2 h-6 rounded"
                              style={{ backgroundColor: team.colors.secondary }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#e21c21] transition-colors truncate">
                              {team.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {team.team_type === 'institution' ? 'Institución' : 'Equipo'}
                            </p>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-400 group-hover:text-[#e21c21] transition-colors flex-shrink-0"
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
                  className="bg-[#e21c21] text-white px-3 py-2 rounded-full text-xs font-semibold hover:bg-black transition-colors"
                >
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}