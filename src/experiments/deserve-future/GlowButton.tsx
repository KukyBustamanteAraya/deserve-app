"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  glowColor?: string;
}

/**
 * Button with custom color glow effect on hover
 * Variants:
 * - primary: Colored background with glow
 * - ghost: Transparent with border, subtle hover effect
 */
export default function GlowButton({
  variant = "primary",
  glowColor = "#e21c21",
  className,
  children,
  disabled,
  ...props
}: GlowButtonProps) {
  // Convert hex to rgba for shadow
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const primaryStyle = {
    backgroundColor: glowColor,
    ...(variant === "primary" && {
      "--tw-shadow": `0 0 24px ${hexToRgba(glowColor, 0.45)}`,
      "--tw-shadow-colored": `0 0 24px ${hexToRgba(glowColor, 0.45)}`
    })
  } as React.CSSProperties;

  const variants = {
    primary: cn(
      "text-white",
      "hover:shadow-[0_0_24px]",
      "focus:ring-2",
      "transition-shadow"
    ),
    ghost: cn(
      "bg-white/5 text-white border border-white/10",
      "hover:bg-white/10 hover:border-white/20",
      "focus:ring-2 focus:ring-white/30"
    )
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      style={variant === "primary" ? primaryStyle : undefined}
      className={cn(
        "rounded-xl px-5 py-3 font-medium transition-all duration-300",
        "focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
