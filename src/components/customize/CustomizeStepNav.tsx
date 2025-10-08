'use client';

import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';

interface CustomizeStepNavProps {
  onContinue: () => void;
  canContinue?: boolean;
  continueText?: string;
  showBack?: boolean;
}

export function CustomizeStepNav({
  onContinue,
  canContinue = true,
  continueText = 'Continuar →',
  showBack = true
}: CustomizeStepNavProps) {
  const router = useRouter();
  const { teamColors } = useBuilderState();

  return (
    <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              ← Volver
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={onContinue}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 shadow-md ${
              canContinue
                ? 'hover:shadow-lg hover:opacity-90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            style={canContinue ? {
              background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.accent})`
            } : {}}
          >
            {continueText}
          </button>
        </div>
      </div>
    </div>
  );
}
