# 🏆 DESERVE ATHLETICS - MASTER IMPLEMENTATION PLAN
**Chief Engineer's Unified Roadmap**
*Last Updated: 2025-10-11 (Evening Update)*

---

## 📊 EXECUTIVE SUMMARY

This master plan integrates all active development streams into one cohesive roadmap to deliver Deserve Athletics' vision: **the world's best uniform provider for small and large teams through efficiency and effectiveness.**

### Strategic Pillars

1. **Design vs Product Architecture** - Separate visual designs from physical products (NEXT PRIORITY)
2. **Team Management System** - Complete player info collection and payment flows (75% COMPLETE ✅)
3. **Sports Unification** - Solidify sport_id infrastructure across entire app (COMPLETED ✅)
4. **Payment Integration** - Finalize Mercado Pago split/bulk payments (95% COMPLETE ✅)

---

## ✅ RECENTLY COMPLETED (Context)

### Manager Design Approval & Player Payments ✅ (Oct 11, 2025)
- [x] Manager approval modal with payment mode selection
- [x] Automatic order creation from approved designs
- [x] Order items created for all team members
- [x] Player payment view with "Tu Pago" section
- [x] Manager payment controls
- [x] RLS policies for orders (team members can view)
- [x] Chilean Peso formatting fixed (no cents division)
- [x] Mercado Pago payment amounts corrected
- [x] Payment progress display
- [x] Individual payment flow tested and working

### Sports Unification ✅
- [x] Cleaned sports table to 4 canonical sports (futbol, basquetbol, voleibol, rugby)
- [x] Migrated teams to use sport_id foreign keys
- [x] Updated `/mi-equipo/page.tsx` to load sports BEFORE team check
- [x] Fixed sports dropdown in team creation
- [x] Updated homepage to use Spanish sport slugs

### Team Management Phase 1 ✅
- [x] Team settings & permissions system
- [x] Design approval card (owner/manager controls)
- [x] Progress tracker with milestone checklist
- [x] Team dashboard foundation (`/mi-equipo/[slug]`)

### Mercado Pago Integration ✅
- [x] Split payment tables (`payment_contributions`)
- [x] Bulk payment tables (`bulk_payments`, `bulk_payment_orders`)
- [x] Webhook handler with signature validation
- [x] Order items tracking
- [x] Payment redirect pages (success/failure/pending)

### Database Foundation ✅
- [x] 68 migrations executed successfully
- [x] RLS policies configured
- [x] Player info submission infrastructure
- [x] Collection token system for anonymous submissions

---

## 🎯 ACTIVE DEVELOPMENT PRIORITIES

---

## **PHASE A: DESIGN VS PRODUCT ARCHITECTURE** 🚀 HIGHEST PRIORITY

**WHY THIS MATTERS**: Current system conflates designs (visual patterns) with products (physical items). This architectural fix enables:
- Product-first navigation (users browse jerseys, then see designs)
- Cross-sport design flexibility (soccer design on basketball jersey)
- Scalable content strategy (products set once, designs added continuously)
- Admin efficiency (upload soccer mockup, add basketball later)

**Reference Document**: `ARCHITECTURE_DESIGN_VS_PRODUCT.md`

### A.1: Database Schema Migration (Week 1)

**Goal**: Create new tables separating designs from products

**Migration File**: `069_design_product_separation.sql`

```sql
-- 🎨 DESIGNS TABLE (pure visual patterns)
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  designer_name TEXT,
  style_tags TEXT[],           -- ["modern", "classic", "geometric"]
  color_scheme TEXT[],          -- ["blue", "red", "white"]
  is_customizable BOOLEAN DEFAULT true,
  allows_recoloring BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🖼️ DESIGN MOCKUPS (how design looks on sport+product combinations)
CREATE TABLE design_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  sport_id BIGINT NOT NULL REFERENCES sports(id),
  product_type_slug TEXT NOT NULL,          -- "jersey", "shorts", "hoodie"
  mockup_url TEXT NOT NULL,
  view_angle TEXT,                          -- "front", "back", "side"
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id, sport_id, product_type_slug, view_angle)
);

-- 👕 PRODUCTS TABLE (restructured - remove design fields)
-- MODIFY existing products table to be pure product catalog
ALTER TABLE products DROP COLUMN IF EXISTS images;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE products ADD CONSTRAINT unique_sport_product_type
  UNIQUE(sport_id, product_type_slug);

-- 🎨👕 JUNCTION TABLE (which designs work on which products)
CREATE TABLE design_products (
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_recommended BOOLEAN DEFAULT true,
  preview_mockup_id UUID REFERENCES design_mockups(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (design_id, product_id)
);

-- 📝 UPDATE DESIGN REQUESTS
ALTER TABLE design_requests ADD COLUMN design_id UUID REFERENCES designs(id);
-- Note: Keep product_id as-is for now, will migrate data

-- 📦 UPDATE ORDER ITEMS
ALTER TABLE order_items ADD COLUMN design_id UUID REFERENCES designs(id);
-- Note: product_id already exists, will migrate references
```

**Tasks**:
- [ ] Create migration file with schema changes
- [ ] Add indexes on new tables
- [ ] Add RLS policies for designs and design_mockups
- [ ] Create updated_at triggers
- [ ] Test migration in development environment
- [ ] Verify no breaking changes to existing orders

**Testing Checklist**:
- [ ] Migration runs without errors
- [ ] Existing orders/products still accessible
- [ ] Can insert test design
- [ ] Can insert test design_mockup
- [ ] RLS policies prevent unauthorized access

---

### A.2: Data Migration & Backfill (Week 1-2)

**Goal**: Migrate existing product data to new structure without data loss

**Migration File**: `070_backfill_designs_from_products.sql`

**Strategy**:
1. Extract unique designs from existing products table
2. Create design records
3. Create design_mockups from product images
4. Link existing design_requests to new design_id
5. Link existing order_items to new design_id

**Script**:
```sql
-- Step 1: Create designs from existing products
-- Identify unique designs (products with same base attributes but different sports)
-- This will require manual review and mapping

-- Step 2: Create design_mockups
-- Map existing product.images → design_mockups table

-- Step 3: Update design_requests
UPDATE design_requests dr
SET design_id = (
  SELECT d.id FROM designs d
  WHERE d.slug = dr.product_slug  -- Mapping logic TBD
)
WHERE design_id IS NULL;

-- Step 4: Update order_items
UPDATE order_items oi
SET design_id = (
  SELECT d.id FROM designs d
  JOIN products p ON p.id = oi.product_id
  WHERE d.slug = p.slug  -- Mapping logic TBD
)
WHERE design_id IS NULL;
```

