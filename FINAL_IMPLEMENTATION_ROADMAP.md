# Final Implementation Roadmap - Design Management System

**Date:** 2025-10-11
**Status:** ✅ Ready to Build
**All Clarifications Received**

---

## 🎯 FINALIZED ARCHITECTURE

### Two Separate Design Systems

#### **System A: Deserve Design Library** (NEW - What We're Building)
```
Purpose: Pre-made design templates in catalog
Flow:
  1. Admin creates design in admin portal
  2. Admin uploads mockups for multiple sports/products
  3. Design appears in public catalog automatically
  4. Users browse catalog → customize template → order

Availability: Auto-detect from mockups
  - Design has soccer jersey mockup → Shows in soccer jersey catalog
  - Design has basketball jersey + shorts mockups → Shows in basketball catalog
```

#### **System B: Custom Design Requests** (EXISTS - Enhance)
```
Purpose: User-specific custom modifications
Flow:
  1. User (with or without team) browses catalog
  2. User likes a design concept → requests customization
  3. Creates design request → Goes to admin portal
  4. Admin creates custom mockup OUTSIDE app (Photoshop, etc.)
  5. Admin uploads custom mockup via admin portal
  6. User sees custom mockup in their profile
  7. User orders custom design

Key: ANY user can request (no team required)
```

---

## 📊 DATA ARCHITECTURE

### Simplified Tables (No Products Table!)

```sql
-- Product Types (Global Pricing)
product_types:
  - id, slug, display_name, category, price_cents
  - Examples:
    - Soccer Jersey → $50
    - Basketball Jersey → $60
    - Soccer Shorts → $30

-- Designs (Templates)
designs:
  - id, slug, name, description, designer_name
  - style_tags, color_scheme
  - is_customizable, allows_recoloring, featured, active

-- Design Mockups (Sport + Product Specific)
design_mockups:
  - id, design_id, sport_id, product_type_slug
  - mockup_url, view_angle, is_primary, sort_order

-- Availability is automatic:
  - If design has mockup for (soccer, jersey) → Shows in soccer jersey catalog
  - No junction table needed!
```

### Catalog Query Example:
```sql
-- Get all soccer jersey designs
SELECT designs.*
FROM designs
JOIN design_mockups ON design_mockups.design_id = designs.id
WHERE design_mockups.sport_id = 1  -- Soccer
  AND design_mockups.product_type_slug = 'jersey'
  AND designs.active = true
```

---

## 🎨 CATALOG PAGE UX

### Layout: Netflix-Style Horizontal Rows

```
┌────────────────────────────────────────────────────────┐
│  SOCCER CATALOG                                        │
├────────────────────────────────────────────────────────┤
│  JERSEYS                            [See More →]       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │ D1 │ │ D2 │ │ D3 │ │ D4 │ │ D5 │  (5 on desktop) │
│  └────┘ └────┘ └────┘ └────┘ └────┘                 │
├────────────────────────────────────────────────────────┤
│  HOODIES                            [See More →]       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │ D6 │ │ D7 │ │ D8 │ │ D9 │ │D10 │                 │
│  └────┘ └────┘ └────┘ └────┘ └────┘                 │
├────────────────────────────────────────────────────────┤
│  SHORTS                             [See More →]       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │D11 │ │D12 │ │D13 │ │D14 │ │D15 │                 │
│  └────┘ └────┘ └────┘ └────┘ └────┘                 │
└────────────────────────────────────────────────────────┘

Mobile: 2-3 designs per row (responsive)
```

**Interactions:**
- Click design card → Design detail page → Customize button
- Click "See More" → Full grid page for that product type
- Click row title → Same as "See More"
- Horizontal scroll within each row (touch-friendly)

---

## 🔧 ADMIN FEATURES TO BUILD

### Phase 1A: Core Design Management (Days 1-3) - START HERE

#### 1. Designs List (`/admin/designs`)
**Features (Mirror ProductsGrid):**
- Search: Name, slug, tags, colors
- Filters: Status, Featured, Style tags, Available sports
- Sort: Newest, Name A-Z/Z-A, Featured first
- View modes: Grid (5-6 columns), List (compact)
- Bulk operations: Delete, Toggle featured, Export CSV
- Quick stats: Total, Active, Featured, Per-sport count
- Keyboard shortcuts: Cmd+F, Cmd+A, Esc

