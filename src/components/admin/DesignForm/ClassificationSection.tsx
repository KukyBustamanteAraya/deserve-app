'use client';

import { memo } from 'react';
import StyleTagsSelector from './StyleTagsSelector';
import ColorSchemeSelector from './ColorSchemeSelector';

interface ClassificationSectionProps {
  styleTags: string[];
  colorScheme: string[];
  onToggleStyleTag: (tag: string) => void;
  onAddColor: (color: string) => void;
  onRemoveColor: (color: string) => void;
}

const ClassificationSection = memo(function ClassificationSection({
  styleTags,
  colorScheme,
  onToggleStyleTag,
  onAddColor,
  onRemoveColor,
}: ClassificationSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">Classification</h2>
      <div className="space-y-6">
        <StyleTagsSelector selectedTags={styleTags} onToggleTag={onToggleStyleTag} />
        <ColorSchemeSelector
          colorScheme={colorScheme}
          onAddColor={onAddColor}
          onRemoveColor={onRemoveColor}
        />
      </div>
    </div>
  );
});

export default ClassificationSection;