**Tasks**:
- [ ] Audit existing products table
- [ ] Identify unique designs vs products
- [ ] Create mapping document (old product_id → new design_id)
- [ ] Write backfill migration
- [ ] Test migration on development data
- [ ] Verify data integrity after migration
- [ ] Document any manual interventions required

**Testing Checklist**:
- [ ] All existing orders have design_id
- [ ] All existing design_requests have design_id
- [ ] No orphaned records
- [ ] Product prices preserved
- [ ] Image URLs migrated correctly

---

### A.3: API Endpoints for Design/Product Catalog (Week 2)

**Goal**: Build APIs for product-first navigation flow

**New API Routes**:

#### `/api/catalog/[sport]/products` - Product Type Catalog
```typescript
// GET /api/catalog/futbol/products
// Returns: List of product types for a sport
{
  data: [
    {
      product_type_slug: "jersey",
      product_type_name: "Camisetas",
      base_price_cents: 25000,
      sport_id: 1,
      available_designs_count: 150,
      sample_design_mockup: "https://...",
      featured_designs: [...]
    },
    {
      product_type_slug: "shorts",
      product_type_name: "Shorts",
      base_price_cents: 15000,
      ...
    }
  ]
}
```

#### `/api/catalog/[sport]/[product_type]/designs` - Design Browser
```typescript
// GET /api/catalog/futbol/jersey/designs
// Returns: All designs available for this sport+product combo
{
  data: [
    {
      design_id: "uuid",
      slug: "blue-thunder",
      name: "Blue Thunder",
      style_tags: ["modern", "geometric"],
      primary_mockup_url: "https://...",
      available_on_sports: ["futbol", "basquetbol", "voleibol"]
    },
    ...
  ]
}
```

#### `/api/designs/[slug]` - Design Detail
```typescript
// GET /api/designs/blue-thunder?sport=futbol
// Returns: Design with mockups for all sports
{
  design: {
    id: "uuid",
    slug: "blue-thunder",
    name: "Blue Thunder",
    description: "Bold geometric pattern",
    style_tags: ["modern", "geometric", "bold"],
    color_scheme: ["blue", "white", "black"],
    allows_recoloring: true
  },
  mockups: [
    {
      sport_id: 1,
      sport_slug: "futbol",
      product_type: "jersey",
      mockup_url: "https://...",
      view_angle: "front",
      is_primary: true
    },
    {
      sport_id: 2,
      sport_slug: "basquetbol",
      product_type: "jersey",
      mockup_url: "https://...",
      is_primary: true
    }
  ],
  available_products: [
    {
      sport_id: 1,
      product_type: "jersey",
      price_cents: 25000
    },
    {
      sport_id: 1,
      product_type: "shorts",
      price_cents: 15000
    }
  ]
}
```

**Tasks**:
- [ ] Create `/api/catalog/[sport]/products/route.ts`
- [ ] Create `/api/catalog/[sport]/[product_type]/designs/route.ts`
- [ ] Create `/api/designs/[slug]/route.ts`
- [ ] Add caching for catalog queries (Redis/in-memory)
- [ ] Add pagination for design lists
- [ ] Add filtering (by style tags, color scheme)
- [ ] Add sorting (featured, newest, popular)
- [ ] Write API tests

**Testing Checklist**:
- [ ] Product catalog returns correct counts
- [ ] Design browser filters by sport+product correctly
- [ ] Design detail shows cross-sport mockups
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] Performance acceptable (<200ms response)

---

### A.4: Frontend - Product-First Navigation (Week 3)

**Goal**: Rebuild catalog flow with product-first approach

**New/Updated Pages**:

#### `/catalog/[sport]` - Product Type Catalog Page
```tsx
// src/app/catalog/[sport]/page.tsx
// Shows: Camisetas, Shorts, Poleras, Medias
// Each card: product type, price, design count, sample design

interface ProductTypeCatalogProps {
  params: { sport: string };
}

export default function ProductTypeCatalog({ params }: ProductTypeCatalogProps) {
  // Fetch product types for this sport
  // Display grid of product cards
  // Link to /catalog/[sport]/[product_type]
}
```

#### `/catalog/[sport]/[product_type]` - Design Browser Page
```tsx
// src/app/catalog/[sport]/[product_type]/page.tsx
// Shows: Grid of designs on selected product type
// Each card: design mockup, name, tags, available sports icons

export default function DesignBrowser({ params }: DesignBrowserProps) {
  // Fetch designs for sport + product_type
  // Display design grid
  // Link to /designs/[slug]?sport=X&product=Y
}
```

#### `/designs/[slug]` - Design Detail Page (NEW)
```tsx
// src/app/designs/[slug]/page.tsx
// Shows: Design with sport switcher
// User can switch between sports to see same design on different sport versions

export default function DesignDetail({ params, searchParams }: DesignDetailProps) {
  const currentSport = searchParams.sport || 'futbol';

  // Sport Switcher UI
  // Primary mockup for current sport
  // Product selector (jersey, shorts, etc.)
  // "Add to Order" button
  // Cross-sport navigation
}
```

**Components to Build**:
- [ ] `ProductTypeCard.tsx` - Display product with sample design
- [ ] `DesignCard.tsx` - Design preview with metadata
- [ ] `SportSwitcher.tsx` - Toggle between sports on design detail
- [ ] `DesignMockupViewer.tsx` - Image viewer with zoom
- [ ] `ProductSelector.tsx` - Choose product types to add
- [ ] `DesignFilterBar.tsx` - Filter by tags, colors

**Tasks**:
- [ ] Create Product Type Catalog page
- [ ] Create Design Browser page
- [ ] Create Design Detail page with sport switcher
- [ ] Build all components
- [ ] Update existing homepage to link to new catalog
- [ ] Migrate old `/catalog` page (deprecate or redirect)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsive design
- [ ] Test on all screen sizes

**Testing Checklist**:
- [ ] Can navigate: Homepage → Sport → Products → Designs → Detail
- [ ] Sport switcher updates mockup image
- [ ] Cross-sport ordering works
- [ ] Filters work correctly
- [ ] Mobile layout functional
- [ ] Images load properly
- [ ] No console errors

---

### A.5: Admin Panel - Product & Design Management (Week 3-4)

**Goal**: Separate admin workflows for products vs designs

**Admin Pages**:

#### `/admin/products` - Product Catalog Management
```tsx
// One-time setup: Configure product types with prices
// Rarely changed after initial setup

export default function ProductsAdmin() {
  // List all products grouped by sport
  // Edit product prices
  // Edit product specs (fabric, sizes)
  // View compatible designs count
}
```

#### `/admin/designs` - Design Library Management
```tsx
// Continuous content creation: Add new designs

export default function DesignsAdmin() {
  // List all designs
  // Create new design
  // Upload mockups by sport+product
  // Mark designs as featured
  // Activate/deactivate designs
}
```