**Display Per Design:**
- Thumbnail (primary mockup of first sport)
- Name
- Status badge (Active/Draft)
- Featured star
- Sport icons (⚽ 🏀 🏐 if has mockups)
- Product type count
- Edit, Duplicate, Delete buttons

#### 2. Create Design (`/admin/designs/new`)
**Form Sections:**

**Basic Info:**
- Name (required, auto-generates slug)
- Slug (editable)
- Description (textarea)
- Designer Name (optional)

**Classification:**
- Style Tags (multi-select chips):
  - Modern, Classic, Geometric, Dynamic, Minimal, Bold, Retro, Abstract, Striped, Solid, Gradient, etc.
- Color Scheme (color picker + hex input):
  - Primary, Secondary, Accent (multiple colors)

**Settings:**
- Is Customizable (checkbox) - Default: true
- Allows Recoloring (checkbox) - Default: true
- Featured (checkbox) - Highlight in catalog
- Active (checkbox) - Visible to users

**Mockup Upload (Critical Section):**
```
Upload Mockups for This Design:

┌─────────────────────────────────────────────┐
│  Drag & Drop Images or Click to Browse     │
│                                             │
│  You can upload multiple images at once    │
└─────────────────────────────────────────────┘

After upload, tag each image:

Image 1: [lightning-strike-soccer.png]
  Sport: [Soccer ▼]  Product Type: [Jersey ▼]  View: [Front ▼]
  [Set as Primary] [Delete]

Image 2: [lightning-strike-basketball.png]
  Sport: [Basketball ▼]  Product Type: [Jersey ▼]  View: [Front ▼]
  [Set as Primary] [Delete]

[+ Upload More Images]

✓ Design will be available in:
  - Soccer Jerseys
  - Basketball Jerseys
```

**Validation:**
- Name required
- Slug unique
- At least one mockup before publishing as Active
- At least one style tag
- At least one color

**Submit Button:**
- "Create Design" (if form valid)
- "Save as Draft" (always available)

#### 3. Edit Design (`/admin/designs/[id]/edit`)
**Same form as create, pre-filled**

**Additional Features:**
- View all existing mockups
- Add more mockups
- Delete mockups (confirm if only one)
- Change primary mockup per sport+product combo
- Reorder mockups

---

### Phase 1B: Bulk Upload Wizard (Days 4-5)

#### Bulk Upload Flow

**Step 1: Upload Images**
```
Bulk Upload Designs

Scenario 1: Multiple Different Designs
┌────────────────────────────────────────┐
│  Drag & Drop 50+ Images                │
│                                        │
│  [Browse Files]                        │
└────────────────────────────────────────┘

Are these:
( ) Different designs (each image = new design)
( ) Same design (all images = one design, different sports/products)
```

**If "Different designs" selected:**
```
Step 2: Tag All Images for Sport & Product

All images are for:
Sport: [Soccer ▼]
Product Type: [Jersey ▼]
View Angle: [Front ▼]

Or tag individually:
┌──────────────────────────────────────────────┐
│ Image 1: lightning-strike.png               │
│   Name: [Lightning Strike     ]  ✏️         │
│   Sport: [Soccer ▼] Product: [Jersey ▼]    │
│   View: [Front ▼]                           │
├──────────────────────────────────────────────┤
│ Image 2: blue-thunder.png                   │
│   Name: [Blue Thunder        ]  ✏️         │
│   Sport: [Soccer ▼] Product: [Jersey ▼]    │
│   View: [Front ▼]                           │
├──────────────────────────────────────────────┤
│ ... (50 more)                               │
└──────────────────────────────────────────────┘

[Apply to All] [Review & Create 50 Designs]
```

**If "Same design" selected:**
```
Step 2: Name the Design
Design Name: [Lightning Strike]

Step 3: Tag Each Image
┌──────────────────────────────────────────────┐
│ Image 1: soccer-front.png                   │
│   Sport: [Soccer ▼] Product: [Jersey ▼]    │
│   View: [Front ▼] [Primary ✓]              │
├──────────────────────────────────────────────┤
│ Image 2: soccer-back.png                    │
│   Sport: [Soccer ▼] Product: [Jersey ▼]    │
│   View: [Back ▼]                            │
├──────────────────────────────────────────────┤
│ Image 3: basketball-front.png               │
│   Sport: [Basketball ▼] Product: [Jersey ▼]│
│   View: [Front ▼] [Primary ✓]              │
└──────────────────────────────────────────────┘

[Review & Create Design]
```

