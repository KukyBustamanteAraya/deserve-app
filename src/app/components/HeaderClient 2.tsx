'use client';

import { useAuth } from './AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useUserProfile, getDisplayName } from '@/hooks/useUserProfile';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { getBrowserClient } from '@/lib/supabase/client';

export default function Header() {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getBrowserClient();

  const isLoginPage = pathname === '/login';
  const isTeamPage = pathname === '/mi-equipo';
  const isCatalogPage = pathname?.startsWith('/catalog');

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
        <Link
          href="/mi-equipo"
          className="bg-[#e21c21] text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 inline-block whitespace-nowrap"
        >
          Mi Equipo
        </Link>
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
  }, [user, loading, isLoginPage]);

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
                <Link
                  href="/mi-equipo"
                  className="bg-[#e21c21] text-white px-3 py-2 rounded-full text-xs font-semibold hover:bg-black transition-colors"
                >
                  Equipo
                </Link>
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