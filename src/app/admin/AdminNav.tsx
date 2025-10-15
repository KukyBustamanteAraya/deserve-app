'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/admin/clients', label: 'Clients' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/designs', label: 'Designs' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/analytics', label: 'Analytics' },
    { href: '/admin/theme', label: 'Theme' },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  return (
    <div className="w-full sticky top-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4">
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden group">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="max-w-7xl mx-auto py-2.5 sm:py-4 relative">
          <div className="px-2.5 sm:px-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              {/* Back to Deserve App - Above Title */}
              <div className="flex justify-center sm:justify-start">
                <Link
                  href="/"
                  className="flex items-center gap-1 sm:gap-1.5 text-gray-400 hover:text-white transition-colors group text-[10px] sm:text-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="font-medium">Back to Deserve</span>
                </Link>
              </div>

              {/* Title */}
              <Link href="/admin">
                <h1 className="text-base sm:text-xl font-black text-[#e21c21] drop-shadow-[0_2px_8px_rgba(226,28,33,0.3)] text-center cursor-pointer hover:text-[#ff2528] transition-colors">
                  ADMIN PANEL
                </h1>
              </Link>

              {/* Navigation - Always visible, single row on all screens */}
              <div className="flex gap-1.5 sm:gap-2 md:gap-2 overflow-x-auto pb-1 scrollbar-hide justify-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-1.5 xs:px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all backdrop-blur-md overflow-hidden group/link whitespace-nowrap flex-shrink-0 flex items-center justify-center ${
                      isActive(link.href)
                        ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                        : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white border border-gray-700/50 hover:border-[#e21c21]/50'
                    }`}
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/link:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative text-[9px] xs:text-[10px] sm:text-xs md:text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
