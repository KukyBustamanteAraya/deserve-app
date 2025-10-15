'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface QuickWizardLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  teamName?: string;
  sportName?: string;
  onBack?: () => void;
  onContinue?: () => void;
  canContinue?: boolean;
  continueLabel?: string;
  children: ReactNode;
}

export function QuickWizardLayout({
  step,
  totalSteps,
  title,
  subtitle,
  teamName,
  sportName,
  onBack,
  onContinue,
  canContinue = true,
  continueLabel = 'Continuar',
  children,
}: QuickWizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          {/* Team Context */}
          {(teamName || sportName) && (
            <div className="mb-3 text-sm text-gray-400">
              Pedido para: <span className="text-white font-medium">{teamName}</span>
              {sportName && <span> • {sportName}</span>}
            </div>
          )}

          {/* Step and Title */}
          <div>
            <div className="inline-block px-3 py-1 bg-[#e21c21]/20 backdrop-blur-sm rounded-full text-xs text-[#e21c21] font-semibold mb-2 border border-[#e21c21]/30">
              Paso {step} de {totalSteps}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{title}</h1>
            {subtitle && (
              <p className="text-gray-400 text-sm sm:text-base">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Step 1 is the design page, so we show steps 2-4 here */}
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < step;
              const isCurrent = stepNumber === step;

              return (
                <div
                  key={index}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-[#e21c21] to-[#c11a1e]'
                      : isCurrent
                      ? 'bg-gradient-to-r from-[#e21c21]/60 to-[#c11a1e]/60'
                      : 'bg-gray-700'
                  }`}
                ></div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}

        {/* Navigation Buttons */}
        {(onBack || onContinue) && (
          <div className="mt-8 flex items-center justify-between gap-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="relative px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 border border-gray-700 rounded-lg hover:text-white hover:border-gray-600 font-medium transition-all shadow-lg overflow-hidden group"
                style={{ transition: 'all 0.3s ease' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </span>
              </button>
            ) : (
              <div></div>
            )}
            {onContinue && (
              <button
                onClick={onContinue}
                disabled={!canContinue}
                className={`relative px-8 py-3 rounded-lg font-semibold transition-all shadow-lg overflow-hidden group ${
                  canContinue
                    ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50'
                    : 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed'
                }`}
                style={{ transition: 'all 0.3s ease' }}
              >
                {canContinue && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                )}
                <span className="relative flex items-center gap-2">
                  {continueLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