#### `/admin/designs/new` - Create Design Form
```tsx
export default function CreateDesign() {
  // Design info: name, description, tags
  // Upload mockups section:
  //   - Fútbol: Jersey (front, back), Shorts, Polera
  //   - Básquetbol: Jersey (front, back), Shorts
  //   - Vóleibol: Jersey (front, back)
  //   - Rugby: Jersey (front, back), Shorts
  // Can save with partial mockups (e.g., only soccer jersey)
  // Can come back later to add more sports
}
```

**Tasks**:
- [ ] Create `/admin/products/page.tsx`
- [ ] Create `/admin/designs/page.tsx`
- [ ] Create `/admin/designs/new/page.tsx`
- [ ] Create `/admin/designs/[id]/edit/page.tsx`
- [ ] Build product edit modal
- [ ] Build design mockup uploader (multi-sport, multi-product)
- [ ] Add image upload to Supabase Storage
- [ ] Add bulk design import (CSV with metadata)
- [ ] Add design preview before publishing
- [ ] Add admin permissions check

**Testing Checklist**:
- [ ] Can create product with price
- [ ] Can update product price
- [ ] Can create design with minimal info
- [ ] Can upload mockup for one sport
- [ ] Can add more sports later
- [ ] Images upload to storage correctly
- [ ] Design appears in catalog immediately
- [ ] Non-admin users cannot access

---

## **PHASE B: TEAM MANAGEMENT - COMPLETE DESIGN REQUEST & PAYMENT FLOW** 🔄 HIGHEST PRIORITY

**Reference Document**: `TEAM_PAGES_BUILD_PLAN.md` (continuing from Phase 2)

---

## **🎯 COMPLETE DESIGN REQUEST → ORDER → PAYMENT FLOW**

This section documents the **end-to-end flow** from design request to payment completion for team orders.

### **Flow Overview**

```
1. Team Member Creates Design Request (wizard)
   ↓
2. Admin Uploads Custom Mockup
   ↓
3. Manager Sets Design as "Final" (ready_for_voting)
   ↓
4. Team Members Vote (like/dislike)
   ↓
5. Manager Approves Design (approved)
   ↓ TRIGGERS ORDER CREATION
6. System Auto-Creates Order + Order Items (one per team member)
   ↓
7. Players View Orders, Opt-Out, Confirm Info, Pay Share
   ↓
8. Manager Tracks Payment Progress OR Pays Full Order
   ↓
9. Order Marked "Paid" When Fully Funded
```

---

### B.0: Team Payment Settings ⚙️

**Goal**: Configure team-wide payment preferences

**Database Addition**:
```sql
-- Add to team_settings table
ALTER TABLE team_settings ADD COLUMN IF NOT EXISTS
  payment_mode TEXT DEFAULT 'individual' CHECK (payment_mode IN ('individual', 'manager_pays_all'));
```

**UI Location**: `/mi-equipo/[slug]/settings`

**Payment Modes**:
- **`individual`** (default): Each team member pays their own share
- **`manager_pays_all`**: Manager pays for entire team order

**Behavior**:
- Manager can change this anytime in team settings
- Manager can also override this setting when approving a design (per-order basis)
- Setting applies to all future orders unless overridden

**Files**:
- `src/app/mi-equipo/[slug]/settings/page.tsx` (add payment_mode toggle)
- `src/components/team/PaymentSettingsCard.tsx` (new component)

**Tasks**:
- [ ] Add `payment_mode` column to `team_settings` table
- [ ] Create PaymentSettingsCard component
- [ ] Add to team settings page
- [ ] Show current mode with toggle switch
- [ ] Update team_settings on change
- [ ] Show explanation of each mode

**Testing Checklist**:
- [ ] Can toggle between modes
- [ ] Setting persists
- [ ] Only manager/owner can change
- [ ] Clear explanation shown

---

### B.1: Team Design Request Wizard 🎨

**Goal**: Replace simple text box with comprehensive multi-step design request wizard

**Context**: Based on existing `/personaliza` wizard, adapted for team context

**Route Structure**:
```
/mi-equipo/[slug]/design-request/
├── new              - Product selection
├── customize        - Color customization
├── details          - Uniform details (sleeve, neck, fit)
├── logos            - Logo placement
├── names            - Names/numbers preference
└── review           - Summary & submit
```

---

#### **B.1.1: Product Selection** (`/new`)

**Goal**: Browse products filtered by team sport OR request custom design

**Pre-filled from Team**:
- Team sport → Auto-filter product catalog to show only relevant products
- Example: Team sport = "futbol" → Only show football jerseys, shorts, socks, etc.

**UI Elements**:
- Product grid (filtered by team sport)
- Each product card shows:
  - Product image
  - Product name
  - Base price
  - Available design count
- "Browse Designs" button (links to catalog)
- OR "Request Custom Design" option (text description + image upload)

**Files**:
- `src/app/mi-equipo/[slug]/design-request/new/page.tsx`
- `src/components/team/ProductSelectionGrid.tsx`
- `src/components/team/CustomDesignRequestForm.tsx`

**Tasks**:
- [ ] Create route and page
- [ ] Fetch products filtered by team sport
- [ ] Display product grid
- [ ] Add custom design request option
- [ ] Navigate to `/customize` with product selection

**Testing Checklist**:
- [ ] Only shows products for team's sport
- [ ] Product selection persists to next step
- [ ] Custom design upload works
- [ ] Can browse existing catalog designs

---

#### **B.1.2: Color Customization** (`/customize`)

**Goal**: Customize design colors (can differ from team defaults)

**Pre-filled from Team**:
- Team colors from `team_settings` (primary, secondary, tertiary)
- BUT user can modify for this specific request

**Why Allow Changes**: Team may want to swap color order for specific design
- Example: Team default = Red/Blue/White
- This request = Blue/Red/White (swapped primary/secondary)

**UI Elements**:
- Color picker for each position (primary, secondary, tertiary)
- Live preview if available
- "Use Team Colors" reset button

**Files**:
- `src/app/mi-equipo/[slug]/design-request/customize/page.tsx`
- `src/components/team/ColorCustomizer.tsx`

**Tasks**:
- [ ] Create route and page
- [ ] Pre-fill with team colors
- [ ] Color picker component
- [ ] Allow customization
- [ ] Save to request state
- [ ] Navigate to `/details`

**Testing Checklist**:
- [ ] Pre-fills with team colors
- [ ] Can modify colors
- [ ] Colors persist to next step
- [ ] Live preview updates

---

#### **B.1.3: Uniform Details** (`/details`)

**Goal**: Select uniform specifications

**UI Elements** (same as `/personaliza/uniformes`):
- **Sleeve length**: Short or Long
- **Neck style**: Crew, V-neck, or Polo
- **Fit**: Athletic (tight) or Loose

