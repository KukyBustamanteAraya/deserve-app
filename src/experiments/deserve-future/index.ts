/**
 * Deserve Future UI - Experimental Component Library
 *
 * A futuristic design system featuring:
 * - Glass morphism cards
 * - Deserve Red (#e21c21) glow effects
 * - Smooth Framer Motion animations
 * - Grid + noise backdrop layers
 * - Laser dividers
 *
 * Usage:
 * ```tsx
 * import Backdrop from "@/experiments/deserve-future/Backdrop";
 * import GlowButton from "@/experiments/deserve-future/GlowButton";
 * import GlassCard from "@/experiments/deserve-future/GlassCard";
 * import DividerLaser from "@/experiments/deserve-future/DividerLaser";
 * import { motion, stagger, fadeInUp } from "@/experiments/deserve-future/Motion";
 * import "@/experiments/deserve-future/local.css";
 * ```
 */

export { default as Backdrop } from "./Backdrop";
export { default as GlowButton } from "./GlowButton";
export { default as GlassCard } from "./GlassCard";
export { default as DividerLaser } from "./DividerLaser";
export { motion, stagger, fadeInUp, scaleIn, slideInRight, MotionSafe } from "./Motion";
