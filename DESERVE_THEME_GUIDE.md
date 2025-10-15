# Deserve App Theme Guide

**Official Design Reference**: `/designs/[slug]` page (e.g., `/designs/elevate?sport=basquetbol`)

This document defines the official Deserve app visual theme established on 2025-10-12.

## Color Palette

### Primary Colors
- **Brand Red**: `#e21c21`
- **Dark Red (hover)**: `#c11a1e`
- **Darker Red**: `#a01519`

### Background Colors
- **Page Background**: `bg-gradient-to-br from-gray-900 via-black to-gray-900`
- **Pure Black**: `black` (used in gradients)

### Text Colors
- **Primary Text**: `text-white` (headings, titles)
- **Secondary Text**: `text-gray-300` (body text, descriptions)
- **Tertiary Text**: `text-gray-400` (labels, captions)
- **Interactive Links**: `text-gray-300 hover:text-[#e21c21]`

### Border Colors
- **Default**: `border-gray-700`
- **Hover**: `border-[#e21c21]/50`
- **Active/Selected**: `border-[#e21c21]/50`

## Glass Effect Formula

The signature Deserve glass effect used across all components:

### Dark Glass Container
```tsx
className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group"
```

### Glass Shine Effect (on hover)
```tsx
{/* Inside glass container */}
<div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
```

### Red Glass Button/Toggle (selected state)
```tsx
className="relative bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md border border-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30 overflow-hidden group"
```

## Typography

### Hierarchy
- **Page Title**: `text-4xl font-bold text-white`
- **Section Heading**: `text-sm font-semibold text-gray-400 uppercase`
- **Card Title**: `text-lg font-bold text-white`
- **Body Text**: `text-gray-300`
- **Caption/Small**: `text-sm text-gray-400`

## App Layout Structure

### Root Layout (Body Background)
```tsx
<body className="antialiased font-montserrat bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
  <Providers>
    <Header />
    <main className="pb-20">
      {children}
    </main>
    <ProgressBar />
  </Providers>
</body>
```

**Key Requirements:**
- Dark gradient background on `<body>` extends to full page height
- `<main>` wrapper with bottom padding (`pb-20`) to prevent content from being hidden behind sticky progress bar
- This creates the dark foundation needed for floating glass cards

### Navigation Header (Sticky Top)
```tsx
<div className="w-full sticky top-0 z-50 px-4 pt-4">
  <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden group">
    {/* Glass shine effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

    <div className="max-w-7xl mx-auto py-4 relative">
      <div className="flex justify-between items-center px-4">
        {/* Left: Hamburger Menu */}
        <div className="flex-1 flex items-center">
          {/* Menu content */}
        </div>

        {/* Center: Logo */}
        <div className="flex justify-center">
          <Link href="/" className="h-12 flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl sm:text-2xl font-black text-[#e21c21] drop-shadow-[0_2px_8px_rgba(226,28,33,0.3)]">DESERVE</span>
          </Link>
        </div>

        {/* Right: Action Button */}
        <div className="flex-1 flex justify-end items-center">
          {/* Button content */}
        </div>
      </div>
    </div>
  </div>
</div>
```

**Features:**
- Floating glass card with rounded corners (`rounded-xl`)
- Padding (`px-4 pt-4`) creates space from viewport edges
- Sticky positioning at top
- Logo with red glow drop shadow
- Three-column flex layout (left/center/right)