**Files**:
- `src/app/mi-equipo/[slug]/design-request/details/page.tsx`
- Reuse: `src/hooks/useBuilderState.ts` (or create team-specific version)

**Tasks**:
- [ ] Create route and page
- [ ] Implement uniform selection UI
- [ ] Save selections
- [ ] Navigate to `/logos`

**Testing Checklist**:
- [ ] All options selectable
- [ ] Selections persist
- [ ] Team colors applied to UI

---

#### **B.1.4: Logo Placement** (`/logos`)

**Goal**: Select where team logo appears on uniform

**Pre-filled from Team**:
- Team logo URL from `team_settings.logo_url`

**UI Elements** (same as `/personaliza/logos`):
- Interactive jersey diagram (front/back views)
- Clickable placement zones:
  - Front chest
  - Upper back
  - Left sleeve
  - Right sleeve
- Multiple selections allowed

**Files**:
- `src/app/mi-equipo/[slug]/design-request/logos/page.tsx`
- `src/components/team/LogoPlacementSelector.tsx`

**Tasks**:
- [ ] Create route and page
- [ ] Pre-load team logo
- [ ] Interactive jersey diagram
- [ ] Multiple placement selection
- [ ] Navigate to `/names`

**Testing Checklist**:
- [ ] Team logo pre-loads
- [ ] Can select multiple placements
- [ ] Selections persist
- [ ] Visual feedback on selection

---

#### **B.1.5: Names & Numbers** (`/names`)

**Goal**: Choose whether to include player personalization

**UI Elements** (same as `/personaliza/nombres`):
- **Without names/numbers**: Just team logo and colors
- **With names/numbers**: Personalized per player (collected later)

**Note**: If "with names/numbers" selected, player info (name, number) will be collected later during order confirmation

**Files**:
- `src/app/mi-equipo/[slug]/design-request/names/page.tsx`

**Tasks**:
- [ ] Create route and page
- [ ] Toggle between with/without
- [ ] Show explanation
- [ ] Navigate to `/review`

**Testing Checklist**:
- [ ] Both options work
- [ ] Explanation clear
- [ ] Selection persists

---

#### **B.1.6: Review & Submit** (`/review`)

**Goal**: Review all selections and submit design request

**Summary Display**:
- Product selected
- Colors chosen
- Uniform details
- Logo placements
- Names/numbers preference

**Submission Action**:
```typescript
// Creates design_request record
const designRequest = {
  team_id: team.id,
  requested_by: currentUser.id,
  product_slug: selectedProduct.slug,
  sport_slug: team.sport,
  primary_color: customColors.primary,
  secondary_color: customColors.secondary,
  accent_color: customColors.accent,
  uniform_details: {
    sleeve: 'short',
    neck: 'crew',
    fit: 'athletic'
  },
  logo_url: team.logo_url,
  logo_placements: {
    front: true,
    back: false,
    sleeveLeft: true,
    sleeveRight: false
  },
  names_numbers: true,
  status: 'pending',  // Waiting for admin mockup
  order_id: null      // No order yet - created when approved
}
```

**Files**:
- `src/app/mi-equipo/[slug]/design-request/review/page.tsx`

**Tasks**:
- [ ] Create route and page
- [ ] Display summary
- [ ] Submit button
- [ ] Create design_request record
- [ ] Navigate back to `/mi-equipo/[slug]`
- [ ] Show success message

**Testing Checklist**:
- [ ] All selections shown
- [ ] Submit creates record
- [ ] Request appears in team dashboard
- [ ] Navigation works

---

### B.2: Admin Design Review & Mockup Upload (Admin Panel)

**Goal**: Admin customizes design based on request and uploads mockup

**Status**: Admin ONLY uploads mockup - does NOT change status

**Files**:
- `src/app/admin/design-requests/page.tsx`
- `src/app/admin/design-requests/[id]/page.tsx`

**Admin Actions**:
1. View pending design requests
2. See all specifications (colors, uniform details, logo placements)
3. Create custom mockup externally (Photoshop, Figma, etc.)
4. Upload mockup image
5. Status STAYS `pending`

**Important**: Admin does NOT set status to `ready_for_voting` - only Manager does this

**Tasks**:
- [ ] Create admin design requests list page
- [ ] Create individual request detail page
- [ ] Show all request specifications
- [ ] Image upload component
- [ ] Save mockup URL to design_request
- [ ] Notify team when mockup ready

**Testing Checklist**:
- [ ] Admin can view all requests
- [ ] Can upload mockup image
- [ ] Mockup appears in team view
- [ ] Status remains `pending`

---

### B.3: Manager Sets Design as Final & Voting

**Goal**: Manager reviews mockup and sets as final, team members vote

#### **B.3.1: Manager Sets as Final**

**Status Change**: `pending` → `ready_for_voting`

**UI Location**: `/mi-equipo/[slug]` (in design requests section)

**Manager Actions**:
1. Reviews admin mockup
2. Clicks "Set as Final" button
3. Confirms action
4. Status changes to `ready_for_voting`
5. Team members can now vote

**Files**:
- `src/app/mi-equipo/[slug]/page.tsx` (update design request card)
- `src/components/team/DesignRequestCard.tsx` (add "Set as Final" button)

**Tasks**:
- [ ] Add "Set as Final" button for managers
- [ ] Confirm modal
- [ ] Update status to `ready_for_voting`
- [ ] Show voting UI to team members

**Testing Checklist**:
- [ ] Only manager/owner can set as final
- [ ] Status updates correctly
- [ ] Voting UI appears for team members

---

#### **B.3.2: Team Member Voting**

**Goal**: All team members vote like/dislike on design

**UI Elements**:
- Design mockup display
- 👍 Like button
- 👎 Dislike button
- Vote count display
- Who has voted indicator

**Database**:
```sql
-- Add voting table
CREATE TABLE design_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_request_id UUID NOT NULL REFERENCES design_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(design_request_id, user_id)
);
```

**Files**:
- `src/components/team/DesignVotingCard.tsx`

**Tasks**:
- [ ] Create voting table migration
- [ ] Add like/dislike buttons
- [ ] Record votes
- [ ] Show vote counts
- [ ] Prevent duplicate votes (one vote per user)
- [ ] Show who has voted

**Testing Checklist**:
- [ ] Can vote like/dislike
- [ ] Vote persists
- [ ] Cannot vote twice
- [ ] Vote counts update
- [ ] Manager sees all votes

---

### B.4: Manager Approves Design (Triggers Order Creation) ✅ **COMPLETED**

**Status**: ✅ Fully implemented and tested

**Completed**: 2025-10-11

**Goal**: Manager approves final design, system automatically creates order

**Critical Flow**: This is when orders get created!

**Status Change**: `ready_for_voting` → `approved`

