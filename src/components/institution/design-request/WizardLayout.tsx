'use client';

import { ReactNode } from 'react';

interface WizardLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onContinue?: () => void;
  canContinue?: boolean;
  children: ReactNode;
}

export function WizardLayout({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onContinue,
  canContinue = true,
  children,
}: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-3 text-gray-300 hover:text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              ← Volver
            </button>
          )}

          <div>
            <div className="inline-block px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-gray-400 mb-2">
              Paso {step} de {totalSteps}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
            {subtitle && (
              <p className="text-gray-400 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  index < step
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {children}

        {/* Navigation Buttons */}
        {(onBack || onContinue) && (
          <div className="mt-6 flex items-center justify-between gap-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-200 border border-gray-700 rounded-lg hover:bg-gray-800 font-medium transition-colors"
              >
                ← Volver
              </button>
            ) : (
              <div></div>
            )}
            {onContinue && (
              <button
                onClick={onContinue}
                disabled={!canContinue}
                className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-colors ${
                  canContinue
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continuar →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