---

### Phase 2: Frontend Catalog (Days 6-8)

#### 1. Sport Catalog Page (`/catalog/[sport]`)

**API Endpoint:**
```typescript
GET /api/catalog/[sport]/product-types-with-designs

Response:
{
  sport: { id, slug, name },
  product_types: [
    {
      product_type: { slug: "jersey", display_name: "Jerseys", price_cents: 5000 },
      designs: [
        { id, slug, name, primary_mockup_url, style_tags },
        { id, slug, name, primary_mockup_url, style_tags },
        ... (5 for preview)
      ],
      total_count: 47
    },
    {
      product_type: { slug: "hoodie", display_name: "Hoodies", price_cents: 8000 },
      designs: [...],
      total_count: 23
    }
  ]
}
```

**Component:**
```tsx
<SportCatalog sport="soccer">
  <ProductTypeRow
    productType="Jerseys"
    designs={first5JerseyDesigns}
    totalCount={47}
    onSeeMore={() => router.push('/catalog/soccer/jersey')}
  />
  <ProductTypeRow
    productType="Hoodies"
    designs={first5HoodieDesigns}
    totalCount={23}
  />
  <ProductTypeRow
    productType="Shorts"
    designs={first5ShortsDesigns}
    totalCount={18}
  />
</SportCatalog>
```

#### 2. Design Grid Page (`/catalog/[sport]/[product_type]`)

**Full grid of all designs for that sport+product:**
```
SOCCER JERSEYS (47 designs)

[Search] [Filter by: Style Tags, Colors] [Sort: Featured, Newest, A-Z]

┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ D1 │ │ D2 │ │ D3 │ │ D4 │ │ D5 │ │ D6 │
└────┘ └────┘ └────┘ └────┘ └────┘ └────┘
(Grid: 4-6 columns depending on screen size)
```

#### 3. Design Detail Page (`/designs/[slug]`)

**Already built in Phase A!** Shows:
- Design name, description
- All mockups across all sports (tabbed by sport)
- Style tags, color scheme
- Price (from product_type)
- "Customize This Design" button → `/personaliza` with design selected

---

### Phase 3: Integration & Polish (Days 9-10)

#### 1. Enhance Custom Design Request Admin Flow

**Current:** `/admin/design-requests`

**Add:**
- Filter by: Team vs Individual user requests
- Show: User has team? (Yes/No indicator)
- Display: User profile link (for individual users)
- Enhanced mockup upload with sport/product tagging

#### 2. Analytics Dashboard

**Add to `/admin/analytics`:**
- Most popular designs (by order count)
- Designs by sport distribution
- Product type popularity
- Customization rate (% of orders with custom requests)

#### 3. Product Type Price Management

**Create:** `/admin/product-types`

**Features:**
- List all product types
- Edit price (updates globally)
- Cost tracking (for profit margin calculations)
- Price history (audit log)

---

## 🗂️ FILE STRUCTURE