**What Was Built**:
- ✅ Design approval modal with payment mode selection
- ✅ API endpoint `/api/design-requests/[id]/approve`
- ✅ Automatic order creation with order_items for all team members
- ✅ Payment mode selection (individual vs manager_pays_all)
- ✅ Save as team default option
- ✅ Links design_request.order_id to new order
- ✅ Chilean Peso (CLP) formatting fixed (no division by 100)
- ✅ Mercado Pago payment amount fix (sends correct CLP amounts)
- ✅ RLS policies for orders, order_items, and payment_contributions
- ✅ Player payment view in `/mi-equipo/[slug]/payments`
- ✅ Manager payment controls
- ✅ Real-time payment progress display

**Bug Fixes**:
- ✅ Fixed `formatCLP()` - removed incorrect division by 100
- ✅ Fixed MercadoPago preference creation - removed incorrect division by 100
- ✅ Fixed generated columns (total_cents, line_total_cents) - removed from inserts
- ✅ Dropped broken database trigger `order_items_calculate_total`
- ✅ Added RLS policies allowing team members to view orders

**Files Modified**:
- `src/components/team/DesignApprovalModal.tsx` (created)
- `src/app/api/design-requests/[id]/approve/route.ts` (created)
- `src/app/mi-equipo/[slug]/page.tsx` (added approve button)
- `src/types/payments.ts` (fixed formatCLP function)
- `src/lib/mercadopago.ts` (fixed payment amounts)
- `src/app/mi-equipo/[slug]/payments/page.tsx` (player payment section)

#### **Manager Approval Flow**:

1. **Manager clicks "Approve Design"**
   - Reviews votes (optional - manager has final say)
   - Confirms approval

2. **System asks about payment mode** (can skip if already set in team settings)
   ```
   Modal: "How will this order be paid?"
   ○ Each player pays individually (use team default)
   ○ I will pay for the entire team
   □ Save as team default
   ```

3. **Status changes to `approved`**

4. **System automatically creates**:
   - 1 `order` record
   - Multiple `order_items` (one per every current team member)
   - Links `design_request.order_id` to new order

**Order Creation Logic**:
```typescript
// Triggered when manager approves
async function createOrderFromDesignRequest(designRequestId: string, paymentMode: string) {
  const designRequest = await getDesignRequest(designRequestId);
  const teamMembers = await getTeamMembers(designRequest.team_id);

  // 1. Create order
  const order = await createOrder({
    team_id: designRequest.team_id,
    user_id: designRequest.requested_by,
    customer_id: designRequest.requested_by,
    status: 'pending',
    payment_status: 'unpaid',
    payment_mode: paymentMode,  // NEW: 'individual' or 'manager_pays_all'
    total_amount_cents: calculateTotal(teamMembers.length, productPrice),
    notes: `Order from design request: ${designRequest.product_name}`
  });

  // 2. Create order_items for ALL team members
  for (const member of teamMembers) {
    await createOrderItem({
      order_id: order.id,
      user_id: member.user_id,
      product_id: designRequest.product_id,
      design_id: designRequest.design_id,
      quantity: 1,
      price_cents: productPrice,
      customization: {
        player_name: null,  // To be filled by player
        player_number: null,
        size: null,
        opted_out: false     // NEW: Tracks opt-out status
      }
    });
  }

  // 3. Link design request to order
  await updateDesignRequest(designRequestId, {
    status: 'approved',
    order_id: order.id
  });

  // 4. Notify all team members
  await notifyTeamMembers(designRequest.team_id, {
    message: "New order created! Please confirm your information and complete payment.",
    link: `/mi-equipo/${team.slug}/payments`
  });
}
```

**Files**:
- `src/app/mi-equipo/[slug]/page.tsx` (add "Approve Design" button)
- `src/components/team/DesignApprovalModal.tsx` (payment mode selection)
- `src/app/api/design-requests/[id]/approve/route.ts` (approval endpoint)

**Tasks**:
- [ ] Add "Approve Design" button for managers
- [ ] Create approval modal with payment mode selection
- [ ] Create API endpoint for approval
- [ ] Implement order creation logic
- [ ] Create order_items for all team members
- [ ] Link design_request to order
- [ ] Send notifications to team members
- [ ] Navigate to payments page

**Testing Checklist**:
- [x] Only manager/owner can approve
- [x] Payment mode selection modal appears
- [x] Order created successfully
- [x] Order_items created for all members
- [x] design_request.order_id set correctly
- [x] Status changes to approved
- [x] Players can view orders (RLS policies working)
- [x] Players see "Tu Pago" section with payment button
- [x] Payment amounts correct (40,000 CLP, not 800 CLP)
- [x] Mercado Pago receives correct amounts
- [ ] Team members notified (notification system not yet built)

---

### B.5: Player Order Confirmation & Opt-Out

**Goal**: Each player views their order item, confirms info, or opts out

**UI Location**: `/mi-equipo/[slug]/payments`

**Player View**:
```
Your Order Item: "Blue Thunder Jersey"

Status: ⏳ Awaiting Confirmation

[✓] I want this item
[ ] I want to opt out

Player Information:
├── Name: [input field]
├── Number: [input field]  (if names_numbers enabled)
├── Size: [dropdown: XS, S, M, L, XL, XXL]
└── [Save Information]

Payment:
└── [Pay My Share - $15,000 CLP]  (if payment_mode = 'individual')
```

#### **Opt-Out Flow**:

**When player clicks "I want to opt out"**:
1. Confirmation modal: "Are you sure? This cannot be undone."
2. If confirmed:
   - Delete `order_item` for this player
   - Recalculate `order.total_amount_cents`
   - Update payment split (if individual mode)
   - Notify manager

**Database Update**:
```sql
-- Add opt-out tracking to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;
```

**Files**:
- `src/app/mi-equipo/[slug]/payments/page.tsx` (update for player view)
- `src/components/team/PlayerOrderItemCard.tsx` (new component)
- `src/components/team/OptOutModal.tsx` (confirmation)
- `src/app/api/order-items/[id]/opt-out/route.ts` (opt-out endpoint)

**Tasks**:
- [ ] Add `opted_out` column to order_items
- [ ] Create PlayerOrderItemCard component
- [ ] Add opt-in/opt-out toggle
- [ ] Player info form (name, number, size)
- [ ] Save player info to order_item
- [ ] Implement opt-out API
- [ ] Recalculate order total on opt-out
- [ ] Show opt-out status to manager

**Testing Checklist**:
- [ ] Player can view their order item
- [ ] Can fill in information
- [ ] Information persists
- [ ] Can opt out
- [ ] Opt-out confirmation works
- [ ] Order total recalculates
- [ ] Manager notified of opt-out

---

### B.6: Payment Progress (Visible to ALL Team Members) 💰

