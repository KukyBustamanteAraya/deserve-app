'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Step {
  number: number;
  label: string;
}

const steps: Step[] = [
  { number: 1, label: 'Elige tu deporte' },
  { number: 2, label: 'Elige tu diseño' },
  { number: 3, label: 'Personaliza tu uniforme' },
];

/**
 * Maps current route to step index (1, 2, 3, or 4 for completed)
 */
function getStepFromPathname(pathname: string): number {
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

  useEffect(() => {
    // Hide on checkout, confirmation, admin, dashboard, and team pages
    if (
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/pedido/confirmado') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/mi-equipo')
    ) {
      setIsHidden(true);
      return;
    }

    setIsHidden(false);
    setCurrentStep(getStepFromPathname(pathname));
  }, [pathname]);

  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-red-600 text-white ring-4 ring-red-100'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : step.number}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-xs md:text-sm font-medium transition-colors duration-300 ${
                      isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-1 mx-4 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe area for mobile notch/bars */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  );
}