### Progress Bar (Sticky Bottom)
```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
  <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden group">
    {/* Glass shine effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

    <div className="max-w-7xl mx-auto px-4 py-3 relative">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Step indicators with glass effect */}
        <div className="flex items-center flex-1">
          {/* Active step - Red glass */}
          <div className="relative bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50 w-8 h-8 rounded-full overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">1</span>
          </div>

          {/* Completed step - Green glass */}
          <div className="relative bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 text-white shadow-lg shadow-green-500/30 border border-green-500/50 w-8 h-8 rounded-full overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">✓</span>
          </div>

          {/* Inactive step - Dark glass */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-400 border border-gray-700 w-8 h-8 rounded-full overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">3</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Features:**
- Floating glass card at bottom with rounded corners
- Padding (`px-4 pb-4`) creates space from viewport edges
- Fixed positioning at bottom
- Step states use different glass colors:
  - **Active**: Red glass with red glow
  - **Completed**: Green glass with green glow
  - **Inactive**: Dark glass with gray border
- Connector lines between steps with glass effect

## Component Styles

### Primary Button (Red CTA)
```tsx
<button
  className="relative px-6 py-4 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  {/* Glass shine effect */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <span className="relative">Button Text</span>
</button>
```

### Secondary Button (Dark Glass)
```tsx
<button
  className="relative px-6 py-4 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 rounded-lg hover:text-white font-semibold transition-all border border-gray-700 hover:border-[#e21c21]/50 shadow-2xl overflow-hidden group"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <span className="relative">Button Text</span>
</button>
```

### Feature Card
```tsx
<div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-4 shadow-2xl group">
  {/* Glass shine effect */}
  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <div className="relative flex items-center gap-2 mb-1">
    <svg className="w-5 h-5 text-[#e21c21]">...</svg>
    <span className="font-semibold text-white">Title</span>
  </div>
  <p className="text-sm text-gray-400 relative">Description</p>
</div>
```

### Product/Info Card
```tsx
<div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-4 shadow-2xl group">
  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <div className="relative">
    <p className="font-semibold text-white">Product Name</p>
    <p className="text-sm text-gray-400">Category</p>
  </div>
  <p className="text-lg font-bold text-white relative">$Price</p>
</div>
```

### Main Image/Mockup Container
```tsx
<div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden aspect-square flex items-center justify-center shadow-2xl group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <img src="..." alt="..." className="w-full h-full object-cover" />
</div>
```

### Thumbnail Button
```tsx
<button
  className="aspect-square rounded-lg border-2 overflow-hidden transition-all backdrop-blur-sm border-[#e21c21] ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/20"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  <img src="..." alt="..." className="w-full h-full object-cover" />
</button>
```

### Breadcrumb Item
```tsx
<Link
  href="/path"
  className="relative px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-[#e21c21] rounded-lg border border-gray-700 hover:border-[#e21c21]/50 transition-all shadow-lg overflow-hidden group"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <span className="relative">Link Text</span>
</Link>
```

### Glass Arrow Separator
```tsx
<svg
  className="w-5 h-5 text-gray-400/60 drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] backdrop-blur-sm"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth={2.5}
  style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.1))' }}
>
  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
</svg>
```

### Toggle Button (Selected State)
```tsx
<button
  className="relative px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-md overflow-hidden group bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <span className="relative">Option</span>
</button>
```

### Toggle Button (Unselected State)
```tsx
<button
  className="relative px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-md overflow-hidden group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-300 hover:text-white border border-gray-700 hover:border-[#e21c21]/50"
  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
>
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <span className="relative">Option</span>
</button>
```

### Badge (Featured/Status)
```tsx
<div className="relative inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-full text-sm font-bold shadow-lg border border-[#e21c21]/50 overflow-hidden group">
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  <svg className="w-4 h-4 relative z-10">...</svg>
  <span className="relative z-10">Badge Text</span>
</div>
```

### Tag (Style/Color Tags)
```tsx
{/* Red tinted tag */}
<span className="px-3 py-1 text-sm rounded-full bg-[#e21c21]/20 text-[#e21c21] border border-[#e21c21]/50 backdrop-blur-sm">
  Tag
</span>

{/* Neutral tag */}
<span className="px-3 py-1 text-sm rounded-full bg-gray-800/90 text-gray-300 border border-gray-700 backdrop-blur-md">
  Tag