**Goal**: ALL team members can see order payment progress, not just manager

**Critical Requirement**: This is transparent to the entire team

**UI Location**: `/mi-equipo/[slug]/payments`

**What Everyone Sees**:
```
Order #ABC123: Blue Thunder Jersey
Status: 🔄 In Progress

Payment Progress: $45,000 / $150,000 CLP (30%)
[▓▓▓▓▓▓░░░░░░░░░░░░] 30%

Team Members (10):
├── ✅ Juan Pérez - Paid $15,000
├── ✅ María García - Paid $15,000
├── ✅ Pedro López - Paid $15,000
├── ⏳ Ana Martínez - Pending
├── ⏳ Carlos Silva - Pending
├── ⏳ Laura Torres - Pending
├── ⏳ Diego Rojas - Pending
├── ⏳ Sofía Muñoz - Pending
├── ⏳ Andrés Castro - Pending
└── ❌ Camila Díaz - Opted Out

Payment Status:
├── Paid: 3 members ($45,000)
├── Pending: 6 members ($90,000)
├── Opted Out: 1 member
└── Total Remaining: $90,000
```

**Manager Actions** (additional buttons):
```
[📧 Remind Pending Players]
[💳 Pay Remaining Balance] (if payment_mode allows)
```

**Player Actions**:
```
[Pay My Share - $15,000 CLP]
```

**Files**:
- `src/components/team/OrderPaymentProgress.tsx` (new component)
- `src/components/team/PaymentMemberList.tsx` (shows all members and status)

**Tasks**:
- [ ] Create OrderPaymentProgress component
- [ ] Show payment bar (paid vs pending)
- [ ] List all team members with payment status
- [ ] Show who has paid, who hasn't
- [ ] Show opted-out members
- [ ] Real-time updates (via Supabase subscriptions)
- [ ] Manager reminder button
- [ ] Individual payment buttons

**Testing Checklist**:
- [ ] All team members can view progress
- [ ] Payment progress accurate
- [ ] Member list shows correct statuses
- [ ] Updates in real-time
- [ ] Manager can send reminders
- [ ] Players can pay their share

---

### B.7: Individual vs Manager-Pays-All Payment Modes

#### **Mode 1: Individual Payments** (`payment_mode: 'individual'`)

**Behavior**:
- Each team member pays their own share
- Payment button appears for each player
- Order marked "paid" when: `SUM(contributions.approved) >= order.total_amount_cents`

**UI** (player view):
```
Your Share: $15,000 CLP
[Pay My Share]
```

**UI** (manager view):
```
Track individual payments
├── 3 of 9 members paid
└── $90,000 remaining
[Send Payment Reminder]
```

---

#### **Mode 2: Manager Pays All** (`payment_mode: 'manager_pays_all'`)

**Behavior**:
- Manager pays entire order amount
- Individual payment buttons hidden
- Single "Pay Full Order" button for manager

**UI** (player view):
```
Your item is included in manager payment
Status: ⏳ Waiting for manager to complete payment
```

**UI** (manager view):
```
Total Order: $150,000 CLP
[Pay Full Order] (manager only)
```

---

#### **Hybrid Mode** (allows both):

**Note**: Even in "individual" mode, manager can still pay full remaining balance

**UI** (manager view in individual mode):
```
Individual Payment Progress: $45,000 / $150,000

Members paid: 3 of 9
Remaining: $105,000

Manager Actions:
[Send Payment Reminder to 6 pending members]
[Pay Remaining $105,000] (manager can cover the rest)
```

**Files**:
- `src/components/team/PaymentModeControls.tsx`
- `src/app/api/orders/[id]/pay-full/route.ts`
- `src/app/api/orders/[id]/pay-share/route.ts`

**Tasks**:
- [ ] Check payment_mode on order
- [ ] Show appropriate payment buttons
- [ ] Individual payment flow
- [ ] Manager pay-all flow
- [ ] Manager pay-remaining flow (hybrid)
- [ ] Update order status when fully paid

**Testing Checklist**:
- [ ] Individual mode shows player buttons
- [ ] Manager-pays-all hides player buttons
- [ ] Manager can pay remaining balance
- [ ] Order status updates correctly
- [ ] Payment contributions recorded

---

### B.8: Roster Management & Player Info

**Goal**: Manager and players manage roster information

#### **B.8.1: Roster View** (`/mi-equipo/[slug]/roster`)

**Goal**: View all team members and their information

**Visible to**: ALL team members (read-only for non-managers)

**UI Elements**:
- Table/grid of all team members
- Columns: Name, Number, Position, Size, Status
- Filter by: All, Active, Opted Out, Pending Info
- Search bar

**Files**:
- `src/app/mi-equipo/[slug]/roster/page.tsx`
- `src/components/team/RosterTable.tsx`

**Tasks**:
- [ ] Create roster page route
- [ ] Fetch all team members
- [ ] Display in table format
- [ ] Add filters and search
- [ ] Show completion status
- [ ] Link to player detail

**Testing Checklist**:
- [ ] All team members visible
- [ ] Filters work
- [ ] Search works
- [ ] Data accurate

---

#### **B.8.2: Player Self-Service** (`/mi-equipo/[slug]/my-info`)

**Goal**: Player edits their own information

**UI Elements**:
- Profile form
- Name, number, position
- Jersey size
- Contact info
- Emergency contact
- Save button

**Files**:
- `src/app/mi-equipo/[slug]/my-info/page.tsx`
- `src/components/team/PlayerInfoEditForm.tsx`

**Tasks**:
- [ ] Create my-info page route
- [ ] Fetch current user's player info
- [ ] Editable form
- [ ] Save to player_info_submissions
- [ ] Show success confirmation

**Testing Checklist**:
- [ ] Player can view their info
- [ ] Can edit all fields
- [ ] Changes persist
- [ ] Updates visible in roster

---

### B.9: Payment API Integration

**Goal**: Connect payment buttons to Mercado Pago

**API Endpoints** (already exist, need wiring):
- `POST /api/mercadopago/create-split-payment` - Individual share payment
- `POST /api/mercadopago/webhook` - Payment status updates

**Payment Flow**:
```
1. Player clicks "Pay My Share"
2. Call API: createSplitPayment(orderId, userId, amountCents)
3. API creates payment_contribution record
4. API generates Mercado Pago preference
5. Redirect player to MP checkout (initPoint)
6. Player completes payment on MP
7. MP sends webhook to /api/mercadopago/webhook
8. Webhook validates signature
9. Webhook updates payment_contribution status
10. System checks if order fully paid
11. If yes: order.payment_status = 'paid'
12. Real-time UI update via Supabase subscription
```

**Files**:
- All payment components (button click handlers)
- `src/app/api/mercadopago/create-split-payment/route.ts` (exists)
- `src/app/api/mercadopago/webhook/route.ts` (exists)

