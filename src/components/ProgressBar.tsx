'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Step {
  number: number;
  label: string;
}

const steps: Step[] = [
  { number: 1, label: 'Elige tu deporte' },
  { number: 2, label: 'Encuentra tu diseno' },
  { number: 3, label: 'Personaliza tu uniforme' },
];

/**
 * Maps current route to step index (1, 2, 3, or 4 for completed)
 */
function getStepFromPathname(pathname: string): number {
  if (pathname.startsWith('/designs/')) {
    // /designs/[slug] = step 3 (customizing - entering team name and colors)
    return 3;
  }
  if (pathname.startsWith('/catalog') && !pathname.includes('?')) {
    // /catalog/[slug] = step 2 (viewing a design)
    return 2;
  }
  if (pathname.startsWith('/catalog?') || pathname.includes('deporte=')) {
    // /catalog?deporte=basketball = step 2 (browsing designs)
    return 2;
  }
  if (pathname.startsWith('/mi-equipo')) {
    // Team page = all steps completed (step 4 means show all as completed)
    return 4;
  }
  if (pathname.startsWith('/personaliza')) {
    // Customization = step 3
    return 3;
  }
  // Homepage = step 1
  return 1;
}

/**
 * Persistent progress bar that appears at the bottom of the viewport
 * Hidden on /checkout and /pedido/confirmado
 */
export default function ProgressBar() {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(1);
  const [isHidden, setIsHidden] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Hide on checkout, confirmation, admin, dashboard, team pages, and wizard routes
    const shouldHide =
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/pedido/confirmado') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/mi-equipo') ||
      pathname.includes('/request/'); // Hide on all wizard routes

    if (shouldHide && !isHidden) {
      // Animate out first
      setIsAnimatingOut(true);
      setTimeout(() => {
        setIsHidden(true);
        setIsAnimatingOut(false);
      }, 700); // Match animation duration
      return;
    }

    if (!shouldHide && isHidden) {
      setIsHidden(false);
    }

    setCurrentStep(getStepFromPathname(pathname));
  }, [pathname, isHidden]);

  if (isHidden) return null;

  const isHomepage = pathname === '/';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 transition-transform duration-700 ease-in-out ${
        isAnimatingOut ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden group">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 py-3 relative">
          {/* Title - Only on homepage */}
          {isHomepage && (
            <div className="text-center mb-3">
              <h2 className="text-base md:text-lg font-bold text-white font-montserrat">
                ¡Ve tu uniforme soñado hoy!
              </h2>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {steps.map((step, index) => {
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`relative flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all overflow-hidden group ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 text-white shadow-lg shadow-green-500/30 border border-green-500/50'
                          : isActive
                          ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                          : 'bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-400 border border-gray-700'
                      }`}
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">{isCompleted ? '✓' : step.number}</span>
                    </div>

                    {/* Step Label */}
                    <span
                      className={`text-xs md:text-sm font-medium transition-colors ${
                        isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-400'
                      }`}
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block flex-1 h-1 mx-4 rounded-full bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700/50 overflow-hidden backdrop-blur-sm">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600 w-full' : 'w-0'
                        }`}
                        style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