</span>
```

### Form Input Fields (Glass Text Boxes)
```tsx
<div className="relative">
  <label htmlFor="input_name" className="block text-sm font-medium text-white mb-1">
    Field Label
  </label>
  <div className="relative overflow-hidden rounded-md group/input">
    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
    <input
      type="text"
      id="input_name"
      name="input_name"
      className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-md shadow-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      placeholder="Placeholder text"
    />
  </div>
</div>
```

**Key Features:**
- Wrapper div with `overflow-hidden` and `group/input` for hover effects
- Hover shine overlay with white gradient
- Dark glass background matching other components
- Red focus ring that matches brand color
- White text with gray-500 placeholder
- Smooth transitions with cubic-bezier easing

### Standard Text Inputs & Dropdowns (Simplified)

**Reference**: `/mi-equipo/[slug]/settings` (Team Settings Page)

This is the definitive standard for text inputs and dropdowns across the app. Use this pattern for forms and modals throughout the application.

#### Text Input Standard
```tsx
<input
  type="text"
  className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
  placeholder="Placeholder text"
/>
```

**Full Example from Team Settings:**
```tsx
<div className="flex items-center gap-2">
  <label className="w-32 text-gray-400 text-sm">Team Name:</label>
  <input
    type="text"
    value={teamName}
    onChange={(e) => setTeamName(e.target.value)}
    className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
    placeholder="Enter team name"
  />
</div>
```

#### Dropdown/Select Standard
```tsx
<select
  className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 appearance-none cursor-pointer"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem'
  }}
>
  <option value="" className="bg-black text-white">Select option</option>
  <option value="option1" className="bg-black text-white">Option 1</option>
  <option value="option2" className="bg-black text-white">Option 2</option>
</select>
```

**Full Example from Team Settings:**
```tsx
<div className="flex items-center gap-2">
  <label className="w-32 text-gray-400 text-sm">Sport:</label>
  <select
    value={sport}
    onChange={(e) => setSport(e.target.value)}
    className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
  >
    <option value="soccer" className="bg-black text-white">Soccer</option>
    <option value="basketball" className="bg-black text-white">Basketball</option>
    <option value="volleyball" className="bg-black text-white">Volleyball</option>
  </select>
</div>
```

#### Key Features of Standard Inputs/Dropdowns
- **Dark Background**: `bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90`
  - Darker and more uniform than other glass elements
  - Creates strong contrast with white text
- **Red Focus States**: `focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50`
  - Brand red used for active/focused states
  - 50% opacity for subtle effect
- **Backdrop Blur**: `backdrop-blur-md` maintains glass theme
- **White Text**: `text-white` for visibility on dark background
- **Gray Placeholder**: `placeholder-gray-500` for input placeholders
- **Border**: `border border-gray-700` default, changes to red on focus
- **Rounded Corners**: `rounded-lg` for consistency
- **Dropdown Arrow**: Custom SVG arrow in white for dropdowns
- **Black Options**: `className="bg-black text-white"` on `<option>` elements

#### Usage Guidelines
1. **Always use this exact className** for text inputs and dropdowns across the app
2. **For dropdowns**: Add custom arrow styling with `appearance-none` and SVG background
3. **For options**: Always set `className="bg-black text-white"` to maintain theme
4. **Layout**: Pair with label using flexbox (`flex items-center gap-2`)
5. **Label styling**: Use `text-gray-400 text-sm` for labels
6. **Consistency**: This pattern should be used in all forms, modals, and settings pages

## Animations & Transitions

### Standard Transition
```tsx
style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
```

### Hover Effects
- **Lift**: `hover:-translate-y-1`
- **Scale**: `hover:scale-105`
- **Glow**: `hover:shadow-[#e21c21]/50`
- **Border Highlight**: `hover:border-[#e21c21]/50`
- **Text Color**: `hover:text-white` or `hover:text-[#e21c21]`

## Shadows

### Card Shadows
- **Standard**: `shadow-lg`
- **Deep**: `shadow-2xl`
- **Red Glow**: `shadow-[#e21c21]/30` (default), `shadow-[#e21c21]/50` (hover)

### Icon/Text Shadows (Glass Effect)
```tsx
drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]
style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.1))' }}
```

## Layout Principles

1. **Dark Foundation**: Always start with black/dark gray gradient backgrounds (`bg-gradient-to-br from-gray-900 via-black to-gray-900`)
2. **Floating Glass Cards**: Header and progress bar float on dark background with padding for rounded corners
3. **Glass Layers**: Use translucent glass cards for content
4. **Red as Accent**: Use red for CTAs, active states, icons, and interactive highlights
5. **White for Readability**: Primary text should be white or light gray
6. **Consistent Blur**: All glass elements use `backdrop-blur-md`
7. **Hover Shine**: Every interactive glass element should have the white shine on hover
8. **Smooth Transitions**: All state changes use the 0.4s cubic-bezier easing
9. **Proper Spacing**: Use `px-4` + `pt-4`/`pb-4` for floating cards to show rounded corners

## Don'ts

❌ Don't use solid backgrounds without glass effect
❌ Don't use red for body text on dark backgrounds (readability issues)
❌ Don't mix different blur amounts (always use `backdrop-blur-md`)
❌ Don't use sharp transitions (always use the cubic-bezier easing)
❌ Don't forget the hover shine effect on interactive elements
❌ Don't use white/light backgrounds on this theme (it's a dark theme)