**Tasks**:
- [ ] Wire "Pay My Share" button to API
- [ ] Wire "Pay Full Order" button to API
- [ ] Handle redirect to Mercado Pago
- [ ] Implement real-time status updates
- [ ] Show payment confirmation
- [ ] Handle payment failures

**Testing Checklist**:
- [ ] Payment button redirects to MP
- [ ] Webhook receives payment status
- [ ] Status updates in real-time
- [ ] Order marked paid when fully funded
- [ ] Payment history accurate

---

## **B.10: End-to-End Testing**

**Critical User Paths**:

### **Path 1: Complete Team Order Flow**
1. Team member creates design request (wizard)
2. Admin uploads mockup
3. Manager sets as final
4. Team members vote
5. Manager approves
6. Order auto-created for all members
7. Players confirm info
8. Players pay individually
9. Order marked paid
10. Admin processes order

### **Path 2: Manager-Pays-All Flow**
1. Same steps 1-6 as Path 1
2. Manager selects "manager_pays_all" mode
3. Manager pays full order
4. Players see "paid by manager" status
5. Admin processes order

### **Path 3: Player Opt-Out Flow**
1. Same steps 1-6 as Path 1
2. Player opts out
3. Order total recalculates
4. Other players pay
5. Order marked paid
6. Admin processes order (minus opted-out player)

**Testing Checklist**:
- [ ] All three paths complete successfully
- [ ] No errors in console
- [ ] Data integrity maintained
- [ ] Real-time updates work
- [ ] Notifications sent correctly
- [ ] Payment processing reliable

---

## **PHASE C: PAYMENT SYSTEM FINALIZATION** 💳 MEDIUM PRIORITY

**Status**: 90% complete, needs simplification and wiring to frontend

### 🎯 PAYMENT ARCHITECTURE PRINCIPLE

**KEEP IT SIMPLE**: Every payment to Mercado Pago is just a one-time payment. We handle ALL complexity internally.

**From Payment Processor Perspective**:
- Every checkout = Simple payment of $X CLP
- No splits, no bulk complexity on their end
- Just: "Process this payment amount"

**From Deserve Internal Perspective**:
- Use `payment_contributions` table for ALL payments
- Whether manager pays full order OR player pays their share = both are just contributions
- Order is "paid" when: `SUM(contributions.amount_cents WHERE status='approved') >= order.total_amount_cents`

**Simplified Flow**:
```
Manager clicks "Pay Full Order ($50,000)":
  → Create payment_contribution(user_id=manager, amount_cents=50000, order_id=X)
  → Create MP preference for $50,000
  → Redirect to MP checkout
  → Webhook marks contribution as "approved"
  → Order status becomes "paid"

Player clicks "Pay My Share ($5,000)":
  → Create payment_contribution(user_id=player, amount_cents=5000, order_id=X)
  → Create MP preference for $5,000
  → Redirect to MP checkout
  → Webhook marks contribution as "approved"
  → Order checks if fully paid, updates status if yes
```

**Benefits**:
- Single table handles all payment types
- No junction tables needed
- Simple webhook logic
- Easy to query: "Show all my payments"
- Flexible: Any user can contribute any amount

**Implementation Notes**:
- Remove `bulk_payments` table (unnecessary complexity)
- Remove `bulk_payment_orders` junction table
- Keep `payment_contributions` as single source of truth
- Add `payment_type` field: 'full' | 'split' | 'partial' (for analytics only)

### C.1: Payment Environment Variables

**Required**:
- [ ] `MERCADOPAGO_ACCESS_TOKEN` - Production token
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` - For signature verification
- [ ] `NEXT_PUBLIC_BASE_URL` - For redirect URLs

**Tasks**:
- [ ] Set up production Mercado Pago account
- [ ] Generate access token
- [ ] Generate webhook secret
- [ ] Add to `.env.local` and Vercel

---

### C.2: Payment Redirect Pages

**Status**: Pages referenced in code but may need creation

**Pages**:
- `/payments/success?contribution_id=X`
- `/payments/failure?contribution_id=X`
- `/payments/pending?contribution_id=X`

**Tasks**:
- [ ] Create success page
- [ ] Create failure page
- [ ] Create pending page
- [ ] Fetch contribution status
- [ ] Show next steps
- [ ] Link back to team dashboard

---

### C.3: Wire Payment Buttons in Team Dashboard

**Goal**: Connect payment UI to API endpoints

**Locations**:
- Team dashboard: "Pay My Share" button
- Team dashboard: "Pay For Entire Team" button (managers only)

**API Endpoints** (ALREADY EXIST):
- `POST /api/payments/create-payment` (split payment)
- `POST /api/mercadopago/webhook` (webhook handler)

**Tasks**:
- [ ] Add "Pay My Share" button to team dashboard
- [ ] Add "Pay For Team" button (manager-only)
- [ ] Call create-payment API
- [ ] Redirect to Mercado Pago init_point
- [ ] Handle payment status updates
- [ ] Show payment confirmation

**Testing Checklist**:
- [ ] Split payment button appears
- [ ] Redirects to MP checkout
- [ ] Webhook updates status
- [ ] Success page shows confirmation
- [ ] Payment appears in dashboard

---

## **PHASE D: SPORTS UNIFICATION FOLLOW-UP** ⚙️ LOW PRIORITY

**Status**: Foundation complete, cleanup remaining

### D.1: Verify sport_id Usage Across App

**Goal**: Ensure ALL sport references use sport_id FK, not slugs

**Files to Audit**:
- [ ] All API endpoints using sport parameters
- [ ] All components displaying sports
- [ ] All database queries filtering by sport
- [ ] Design requests creation flow
- [ ] Order creation flow

**Tasks**:
- [ ] Search codebase for `sport_slug` references
- [ ] Replace with `sport_id` where found
- [ ] Update TypeScript types
- [ ] Test all sport-related features

---

### D.2: Add More Sports (Future Expansion)

**When Ready**:
```sql
INSERT INTO sports (slug, name) VALUES
  ('hockey', 'Hockey'),
  ('tenis', 'Tenis'),
  ('handball', 'Handball'),
  ('beisbol', 'Béisbol');
