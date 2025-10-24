# Institution Design Request Wizard Revamp - Technical Specification

**Date:** 2025-10-20
**Status:** Planning Phase
**Priority:** High
**Complexity:** Very High (Major Architectural Change)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [New Requirements](#new-requirements)
4. [System Impact Analysis](#system-impact-analysis)
5. [Data Model Changes](#data-model-changes)
6. [Implementation Phases](#implementation-phases)
7. [Technical Decisions](#technical-decisions)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

This specification outlines a major revamp of the institution design request wizard to support **multi-team, multi-sport, multi-product ordering** for athletic directors. The current wizard only supports selecting teams from a single sport with identical products and designs. The new wizard will enable:

- **Multiple teams across different sports** (e.g., 2 soccer teams + 2 basketball teams)
- **Different products per team** (e.g., jerseys for basketball, full kit for soccer)
- **Different designs per product per team** with intelligent design suggestions
- **Streamlined color customization** with product-specific overrides
- **Roster estimates per team** for accurate order sizing

**Key Benefits:**
- Enables bulk ordering across entire athletic programs
- Reduces wizard repetition for multi-team orders
- Improves UX with smart design suggestions
- Maintains flexibility for per-team customization

---

## Current State Analysis

### Current Wizard Flow (Institution Teams)

```
Step 1: Team Selection
└─> User selects ONE team from institution sub-teams
    └─> Filtered to one sport only

Step 2: Gender Selection ⚠️ REDUNDANT
└─> Asks "Is the design for both teams or just one?"
    └─> This question is redundant since user already selected teams with gender

Step 3: Product Selection
└─> User picks products
    └─> Same products for all selected teams
    └─> No per-team customization

Step 4: Design Selection
└─> User picks ONE design per product
    └─> Same design for all products
    └─> No cross-product design suggestions

Step 5: Color Customization
└─> User picks team colors
    └─> Same colors for all products

Step 6: Roster Estimates
└─> User enters roster count
    └─> Single number for all teams

Step 7: Review & Submit
└─> Submit creates ONE design request
```

### Current Data Model (Zustand Store)

**Key Limitations:**
```typescript
// Only ONE sport at a time
sport_id: number | null;

// Teams selected, but forced to same sport
selectedTeams: Team[];

// Products are gender-aware but NOT team-aware
selectedProducts: {
  male?: Product[];
  female?: Product[];
};

// Designs are product-aware but NOT team-aware
productDesigns: {
  male?: Record<string, Design[]>; // productId -> designs
  female?: Record<string, Design[]>;
};
```

### Current Database Schema

**design_requests table:**
- One row = One design request
- `team_id`: Institution ID
- `sub_team_id`: Specific sub-team (e.g., "Varsity Basketball Men")
- `selected_apparel`: JSON with products and designs
- `status`: pending, in_review, approved, etc.

**Current Limitation:** One design request per sub-team. Cannot represent "4 teams ordering together."

---

## New Requirements

### User Story

> **As an Athletic Director**, I want to create a single bulk order for multiple teams across different sports, with different products and designs per team, so I can streamline ordering for my entire athletic program.

### New Wizard Flow

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Multi-Team Selection (MULTI-SPORT ENABLED)          │
├──────────────────────────────────────────────────────────────┤
│ User selects ALL teams they want to order for:              │
│   ✓ Varsity Soccer Men                                      │
│   ✓ Varsity Soccer Women                                    │
│   ✓ Varsity Basketball Men                                  │
│   ✓ Varsity Basketball Women                                │
│                                                              │
│ ⚠️ REMOVE: Redundant gender question                        │
│   Previously: "Is the design for both or just one?"         │
│   → Delete lines 759-804 in teams/page.tsx                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Products Per Team                                   │
├──────────────────────────────────────────────────────────────┤
│ For EACH selected team, user picks products:                │
│                                                              │
│ [Varsity Basketball Men] (Basketball)                       │
│   ✓ Jersey  ✓ Shorts                                        │
│                                                              │
│ [Varsity Basketball Women] (Basketball)                     │
│   ✓ Jersey  ✓ Shorts  ✓ Warm-up Jacket                     │
│                                                              │
│ [Varsity Soccer Men] (Soccer)                               │
│   ✓ Jersey  ✓ Shorts  ✓ Socks  ✓ Hoodie  ✓ Pants          │
│                                                              │
│ [Varsity Soccer Women] (Soccer)                             │
│   ✓ Jersey  ✓ Shorts  ✓ Socks                              │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Design Selection (SMART SUGGESTIONS)                │
├──────────────────────────────────────────────────────────────┤
│ For EACH product for EACH team:                             │
│                                                              │
│ [Soccer Men - Jersey] Pick a design:                        │
│   → User picks "Striker Pro" ❤️                             │
│                                                              │
│ 💡 Smart Suggestion:                                        │
│   "You loved 'Striker Pro'! Would you like this design      │
│    style on all your other products?"                       │
│                                                              │
│   [Yes, apply to all] [No, let me pick individually]        │
│                                                              │
│ Alternative: "Pick up to 3 favorite designs, and we'll      │
│ generate mockups for all your products in those styles."    │
│                                                              │
│ If user picks individually:                                 │
│   [Soccer Men - Shorts] Pick a design...                    │
│   [Soccer Men - Socks] Pick a design...                     │
│   [Soccer Men - Hoodie] Pick a design...                    │
│   [Soccer Men - Pants] Pick a design...                     │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Color Customization                                 │
├──────────────────────────────────────────────────────────────┤
│ Primary team colors (applied to all products):              │
│   Primary: #e21c21 (Red)                                    │
│   Secondary: #ffffff (White)                                │
│   Accent: #000000 (Black)                                   │
│                                                              │
│ 💡 Optional: Special colors for specific products/teams     │
│   "Do any teams or products need different colors?"         │
│                                                              │
│   Example:                                                   │
│   - Soccer Women want pink accents → Customize              │
│   - Basketball hoodies want navy blue → Customize           │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Roster Estimates (PER TEAM)                         │
├──────────────────────────────────────────────────────────────┤
│ Enter estimated roster size for each team:                  │
│                                                              │
│   Varsity Soccer Men: [25] players                          │
│   Varsity Soccer Women: [22] players                        │
│   Varsity Basketball Men: [18] players                      │
│   Varsity Basketball Women: [16] players                    │
│                                                              │
│ Total items across all teams: ~324 items                    │
│ Estimated cost: $4,860,000 CLP                              │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: Review & Submit                                     │
├──────────────────────────────────────────────────────────────┤
│ Summary of entire order:                                    │
│   - 4 teams                                                  │
│   - 2 sports (Soccer, Basketball)                           │
│   - 12 total product types                                  │
│   - ~324 total items                                         │
│                                                              │
│ Breakdown per team with products, designs, colors,          │
│ and roster estimates.                                       │
└──────────────────────────────────────────────────────────────┘
```

### Feature Requirements

#### 1. Multi-Sport Team Selection
- **Allow selecting teams from DIFFERENT sports**
- Remove the current restriction that forces all teams to be from one sport
- Display teams grouped by sport for easy navigation

#### 2. Per-Team Product Selection
- Each team can have **completely different products**
- Example: Basketball gets jerseys + shorts, Soccer gets full kit
- Products filtered by sport automatically

#### 3. Smart Design Suggestions
- **"Apply to all products" feature:**
  - User picks a jersey design they love
  - Wizard asks: "Apply this design to all your products?"
  - If yes, auto-populate all products with that design

- **Alternative: Multi-design favorites:**
  - User picks 2-3 favorite designs from ANY product
  - Admin team generates mockups for ALL products in those favorite designs
  - User picks which mockup set they like best

#### 4. Product-Specific Color Overrides
- Base team colors apply to all products by default
- Option to customize colors for specific products or teams
- Example: "Basketball Women want pink accents instead of red"

#### 5. Per-Team Roster Estimates
- Each team gets its own roster count
- Wizard calculates total items across all teams
- Shows cost breakdown per team

#### 6. Remove Redundant Gender Question
- **Delete the gender selection step (lines 759-804 in teams/page.tsx)**
- Gender is already determined by the teams selected
- No need to ask "is this for both or just one?"

---

## System Impact Analysis

### Affected Components

#### Frontend Components (9 files)
1. **`/src/store/design-request-wizard.ts`** - Major refactor
2. **`/src/app/mi-equipo/[slug]/design-request/new/teams/page.tsx`** - Remove gender question, enable multi-sport
3. **`/src/app/mi-equipo/[slug]/design-request/new/products/page.tsx`** - Per-team product selection
4. **`/src/app/mi-equipo/[slug]/design-request/new/designs/page.tsx`** - Smart design suggestions
5. **`/src/app/mi-equipo/[slug]/design-request/new/colors/page.tsx`** - Product/team-specific overrides
6. **`/src/app/mi-equipo/[slug]/design-request/new/quantities/page.tsx`** - Per-team roster estimates
7. **`/src/app/mi-equipo/[slug]/design-request/new/review/page.tsx`** - Multi-team summary
8. **`/src/components/institution/design-request/WizardLayout.tsx`** - Update step count/labels
9. **`/src/types/design-request.ts`** - New TypeScript interfaces

#### Backend APIs (3 files)
1. **`/src/app/api/design-requests/create/route.ts`** - Handle multi-team submissions
2. **`/src/app/api/design-requests/[id]/route.ts`** - Fetch multi-team requests
3. **`/src/app/api/institutions/[slug]/orders/route.ts`** - Display grouped orders

#### Database Schema (1 migration)
1. **New table: `design_request_items`** - One row per team in a bulk request
2. **Update: `design_requests`** - Add `is_bulk_order` flag, `bulk_order_id`

---

## Data Model Changes

### New Zustand Store Structure

```typescript
interface DesignRequestWizardState {
  // Institution context
  institutionId: string | null;
  institutionSlug: string | null;

  // STEP 1: Multi-Team Selection (MULTI-SPORT)
  selectedTeams: SelectedTeam[]; // Can be from DIFFERENT sports now

  // STEP 2: Products Per Team
  teamProducts: Record<string, Product[]>; // teamId -> Product[]

  // STEP 3: Designs Per Product Per Team
  teamProductDesigns: Record<string, Record<string, Design[]>>; // teamId -> productId -> Design[]

  // Design suggestions
  favoriteDesigns: Design[]; // User's favorite designs to apply across products
  applyDesignToAll: boolean; // Flag: apply selected design to all products?

  // STEP 4: Colors (with overrides)
  baseColors: ColorCustomization; // Default colors for all
  colorOverrides: Record<string, ColorCustomization>; // teamId+productId -> custom colors

  // STEP 5: Roster Estimates Per Team
  teamRosterEstimates: Record<string, number>; // teamId -> roster count

  // Computed
  totalItems: number; // Sum across all teams
  estimatedCost: number;
  teamCount: number;
  sportCount: number;
}

interface SelectedTeam {
  id: string;
  name: string;
  slug?: string;
  sport_id: number;
  sport_name: string;
  gender_category: 'male' | 'female' | 'both';
  coach?: string;
  isNew: boolean;
  colors?: TeamColors;
}
```

### Database Schema Changes

#### Option 1: Single Design Request with Items (NOT SELECTED)

```sql
-- design_requests table (existing, add fields)
ALTER TABLE design_requests
ADD COLUMN is_bulk_order BOOLEAN DEFAULT FALSE,
ADD COLUMN bulk_team_count INTEGER DEFAULT 1;

-- New table: design_request_items
CREATE TABLE design_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_request_id UUID NOT NULL REFERENCES design_requests(id) ON DELETE CASCADE,
  sub_team_id UUID NOT NULL REFERENCES institution_sub_teams(id),

  -- Products and designs for THIS team
  selected_products JSONB NOT NULL, -- Array of product objects
  product_designs JSONB NOT NULL,   -- productId -> designs mapping

  -- Colors for THIS team (can override parent)
  color_customization JSONB,

  -- Roster estimate for THIS team
  estimated_roster_size INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_request_items_request ON design_request_items(design_request_id);
CREATE INDEX idx_design_request_items_team ON design_request_items(sub_team_id);
```

**How it works:**
- ONE `design_requests` row for the entire bulk order
- Multiple `design_request_items` rows (one per team)
- Each item has its own products, designs, colors, and roster estimate

**Benefits:**
- ✅ Maintains single design request workflow
- ✅ Easy to track status (one status for entire bulk order)
- ✅ Clean admin interface (one request card shows all teams)
- ✅ Simpler billing (one invoice for entire order)

**Drawbacks:**
- ❌ All teams share one status (can't approve basketball while soccer is pending)
- ❌ Requires new table and significant API changes
- ❌ Admin can't work on teams independently

#### Option 2: Multiple Linked Design Requests (✅ CONFIRMED APPROACH)

```sql
ALTER TABLE design_requests
ADD COLUMN bulk_order_id UUID,
ADD COLUMN is_part_of_bulk BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_design_requests_bulk_order ON design_requests(bulk_order_id);
```

**How it works:**
- Create MULTIPLE `design_requests` rows (one per team)
- Link them with a shared `bulk_order_id` UUID
- Each has its own products, designs, status, etc.
- Each request follows the existing data structure

**Benefits:**
- ✅ No new tables needed - minimal schema changes
- ✅ Each team can have independent status (e.g., Basketball approved, Soccer pending)
- ✅ Admin can upload mockups per team separately
- ✅ Each request appears as a separate card in admin dashboard (matches existing workflow)
- ✅ Minimal changes to existing APIs and components
- ✅ Backward compatible - old requests continue working as-is

**Drawbacks:**
- ❌ More database rows (but storage is cheap)
- ❌ Need to group by bulk_order_id in some views
- ❌ Athletic Director sees multiple cards instead of one (but this is intentional)

**User Confirmation:** "admin will receive all the design requests for each particular team. We just get more request at once"

**CONFIRMED: This is the selected approach per user requirements**

---

## Implementation Phases

### Phase 1: Data Model & State Management (Week 1)

**Goal:** Update Zustand store and TypeScript types

**Tasks:**
1. ✅ Update `design-request-wizard.ts` with new multi-team data model
2. ✅ Create new TypeScript interfaces in `/src/types/design-request.ts`
3. ✅ Add computed properties (totalItems, teamCount, sportCount)
4. ✅ Write unit tests for new store actions

**Deliverables:**
- Updated Zustand store
- New TypeScript types
- Unit tests passing

---

### Phase 2: Database Schema (Week 1)

**Goal:** Create database migration for multi-team bulk order support

**Tasks:**
1. ✅ Write migration: `20251021_add_bulk_order_support.sql`
2. ✅ Add `bulk_order_id` UUID column to `design_requests`
3. ✅ Add `is_part_of_bulk` BOOLEAN column to `design_requests`
4. ✅ Create index on `bulk_order_id` for efficient grouping
5. ✅ Test migration on staging database
6. ✅ Update Supabase TypeScript types

**Deliverables:**
- SQL migration file (simple - just 2 columns and 1 index)
- Updated database schema
- Verified on staging

---

### Phase 3: Step 1 - Multi-Team Selection (Week 2)

**Goal:** Enable multi-sport team selection and remove redundant gender question

**Tasks:**
1. ✅ Remove gender selection section (lines 759-804 in `teams/page.tsx`)
2. ✅ Remove single-sport restriction in team selection
3. ✅ Group teams by sport in UI
4. ✅ Allow selecting teams from multiple sports
5. ✅ Update team selection state management
6. ✅ Add visual indicators for selected teams across sports

**Deliverables:**
- Updated `teams/page.tsx`
- Multi-sport selection working
- No redundant gender question

---

### Phase 4: Step 2 - Per-Team Product Selection (Week 2-3)

**Goal:** Allow different products per team

**Tasks:**
1. ✅ Refactor `products/page.tsx` to show teams in tabs/sections
2. ✅ Filter products by each team's sport
3. ✅ Save products per team ID (not globally)
4. ✅ Add visual summary showing products per team
5. ✅ Handle navigation between teams

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Select Products for Each Team                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Tabs/Accordion:]                                       │
│   ▸ Varsity Soccer Men (Soccer) - 3 products selected  │
│   ▾ Varsity Soccer Women (Soccer)                      │
│       [Jersey] [Shorts] [Socks] [Hoodie] [Pants]       │
│       ✓ Jersey  ✓ Shorts  ✓ Socks                      │
│   ▸ Varsity Basketball Men (Basketball) - 2 selected   │
│   ▸ Varsity Basketball Women (Basketball) - 3 selected │
│                                                         │
│ Total: 11 products across 4 teams                      │
└─────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Updated `products/page.tsx`
- Per-team product selection working
- Visual summary

---

### Phase 5: Step 3 - Smart Design Suggestions (Week 3-4)

**Goal:** Implement intelligent design selection with "apply to all" feature

**Tasks:**
1. ✅ Refactor `designs/page.tsx` for per-team, per-product design selection
2. ✅ Add "Apply to All Products" button after first design selection
3. ✅ Implement design suggestion modal/dialog
4. ✅ Add "Pick Favorite Designs" alternative flow
5. ✅ Save designs per team per product
6. ✅ Add skip/auto-fill logic for "apply to all"

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Select Designs                                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ [Varsity Soccer Men - Jersey]                           │
│ Pick a design:                                           │
│   [Design 1] [Design 2] [✓ Striker Pro] [Design 4]      │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 💡 You picked "Striker Pro"!                       │  │
│ │                                                    │  │
│ │ Would you like to apply this design to all        │  │
│ │ your other products?                               │  │
│ │                                                    │  │
│ │ This will save you time by using the same         │  │
│ │ design style across:                               │  │
│ │   • Shorts                                         │  │
│ │   • Socks                                          │  │
│ │   • Hoodie                                         │  │
│ │   • Pants                                          │  │
│ │                                                    │  │
│ │ [Yes, Apply to All] [No, Pick Individually]       │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Alternative Flow: Favorite Designs**
```
┌──────────────────────────────────────────────────────────┐
│ Pick Your Favorite Designs (Up to 3)                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Browse all designs and mark your favorites:              │
│   [✓ Striker Pro] [Phoenix Rising] [✓ Classic Stripe]   │
│   [Modern Mesh] [✓ Elite Edge] [Bold Blocks]            │
│                                                          │
│ You've selected 3 favorites                              │
│                                                          │
│ Our design team will create mockups for ALL your        │
│ products in these 3 styles. You'll review and choose    │
│ your favorite set.                                       │
│                                                          │
│ [Continue]                                               │
└──────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Updated `designs/page.tsx`
- "Apply to All" feature working
- Favorite designs flow implemented

---

### Phase 6: Step 4 - Color Customization with Overrides (Week 4)

**Goal:** Base colors + optional per-product/per-team overrides

**Tasks:**
1. ✅ Update `colors/page.tsx` with base color selection
2. ✅ Add "Customize specific products" section
3. ✅ Implement color override UI
4. ✅ Save base colors + overrides separately
5. ✅ Add preview showing which products have custom colors

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Team Colors                                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Base Colors (Applied to all products):                  │
│   Primary: [#e21c21] ●                                   │
│   Secondary: [#ffffff] ●                                 │
│   Accent: [#000000] ●                                    │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 💡 Need different colors for specific products?   │  │
│ │    [Customize Colors]                              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [If user clicks "Customize Colors":]                    │
│                                                          │
│ Custom Colors:                                           │
│   ▾ Soccer Women                                         │
│       Jersey: Use base colors ●                          │
│       Shorts: Custom [#ff1493] [#ffffff] [#000000]      │
│       Socks: Use base colors ●                           │
│                                                          │
│   ▾ Basketball Men                                       │
│       Hoodie: Custom [#001f3f] [#ffffff] [#e21c21]      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Updated `colors/page.tsx`
- Base colors + overrides working
- Preview of custom colors

---

### Phase 7: Step 5 - Per-Team Roster Estimates (Week 5)

**Goal:** Collect roster size for each team

**Tasks:**
1. ✅ Update `quantities/page.tsx` to show list of teams
2. ✅ Add input field for each team's roster estimate
3. ✅ Calculate total items across all teams
4. ✅ Show cost breakdown per team
5. ✅ Save roster estimates per team

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Roster Estimates                                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Enter estimated roster size for each team:              │
│                                                          │
│ ┌─ Soccer ──────────────────────────────────────────┐   │
│ │ Varsity Soccer Men      [25] players              │   │
│ │ Varsity Soccer Women    [22] players              │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Basketball ──────────────────────────────────────┐   │
│ │ Varsity Basketball Men  [18] players              │   │
│ │ Varsity Basketball Women [16] players             │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Summary ─────────────────────────────────────────┐   │
│ │ Total players: 81                                 │   │
│ │ Total items: ~324 (avg 4 products/player)         │   │
│ │ Estimated cost: $4,860,000 CLP                    │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Updated `quantities/page.tsx`
- Per-team roster inputs
- Cost breakdown

---

### Phase 8: Step 6 - Review & Submit (Week 5)

**Goal:** Comprehensive review of entire multi-team order

**Tasks:**
1. ✅ Update `review/page.tsx` to show all teams
2. ✅ Group by sport for clarity
3. ✅ Show products, designs, colors, roster per team
4. ✅ Display grand totals
5. ✅ Handle submission to create bulk design request

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Review Your Order                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Order Summary:                                           │
│   • 4 teams across 2 sports                              │
│   • 11 total product types                               │
│   • ~324 total items                                     │
│   • Estimated: $4,860,000 CLP                            │
│                                                          │
│ ┌─ Soccer ──────────────────────────────────────────┐   │
│ │ ▾ Varsity Soccer Men (25 players)                │   │
│ │   Products: Jersey, Shorts, Socks                 │   │
│ │   Designs: Striker Pro (all products)             │   │
│ │   Colors: Red/White/Black                         │   │
│ │   Items: 75                                       │   │
│ │                                                   │   │
│ │ ▾ Varsity Soccer Women (22 players)              │   │
│ │   Products: Jersey, Shorts, Socks                 │   │
│ │   Designs: Striker Pro (all products)             │   │
│ │   Colors: Shorts have pink accent (custom)        │   │
│ │   Items: 66                                       │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Basketball ──────────────────────────────────────┐   │
│ │ ▾ Varsity Basketball Men (18 players)            │   │
│ │   Products: Jersey, Shorts                        │   │
│ │   Designs: Phoenix Rising (all products)          │   │
│ │   Colors: Red/White/Black                         │   │
│ │   Items: 36                                       │   │
│ │                                                   │   │
│ │ ▾ Varsity Basketball Women (16 players)          │   │
│ │   Products: Jersey, Shorts, Hoodie                │   │
│ │   Designs: Phoenix Rising (all products)          │   │
│ │   Colors: Hoodie has navy blue (custom)           │   │
│ │   Items: 48                                       │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ [Edit Order] [Submit Request]                            │
└──────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Updated `review/page.tsx`
- Complete multi-team summary
- Submission working

---

### Phase 9: Backend API Updates (Week 6)

**Goal:** Update APIs to handle multi-team bulk submissions

**Tasks:**
1. ✅ Update `/api/design-requests/create/route.ts`:
   - Accept array of team design requests
   - Generate shared `bulk_order_id` UUID
   - Create MULTIPLE `design_requests` rows (one per team)
   - Set `is_part_of_bulk: true` and link with `bulk_order_id`
   - Return array of created request IDs + bulk_order_id

2. ✅ Update `/api/design-requests/[id]/route.ts`:
   - Fetch individual design request as normal
   - If `is_part_of_bulk`, also return `bulk_order_id` for reference
   - Minimal changes needed

3. ✅ Update `/api/institutions/[slug]/orders/route.ts`:
   - Group design requests by `bulk_order_id` if present
   - Display bulk orders as grouped items in UI
   - Already has grouping logic, just need to add bulk_order_id support

4. ✅ Add new endpoint: `/api/design-requests/bulk/[bulk_order_id]/route.ts`:
   - Fetch all design_requests with matching bulk_order_id
   - Return array of all team requests in the bulk order
   - Used for "View All Teams" functionality

**API Payload Example:**
```json
{
  "bulk_order": true,
  "bulk_order_id": "550e8400-e29b-41d4-a716-446655440000",
  "teams": [
    {
      "team_id": "inst-123",
      "sub_team_id": "team-soccer-men",
      "sport_slug": "soccer",
      "user_id": "user-456",
      "status": "pending",
      "selected_apparel": [...],
      "primary_color": "#e21c21",
      "secondary_color": "#ffffff",
      "accent_color": "#000000",
      "estimated_roster_size": 25,
      "is_part_of_bulk": true,
      "bulk_order_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "team_id": "inst-123",
      "sub_team_id": "team-soccer-women",
      "sport_slug": "soccer",
      "user_id": "user-456",
      "status": "pending",
      "selected_apparel": [...],
      "primary_color": "#e21c21",
      "secondary_color": "#ffffff",
      "accent_color": "#ff1493",
      "estimated_roster_size": 22,
      "is_part_of_bulk": true,
      "bulk_order_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    // ... more teams (each becomes a separate design_requests row)
  ]
}
```

**Response:**
```json
{
  "success": true,
  "bulk_order_id": "550e8400-e29b-41d4-a716-446655440000",
  "design_request_ids": [
    "dr-123",
    "dr-124",
    "dr-125",
    "dr-126"
  ],
  "team_count": 4
}
```

**Deliverables:**
- Updated create endpoint (creates multiple rows in a transaction)
- Updated fetch endpoint (minimal changes)
- New bulk fetch endpoint
- Updated orders listing endpoint (group by bulk_order_id)
- API tests passing

---

### Phase 10: Admin Dashboard Updates (Week 7)

**Goal:** Update admin interface to display bulk orders

**Tasks:**
1. ✅ Update design request card component
2. ✅ Show "Bulk Order (4 teams)" badge
3. ✅ Expandable list of teams in bulk order
4. ✅ Approve/reject individual teams or entire bulk order
5. ✅ Upload mockups per team

**Deliverables:**
- Updated admin components
- Bulk order display working
- Approval workflow tested

---

### Phase 11: Testing & QA (Week 8)

**Goal:** Comprehensive testing of entire wizard

**Test Cases:**
1. ✅ Single team order (regression test)
2. ✅ Multi-team, single sport
3. ✅ Multi-team, multi-sport
4. ✅ "Apply to all products" design suggestion
5. ✅ Favorite designs flow
6. ✅ Color overrides
7. ✅ Per-team roster estimates
8. ✅ Submission and database verification
9. ✅ Admin dashboard display
10. ✅ Order creation from design request

**Deliverables:**
- Test report
- Bug fixes
- Documentation updated

---

## Technical Decisions

### Decision 1: Single Request vs. Multiple Requests

**Question:** Should a bulk order create ONE design request or MULTIPLE linked requests?

**Options:**
1. **Single request with items table** (design_request_items)
2. **Multiple requests linked by bulk_order_id**

**Decision:** **✅ Option 2 - Multiple requests linked by bulk_order_id**

**User Requirement:** "admin will receive all the design requests for each particular team. We just get more request at once"

**Rationale:**
- ✅ Each team gets its own design_requests row (matches admin workflow)
- ✅ Each team can have independent status tracking
- ✅ Admin can upload mockups per team separately
- ✅ Minimal schema changes (just 2 columns)
- ✅ Backward compatible with existing single-team requests
- ✅ No new tables needed
- ❌ More database rows (but this is manageable)

**Implementation:** Add `bulk_order_id` UUID and `is_part_of_bulk` BOOLEAN to existing `design_requests` table

---

### Decision 2: Design Suggestions - "Apply to All" vs. "Favorite Designs"

**Question:** How should we simplify design selection for multiple products?

**Options:**
1. **"Apply to All"** - User picks one design, apply to all products
2. **"Favorite Designs"** - User picks 2-3 favorites, admin generates mockups
3. **Both** - Offer both options

**Decision:** **Option 3 - Implement both, user chooses**

**Rationale:**
- ✅ Maximum flexibility
- ✅ "Apply to All" is fastest for simple orders
- ✅ "Favorite Designs" is better for complex multi-product orders
- ✅ User can decide based on their needs

**Implementation:**
- Show "Apply to All" button after first design selection
- Also offer "Pick Favorites" mode at top of page
- User chooses their preferred workflow

---

### Decision 3: Color Overrides - How Granular?

**Question:** Should color overrides be per-product, per-team, or per-product-per-team?

**Options:**
1. **Per-team** - Each team can have different base colors
2. **Per-product-per-team** - Each product on each team can have custom colors
3. **Base + overrides** - One set of base colors, optional overrides

**Decision:** **Option 3 - Base colors + optional overrides**

**Rationale:**
- ✅ Most common case: all teams use same colors
- ✅ Flexibility for edge cases (e.g., women's team wants pink accents)
- ✅ Cleaner UI (not overwhelming)
- ✅ Easy to understand

**Implementation:**
- One set of base colors at top of colors page
- "Customize specific products" section below
- Store as: `baseColors` + `colorOverrides: Record<teamId+productId, colors>`

---

### Decision 4: Multi-Sport Support

**Question:** Should we allow multi-sport team selection or keep single-sport restriction?

**Options:**
1. **Multi-sport** - Select teams from any sport
2. **Single-sport** - Keep current restriction

**Decision:** **Option 1 - Multi-sport enabled**

**Rationale:**
- ✅ User explicitly requested this
- ✅ More flexible for Athletic Directors
- ✅ Products are already filtered by sport automatically
- ✅ No technical limitation preventing this

**Implementation:**
- Remove `sportIds.size > 1` check in teams/page.tsx (line 409)
- Group teams by sport in UI for clarity
- Filter products per team's sport in products page

---

## Risk Assessment

### High Risks

#### 1. Data Model Complexity
**Risk:** Multi-team data model is significantly more complex than current single-team model.

**Mitigation:**
- Create comprehensive TypeScript types
- Write extensive unit tests for state management
- Use clear naming conventions (teamProducts, teamProductDesigns, etc.)
- Document data flow in comments

---

#### 2. Backward Compatibility
**Risk:** Existing single-team design requests may break with new data model.

**Mitigation:**
- Keep `is_bulk_order` flag to distinguish old vs. new requests
- Maintain support for old data structure in API endpoints
- Add migration script to convert old requests to new format (optional)
- Test thoroughly with existing requests

---

#### 3. UI Complexity
**Risk:** Multi-team wizard could become overwhelming for users.

**Mitigation:**
- Use tabs/accordion to show one team at a time
- Add progress indicators per team
- Show clear summaries of selections
- Offer "Apply to All" shortcuts to reduce repetition

---

#### 4. Performance
**Risk:** Loading products/designs for 10+ teams could be slow.

**Mitigation:**
- Lazy load designs per team (don't load all upfront)
- Use React Query for caching
- Add loading skeletons
- Consider pagination if > 10 teams

---

### Medium Risks

#### 5. Admin Dashboard Complexity
**Risk:** Reviewing bulk orders in admin could be confusing.

**Mitigation:**
- Clear visual grouping by bulk order
- Expandable/collapsible team items
- Approve entire bulk order with one click option
- Per-team approval also available

---

#### 6. Cost Calculation Accuracy
**Risk:** Total cost calculation with different products per team could be wrong.

**Mitigation:**
- Calculate cost per team separately, then sum
- Show breakdown in review step
- Add automated tests for cost calculation
- Log calculations for debugging

---

### Low Risks

#### 7. Mobile Responsiveness
**Risk:** Complex multi-team UI may not fit on mobile.

**Mitigation:**
- Design mobile-first
- Use accordion/tabs for space efficiency
- Test on various screen sizes

---

## Next Steps

1. ✅ **Get approval on this specification**
2. ✅ **Clarify any ambiguous requirements with user**
3. ✅ **Begin Phase 1: Data Model & State Management**
4. ✅ **Schedule weekly check-ins to review progress**

---

## Open Questions for User

1. **Design Suggestions:** Do you prefer "Apply to All" or "Favorite Designs" workflow? Or both?

2. **Color Overrides:** Should we allow per-team color overrides, or only per-product overrides?

3. **Approval Workflow:** Should admins approve the entire bulk order at once, or each team individually?

4. **Pricing:** Should bulk orders get a discount? If so, how is it calculated?

5. **Roster Limits:** Should we enforce min/max roster sizes per team?

6. **Product Restrictions:** Can teams from the same sport have completely different products, or should there be some consistency?

---

## Appendix: Files to Modify

### Frontend (13 files)
```
/src/store/design-request-wizard.ts - Complete refactor
/src/types/design-request.ts - New interfaces
/src/app/mi-equipo/[slug]/design-request/new/teams/page.tsx - Remove gender Q, multi-sport
/src/app/mi-equipo/[slug]/design-request/new/products/page.tsx - Per-team products
/src/app/mi-equipo/[slug]/design-request/new/designs/page.tsx - Smart suggestions
/src/app/mi-equipo/[slug]/design-request/new/colors/page.tsx - Base + overrides
/src/app/mi-equipo/[slug]/design-request/new/quantities/page.tsx - Per-team rosters
/src/app/mi-equipo/[slug]/design-request/new/review/page.tsx - Multi-team summary
/src/components/institution/design-request/WizardLayout.tsx - Update steps
/src/app/admin/clients/DesignRequestCard.tsx - Bulk order display
/src/hooks/api/useDesignRequests.ts - Fetch bulk requests
/src/hooks/useTeamDesignRequest.ts - Handle bulk
/src/lib/mockup-helpers.ts - Mockup generation for bulk
```

### Backend (4 files)
```
/src/app/api/design-requests/create/route.ts - Create bulk
/src/app/api/design-requests/[id]/route.ts - Fetch bulk
/src/app/api/design-requests/bulk/[id]/route.ts - NEW endpoint
/src/app/api/institutions/[slug]/orders/route.ts - Display bulk
```

### Database (1 migration)
```
/supabase/migrations/20251021_add_bulk_order_support.sql - Add bulk_order_id and is_part_of_bulk columns
```

### Documentation (2 files)
```
/docs/INSTITUTION_WIZARD_REVAMP_SPEC.md - This file
/docs/MULTI_TEAM_ORDERING_GUIDE.md - User guide (NEW)
```

---

**Total Estimated Effort:** 8 weeks (1 developer full-time)

**Priority:** High - Enables major revenue increase from bulk institutional orders

**Status:** Awaiting approval to proceed with implementation
