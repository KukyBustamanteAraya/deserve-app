"use client";

interface DividerLaserProps {
  className?: string;
  color?: string;
}

/**
 * 1px horizontal divider with custom color glow
 * Creates a subtle laser-like separation between sections
 */
export default function DividerLaser({ className, color = "#e21c21" }: DividerLaserProps) {
  // Convert hex to rgba for box shadow
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className={className}
      style={{
        height: "1px",
        width: "100%",
        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.2), ${color})`,
        boxShadow: `0 0 12px ${hexToRgba(color, 0.35)}`,
        opacity: 0.6
      }}
    />
  );
}
