"use client";
import { useReducedMotion, motion, Variants } from "framer-motion";
import React from "react";

/**
 * Fade in from below with subtle upward movement
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 0.61, 0.36, 1] // Custom easing curve
    }
  }
};

/**
 * Stagger children animations with delay
 */
export const stagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.03
    }
  }
};

/**
 * Scale in with fade
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.22, 0.61, 0.36, 1]
    }
  }
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 0.61, 0.36, 1]
    }
  }
};

/**
 * Wrapper component that respects user's motion preferences
 * Disables all animations if user has reduced motion enabled
 */
export const MotionSafe = ({ children }: { children: React.ReactNode }) => {
  const reduce = useReducedMotion();

  if (reduce) {
    // Return children without motion when reduced motion is preferred
    return <>{children}</>;
  }

  return <>{children}</>;
};

// Re-export motion from framer-motion for convenience
export { motion };
