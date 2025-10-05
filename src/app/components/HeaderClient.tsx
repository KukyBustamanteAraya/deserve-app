'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { useUserProfile, getDisplayName } from '@/hooks/useUserProfile';

export default function Header() {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isDashboardPage = pathname === '/dashboard';
  const isCatalogPage = pathname?.startsWith('/catalog');

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
      const displayName = getDisplayName(profile, user.email);

      if (isDashboardPage) {
        return (
          <span className="text-sm text-gray-600 px-6 py-3 whitespace-nowrap">
            Welcome, {displayName}
          </span>
        );
      } else {
        return (
          <Link
            href="/dashboard"
            className="bg-[#e21c21] text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 inline-block whitespace-nowrap"
          >
            Dashboard
          </Link>
        );
      }
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
  }, [user, loading, isDashboardPage, isLoginPage, profile]);

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto py-4">
        <div className="flex justify-between items-center px-4">
          {/* Left side - Navigation for authenticated users */}
          <div className="flex-1 flex items-center">
            {user && (
              <nav className="flex items-center space-x-6">
                <Link
                  href="/"
                  className={`text-sm font-medium transition-colors duration-200 ${
                    pathname === '/' ? 'text-[#e21c21]' : 'text-gray-700 hover:text-[#e21c21]'
                  }`}
                >
                  Inicio
                </Link>
                <Link
                  href="/catalog"
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isCatalogPage ? 'text-[#e21c21]' : 'text-gray-700 hover:text-[#e21c21]'
                  }`}
                >
                  Catálogo
                </Link>
              </nav>
            )}
          </div>

          {/* Center - Logo */}
          <div className="flex justify-center">
            <Link href="/" className="h-12 flex items-center hover:opacity-80 transition-opacity">
              <span className="text-2xl font-black text-[#e21c21]">DESERVE</span>
            </Link>
          </div>

          {/* Right side - User actions */}
          <div className="flex-1 flex justify-end items-center min-h-[3rem]">
            {buttonContent}
          </div>
        </div>
      </div>
    </div>
  );
}