## Implementation Checklist

When applying this theme to a new page:

- [ ] Black gradient page background on `<body>` element
- [ ] Main content wrapped with bottom padding for progress bar
- [ ] Header uses floating glass card pattern (sticky top, px-4 pt-4)
- [ ] Progress bar uses floating glass card pattern (fixed bottom, px-4 pb-4)
- [ ] All containers use glass effect
- [ ] White text for headings and titles
- [ ] Gray-300 for body text, gray-400 for captions
- [ ] Red used only for buttons, icons, active states, hover states
- [ ] All interactive elements have hover shine effect
- [ ] **Form inputs use standard text input theme** (`from-black/90 via-gray-900/95 to-black/90`)
- [ ] **Dropdowns use standard dropdown theme with custom arrow**
- [ ] Input fields use red focus ring (`focus:ring-red-500/50 focus:border-red-500/50`)
- [ ] Dropdown options use black background (`className="bg-black text-white"`)
- [ ] Consistent transitions (0.4s cubic-bezier)
- [ ] Proper z-index layering for shine effects (use `relative` on content)
- [ ] Border colors follow the standard (gray-700 default, red on hover)
- [ ] Shadows appropriate for depth (2xl for floating cards)
- [ ] Rounded corners on floating cards (`rounded-xl`)

---

**Version**: 1.3
**Last Updated**: 2025-10-13
**Reference Pages**:
- `/designs/[slug]` (Design Detail Page - glass effects)
- `/dashboard` (Dashboard - glass containers and action cards)
- `/dashboard/account` (Account Settings - glass form inputs)
- `/mi-equipo/[slug]/settings` (Team Settings - standard text inputs & dropdowns)
- App Layout (Header & Progress Bar - floating glass cards)

## Key Files
- `/src/app/layout.tsx` - Root layout with dark background
- `/src/app/components/HeaderClient.tsx` - Floating glass header
- `/src/components/ProgressBar.tsx` - Floating glass progress bar
- `/src/app/designs/[slug]/DesignDetailClient.tsx` - Complete glass theme implementation
- `/src/app/dashboard/DashboardClient.tsx` - Dashboard with themed cards
- `/src/app/dashboard/account/ProfileForm.tsx` - Glass form inputs implementation
- `/src/app/mi-equipo/[slug]/settings/page.tsx` - Standard text inputs & dropdowns (definitive reference)