```
src/
├── app/
│   ├── admin/
│   │   ├── designs/
│   │   │   ├── page.tsx                 # List all designs
│   │   │   ├── DesignsGrid.tsx          # Main grid component
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Create design
│   │   │   ├── bulk/
│   │   │   │   └── page.tsx             # Bulk upload wizard
│   │   │   └── [id]/
│   │   │       ├── edit/
│   │   │       │   └── page.tsx         # Edit design
│   │   │       └── mockups/
│   │   │           └── page.tsx         # Manage mockups
│   │   └── product-types/
│   │       └── page.tsx                 # Manage pricing
│   │
│   ├── catalog/
│   │   ├── [sport]/
│   │   │   ├── page.tsx                 # Sport catalog (rows)
│   │   │   └── [product_type]/
│   │   │       └── page.tsx             # Full design grid
│   │   └── page.tsx                     # All sports selector
│   │
│   └── api/
│       ├── admin/
│       │   ├── designs/
│       │   │   ├── route.ts             # GET (list), POST (create)
│       │   │   ├── [id]/
│       │   │   │   ├── route.ts         # GET, PATCH, DELETE
│       │   │   │   └── mockups/
│       │   │   │       └── route.ts     # POST (upload mockup)
│       │   │   └── bulk/
│       │   │       └── route.ts         # POST (bulk create)
│       │   └── product-types/
│       │       └── route.ts             # GET (list), PATCH (update price)
│       │
│       └── catalog/
│           └── [sport]/
│               ├── product-types-with-designs/
│               │   └── route.ts         # GET (for homepage rows)
│               └── [product_type]/
│                   └── designs/
│                       └── route.ts     # GET (full grid)
│
├── components/
│   ├── admin/
│   │   ├── designs/
│   │   │   ├── DesignCard.tsx
│   │   │   ├── DesignForm.tsx
│   │   │   ├── DesignMockupUploader.tsx
│   │   │   ├── DesignFilters.tsx
│   │   │   ├── DesignBulkActions.tsx
│   │   │   ├── DesignStats.tsx
│   │   │   └── BulkUploadWizard.tsx
│   │   └── product-types/
│   │       └── ProductTypePriceEditor.tsx
│   │
│   └── catalog/
│       ├── SportSelector.tsx
│       ├── ProductTypeRow.tsx           # Horizontal scrolling row
│       ├── DesignGrid.tsx               # Full grid view
│       └── DesignCard.tsx               # Public design card
│
└── hooks/
    ├── useDesigns.ts                    # Admin designs data fetching
    └── useCatalog.ts                    # Public catalog data fetching
```

---

## 🚀 IMPLEMENTATION PRIORITY

### **START NOW: Phase 1A (Days 1-3)**
**Priority: CRITICAL**

1. ✅ Create `/admin/designs` route with DesignsGrid component
2. ✅ Create `/admin/designs/new` with DesignForm
3. ✅ Create `/admin/designs/[id]/edit`
4. ✅ Build API routes: GET, POST, PATCH, DELETE for designs
5. ✅ Build mockup upload component with sport/product tagging
6. ✅ Add "Designs" link to AdminNav
7. ✅ Add "Design Library" card to admin overview

**Deliverable:** Admin can create, edit, view, delete designs with mockups

---

### **Next: Phase 1B (Days 4-5)**
**Priority: HIGH**

1. Create bulk upload wizard
2. Build bulk processing API
3. Test with 50+ images

**Deliverable:** Admin can bulk upload designs efficiently

---

### **Then: Phase 2 (Days 6-8)**
**Priority: HIGH**

1. Build sport catalog page with horizontal rows
2. Build full design grid page
3. Integrate with existing `/personaliza` flow

**Deliverable:** Users can browse and select designs

---

### **Finally: Phase 3 (Days 9-10)**
**Priority: MEDIUM**

1. Enhance design request admin flow
2. Add analytics
3. Build product type price management

**Deliverable:** Complete system with analytics

---

## 🧪 TESTING CHECKLIST

### Phase 1A Tests:
- [ ] Create design with multiple mockups (different sports)
- [ ] Edit design, add more mockups
- [ ] Delete design (verify cascade to mockups)
- [ ] Search designs by name, tags, colors
- [ ] Filter by sport availability
- [ ] Bulk operations (select all, delete)
- [ ] View modes (grid/list) persistence

### Phase 1B Tests:
- [ ] Bulk upload 50 different designs
- [ ] Bulk upload 8 images for same design
- [ ] Verify all images uploaded to Supabase Storage
- [ ] Verify all designs created correctly

### Phase 2 Tests:
- [ ] Browse soccer catalog, see all product type rows
- [ ] Horizontal scroll within row (touch device)
- [ ] Click "See More" → full grid
- [ ] Click design card → detail page
- [ ] Customize button → personaliza flow
- [ ] Verify only sport-specific designs show

### Phase 3 Tests:
- [ ] Update product type price → verify everywhere
- [ ] View analytics → design popularity
- [ ] Custom design request → upload mockup → user sees it

---

## ✅ READY TO START!

All clarifications received. Architecture finalized. Let's build! 🚀

**Start with:** Phase 1A - Design Management Core

**First File:** `/admin/designs/page.tsx` (server component)
**Second File:** `/admin/designs/DesignsGrid.tsx` (client component)
**Third File:** API routes for designs CRUD

---

Last Updated: 2025-10-11
Status: Ready for immediate implementation
