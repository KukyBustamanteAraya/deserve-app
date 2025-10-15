# Deserve Future UI - Experimental Design System

A futuristic UI component library for testing next-generation design on isolated pages.

## 🎨 Brand Colors

- **Deserve Black**: `#0b0b0c`
- **Deserve Red**: `#e21c21`
- **Deserve White**: `#ffffff`

## 📦 Components

### `<Backdrop />`

Fixed background layers with grid pattern and noise texture.

```tsx
import Backdrop from "@/experiments/deserve-future/Backdrop";

<Backdrop />
```

### `<GlowButton />`

Button with Deserve Red glow effect on hover.

```tsx
import GlowButton from "@/experiments/deserve-future/GlowButton";

<GlowButton variant="primary">Click Me</GlowButton>
<GlowButton variant="ghost">Secondary Action</GlowButton>
```

**Props:**
- `variant`: `"primary"` (red background) | `"ghost"` (transparent with border)
- All standard button HTML attributes

### `<GlassCard />`

Glass morphism card with subtle border and backdrop blur.

```tsx
import GlassCard from "@/experiments/deserve-future/GlassCard";

<GlassCard hover={true}>
  <h3>Card Title</h3>
  <p>Card content...</p>
</GlassCard>
```

**Props:**
- `hover`: Enable hover effect (lift + glow)
- `noPadding`: Remove default padding
- `className`: Additional Tailwind classes

### `<DividerLaser />`

1px horizontal divider with Deserve Red glow.

```tsx
import DividerLaser from "@/experiments/deserve-future/DividerLaser";

<DividerLaser />
```

### Motion Utilities

Pre-configured Framer Motion variants and helpers.

```tsx
import { motion, stagger, fadeInUp, scaleIn, slideInRight, MotionSafe } from "@/experiments/deserve-future/Motion";

// Container with staggered children
<motion.div variants={stagger} initial="hidden" animate="show">
  <motion.div variants={fadeInUp}>Item 1</motion.div>
  <motion.div variants={fadeInUp}>Item 2</motion.div>
</motion.div>

// Respect reduced motion preferences
<MotionSafe>
  <motion.div variants={fadeInUp}>Animated content</motion.div>
</MotionSafe>
```

**Available Variants:**
- `fadeInUp` - Fade in with upward movement (450ms)
- `stagger` - Stagger children with 80ms delay
- `scaleIn` - Fade in with scale effect
- `slideInRight` - Slide in from right

## 🎯 Usage Example

```tsx
import Backdrop from "@/experiments/deserve-future/Backdrop";
import GlowButton from "@/experiments/deserve-future/GlowButton";
import GlassCard from "@/experiments/deserve-future/GlassCard";
import DividerLaser from "@/experiments/deserve-future/DividerLaser";
import { motion, stagger, fadeInUp } from "@/experiments/deserve-future/Motion";
import "@/experiments/deserve-future/local.css";

export default function MyPage() {
  return (
    <section className="relative min-h-screen bg-[#0b0b0c] text-white">
      <Backdrop />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-6xl px-6 py-16"
      >
        <motion.h1 variants={fadeInUp} className="text-5xl font-bold">
          Welcome to <span className="text-[#e21c21]">Deserve</span>
        </motion.h1>

        <DividerLaser className="my-8" />

        <div className="grid grid-cols-3 gap-4">
          <GlassCard hover>
            <h3 className="font-semibold mb-2">Feature 1</h3>
            <p className="text-white/70">Description...</p>
          </GlassCard>
          {/* More cards... */}
        </div>

        <GlowButton variant="primary">Get Started</GlowButton>
      </motion.div>
    </section>
  );
}
```

## 🚀 Performance

- **Bundle Impact**: ~40KB (tree-shakeable)
- **Animation Duration**: 350-450ms max
- **Respects**: `prefers-reduced-motion`
- **Layout Shift**: CLS = 0 (opacity/transform only)

## ♿ Accessibility

- AA+ contrast ratios on all text
- Keyboard navigation support
- Focus indicators on interactive elements
- Reduced motion support built-in

## 🔄 Rollback

To disable experimental UI:

1. Remove `import "@/experiments/deserve-future/local.css"` from your page
2. Replace components with original ones
3. Or use feature flag: `if (!FEATURE_FUTURE_UI) return <OriginalPage />`

## 📝 Notes

- **Scope**: These components are isolated and won't affect global styles
- **Images**: `noise.png` is optional (gracefully ignored if missing)
- **Browser Support**: Modern browsers with backdrop-filter support
