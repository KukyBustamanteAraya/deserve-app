"use client";
import { motion } from "framer-motion";
import { fadeInUp } from "./Motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  noPadding?: boolean;
}

/**
 * Glass morphism card with subtle border and backdrop blur
 * Optional hover effect for interactive cards
 */
export default function GlassCard({
  children,
  className,
  hover = false,
  noPadding = false
}: GlassCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl",
        !noPadding && "p-6",
        hover && "hover:bg-white/8 hover:border-white/20 transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