```

**Tasks**:
- [ ] Add sport icons to homepage
- [ ] Create products for new sports
- [ ] Add designs with mockups

---

## 📅 TIMELINE & MILESTONES

### Week 1-2: Design/Product Architecture Foundation
- [ ] Database migration (A.1)
- [ ] Data backfill (A.2)
- [ ] API endpoints (A.3)

### Week 3: Frontend Catalog Rebuild
- [ ] Product-first navigation pages (A.4)
- [ ] Design detail with sport switcher
- [ ] Mobile responsive

### Week 4: Admin Panel & Team Management
- [ ] Admin product/design management (A.5)
- [ ] Player info management (B.1, B.2)
- [ ] Unified member management (B.3)

### Week 5: Payments & Polish
- [ ] Team payment dashboard (B.4, B.5)
- [ ] Payment button wiring (C.3)
- [ ] Testing & bug fixes

### Week 6: Testing & Launch
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Production deployment

---

## 🧪 TESTING STRATEGY

### Critical User Paths

**Path 1: Small Team Flow**
1. Manager creates team
2. Manager browses catalog (new product-first flow)
3. Manager selects design
4. Manager collects player info via link
5. Players submit info anonymously
6. Players pay individual shares
7. Manager approves design
8. Order placed

**Path 2: Institution Flow**
1. Athletic Director creates organization
2. Creates multiple teams across sports
3. Browses designs across all sports
4. Sees same design on soccer and basketball
5. Orders both with bulk payment
6. Tracks all team orders in one view

**Path 3: Admin Content Management**
1. Admin configures products (one-time)
2. Admin creates new design
3. Uploads soccer jersey mockup
4. Design appears in soccer catalog
5. Later: adds basketball mockup
6. Design now appears in basketball catalog

---

## 🚨 CRITICAL SUCCESS FACTORS

1. **Data Integrity**: Zero data loss during design/product migration
2. **Backward Compatibility**: Existing orders continue to work
3. **Performance**: Catalog pages load <2s
4. **Admin Efficiency**: Design upload workflow <5 minutes
5. **User Clarity**: Product-first navigation is intuitive
6. **Payment Reliability**: 99%+ success rate on Mercado Pago

---

## 📊 SUCCESS METRICS

### Technical Metrics
- [ ] All 70+ migrations run successfully
- [ ] Zero orphaned records after design/product migration
- [ ] API response times <200ms (95th percentile)
- [ ] Zero RLS policy violations

### Business Metrics
- [ ] 100+ designs in catalog within first month
- [ ] Designs available on average 3+ sports each
- [ ] 50% reduction in admin time to add new design
- [ ] <1% error rate on payments
- [ ] 90%+ user satisfaction

### User Experience Metrics
- [ ] Users understand product-first navigation (90%+ task completion)
- [ ] Cross-sport design discovery works (measured via analytics)
- [ ] Team managers complete player collection in <10 minutes
- [ ] Payment completion rate >80%

---

## 🎯 CURRENT SPRINT FOCUS

### Sprint 1 (Oct 11-18): Design/Product Architecture
**Priority**: Database migration and API foundation

**This Week's Goals**:
1. Create migration 069 (design/product schema)
2. Test migration thoroughly
3. Begin data backfill script
4. Draft API endpoint specs

**Blockers**: None

**Daily Standup Focus**:
- Migration testing results
- Data mapping decisions
- API design reviews

---

## 🔧 TECHNICAL DEBT & CLEANUP

### Identified Issues
- [ ] Multiple test/broken migrations in `/supabase/migrations/` (046 has 5 versions)
- [ ] Consolidate duplicate migration files
- [ ] Remove unused code from old catalog system
- [ ] Update TypeScript types for new schema
- [ ] Add comprehensive JSDoc comments

### Future Optimizations
- [ ] Add Redis caching for catalog queries
- [ ] Implement CDN for design mockup images
- [ ] Add database read replicas for scaling
- [ ] Optimize image loading (lazy load, WebP format)

---

## 📝 NOTES & DECISIONS LOG

### 2025-10-11: Product-First Architecture Decision
**Decision**: Users browse product types FIRST, then designs (not designs first)

**Rationale**:
- Clearer user intent (know they want jersey)
- Predictable pricing (product price shown upfront)
- Natural shopping flow (physical → visual customization)
- Admin efficiency (products set once, designs continuous)

**Impact**: Requires catalog page rebuild, but cleaner UX

---

### 2025-10-11: Sports Unification Complete
**Completed**: Unified sports across app using sport_id FKs

**Result**:
- 4 canonical sports (futbol, basquetbol, voleibol, rugby)
- All teams use sport_id
- Team creation dropdown works
- Foundation solid for design/product architecture

---

## 🏁 LAUNCH READINESS CHECKLIST

### Pre-Production
- [ ] All migrations tested in staging
- [ ] Design/product backfill verified
- [ ] Payment flow end-to-end tested
- [ ] RLS policies audited
- [ ] Performance testing complete
- [ ] Mobile responsive confirmed

### Production Deployment
- [ ] Environment variables configured
- [ ] Database backups confirmed
- [ ] Mercado Pago webhooks registered
- [ ] CDN configured for images
- [ ] Error monitoring enabled (Sentry)
- [ ] Analytics configured

### Post-Launch
- [ ] Monitor error rates
- [ ] Track payment success rates
- [ ] Gather user feedback
- [ ] Iterate on UX based on analytics
- [ ] Add designs to catalog (10+ per week target)

---

## 🎉 VISION: DESERVE ATHLETICS AT LAUNCH

**Homepage**: User selects sport → sees product types (Camisetas, Shorts, Poleras)

**Product Catalog**: Clean grid of product types with prices and design counts

**Design Browser**: Beautiful gallery of designs on selected product type

**Design Detail**: Seamless sport switching, can order soccer design on basketball jersey

**Team Dashboard**: Unified view of members (roster + app users), payment tracking, progress milestones

**Admin Panel**: Efficient design upload workflow, products configured once, designs added continuously

**Payment Flow**: Reliable split payments, bulk payments, real-time status updates

**Result**: World-class uniform ordering experience. Small teams get professional service. Large institutions get scalable management. Deserve Athletics delivers efficiency and effectiveness.

---

## 🎯 NEXT STEPS (Updated Oct 11, 2025)

### Immediate Priorities (This Week)

**Option 1: Complete Payment Flow (B.5 - B.7)** ⚡ RECOMMENDED
Focus on finishing the player payment experience:
- B.5: Player Order Confirmation & Opt-Out (add player info form, opt-out button)
- B.6: Payment Progress Dashboard (already mostly built, enhance with real-time updates)
- B.7: Wire remaining payment buttons (manager pay-all, manager pay-remaining)

**Why this first**: Payment flow is 95% done, just needs final polish. Get full feature to production.

**Option 2: Design vs Product Architecture (A.1 - A.5)**
Start the architectural refactor to separate designs from products.

**Why this could wait**: Existing system works, this is an optimization for scalability.

### Recommendation

**🚀 Complete Payment Flow First** - Then tackle Design/Product Architecture next sprint.

**Next Action**: Begin B.5 - Player Order Confirmation & Opt-Out

**Owner**: Chief Engineer (Claude)
**Review Date**: 2025-10-18
**Status**: 🚀 Active Development - Payment Integration Phase
