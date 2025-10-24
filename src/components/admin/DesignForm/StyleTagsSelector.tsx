'use client';

import { memo } from 'react';
import { STYLE_TAG_OPTIONS } from './constants';

interface StyleTagsSelectorProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

const StyleTagsSelector = memo(function StyleTagsSelector({
  selectedTags,
  onToggleTag,
}: StyleTagsSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Style Tags</label>
      <div className="flex flex-wrap gap-2">
        {STYLE_TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-[#e21c21] text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {selectedTags.length > 0 && (
        <p className="text-gray-500 text-xs mt-2">Selected: {selectedTags.join(', ')}</p>
      )}
    </div>
  );
});

export default StyleTagsSelector;
