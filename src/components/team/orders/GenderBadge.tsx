/**
 * GenderBadge Component
 *
 * Displays a color-coded badge indicating the gender category of a team.
 * Used in order tables to differentiate between men's, women's, and co-ed teams.
 *
 * @example
 * <GenderBadge gender="male" />        // ♂ Men (blue)
 * <GenderBadge gender="female" />      // ♀ Women (pink)
 * <GenderBadge gender="both" />        // ⚥ Co-ed (purple)
 * <GenderBadge gender="male" size="md" /> // Larger size
 */

interface GenderBadgeProps {
  gender: 'male' | 'female' | 'both';
  size?: 'sm' | 'md';
  className?: string;
}

export function GenderBadge({ gender, size = 'sm', className = '' }: GenderBadgeProps) {
  // Configuration for each gender category
  const config = {
    male: {
      icon: '♂',
      label: 'Men',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-500/50',
    },
    female: {
      icon: '♀',
      label: 'Women',
      bgColor: 'bg-pink-500/20',
      textColor: 'text-pink-300',
      borderColor: 'border-pink-500/50',
    },
    both: {
      icon: '⚥',
      label: 'Co-ed',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-300',
      borderColor: 'border-purple-500/50',
    },
  };

  const { icon, label, bgColor, textColor, borderColor } = config[gender];

  // Size classes
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${bgColor} ${textColor} ${borderColor} ${sizeClasses} ${className}`}
      title={`${label} Team`}
    >
      <span className="leading-none">{icon}</span>
      <span className="leading-none">{label}</span>
    </span>
  );
}
