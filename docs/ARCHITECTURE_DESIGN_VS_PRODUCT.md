# 🏗️ DESERVE ATHLETICS: DESIGN VS PRODUCT ARCHITECTURE
**Comprehensive Analysis & Implementation Blueprint**

> **⚠️ STATUS: PLANNED FEATURE - NOT YET IMPLEMENTED**
>
> This document describes a **future architectural direction** for separating designs from products in the Deserve platform. The features and database changes outlined here have **NOT** been implemented yet.
>
> **Current State**: Designs and products are combined in the `products` table.
> **Planned State**: Separate `designs`, `design_mockups`, and `products` tables with many-to-many relationships.
>
> **For Current Status**: See [PROJECT_STATUS.md](./PROJECT_STATUS.md)
> **For Implementation Timeline**: See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## 📋 EXECUTIVE SUMMARY

**Critical Distinction**: Deserve must separate **DESIGNS** (visual patterns) from **PRODUCTS** (physical items).

- **DESIGN** = Visual aesthetic/pattern that can be applied to multiple products
- **PRODUCT** = Physical apparel item with fixed price (jersey, shorts, etc.)

**Key Insight**: A customer sees a basketball design but can order it on a soccer jersey. Designs are sport-agnostic in application, but sport-specific in presentation.

---

## 🔍 CURRENT STATE ANALYSIS

### Current Database Schema (PROBLEMATIC)

```sql
-- ❌ CURRENT: Products mixing design and product concepts
products (
  id UUID,
  sport_id BIGINT FK → sports(id),
  slug TEXT,
  name TEXT,
  description TEXT,
  price_cents INT,
  product_type_slug TEXT,  -- "jersey", "shorts", etc.
  images []                -- Mix of design visuals and product photos
)

-- ❌ CURRENT: Design requests conflate product and design
design_requests (
  id UUID,
  team_id UUID FK → teams(id),
  product_id UUID FK → products(id),  -- Links to a "product"
  product_slug TEXT,
  product_name TEXT,
  sport_slug TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  ...
)
```

**Problems:**
1. Products table contains both product info (price, type) AND design info (images, patterns)
2. Cannot show same design across multiple sports
3. Admin must create separate "products" for each design-sport combination
4. Cannot allow customer flexibility to choose design + different product type

---

## ✅ PROPOSED ARCHITECTURE

### New Database Schema

```sql
-- 🎨 NEW: Designs table (pure visual patterns)
designs (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
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
)

-- 🖼️ NEW: Design mockups (how design looks on different products/sports)
design_mockups (
  id UUID PRIMARY KEY,
  design_id UUID FK → designs(id) ON DELETE CASCADE,
  sport_id BIGINT FK → sports(id),          -- Shows design on this sport
  product_type_slug TEXT NOT NULL,          -- jersey, shorts, etc.
  mockup_url TEXT NOT NULL,                 -- Image URL
  view_angle TEXT,                          -- "front", "back", "side"
  is_primary BOOLEAN DEFAULT false,         -- Main image for this sport
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 👕 NEW: Products table (pure physical items with pricing)
products (
  id UUID PRIMARY KEY,
  sport_id BIGINT FK → sports(id),
  product_type_slug TEXT NOT NULL,          -- "jersey", "shorts", "hoodie"
  product_type_name TEXT NOT NULL,          -- "Camiseta", "Shorts", "Polera"
  base_price_cents INT NOT NULL,            -- FIXED price for this product type
  size_price_modifier JSONB,                -- {"XL": 1000, "XXL": 2000} cents extra
  available_sizes TEXT[] DEFAULT ARRAY['S','M','L','XL','XXL'],
  available_genders TEXT[] DEFAULT ARRAY['male','female','unisex'],
  fabric_type TEXT,                         -- "dry-fit", "cotton-blend"
  weight_grams INT,
  care_instructions TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one product per sport+type combination
  UNIQUE(sport_id, product_type_slug)
)

-- 🎨👕 NEW: Junction table (which designs apply to which products)
design_products (
  design_id UUID FK → designs(id) ON DELETE CASCADE,
  product_id UUID FK → products(id) ON DELETE CASCADE,
  is_recommended BOOLEAN DEFAULT true,      -- Does this combo work well?
  preview_mockup_id UUID FK → design_mockups(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (design_id, product_id)
)

-- 📝 UPDATED: Design requests now properly separate design from product
design_requests (
  id UUID PRIMARY KEY,
  team_id UUID FK → teams(id) ON DELETE CASCADE,
  design_id UUID FK → designs(id),          -- ✅ Link to DESIGN
  product_id UUID FK → products(id),        -- ✅ Link to PRODUCT (not design+product mix)

  -- Customization options
  custom_colors JSONB,                      -- {"primary": "#FF0000", "secondary": "#0000FF"}
  custom_logo_url TEXT,
  custom_text TEXT,
  names_numbers_enabled BOOLEAN DEFAULT false,

  -- Request metadata
  status TEXT DEFAULT 'pending',
  requested_by UUID FK → auth.users(id),
  user_type TEXT CHECK (user_type IN ('player','manager')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 📦 UPDATED: Order items link to design + product
order_items (
  id UUID PRIMARY KEY,
  order_id UUID FK → orders(id) ON DELETE CASCADE,
  design_id UUID FK → designs(id),          -- Which design
  product_id UUID FK → products(id),        -- Which product type
  player_info_id UUID FK → player_info_submissions(id),

  quantity INT NOT NULL DEFAULT 1,
  unit_price_cents INT NOT NULL,            -- FROM products.base_price_cents
  customization_price_cents INT DEFAULT 0,  -- Extra cost for personalization
  line_total_cents INT GENERATED ALWAYS AS (
    (unit_price_cents + customization_price_cents) * quantity
  ) STORED,

  -- Player customization
  player_name TEXT,
  jersey_number TEXT,
  size TEXT,
  gender TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 🔄 USER FLOW COMPARISON

### ❌ OLD FLOW (Conflated)

```
1. Homepage → Select Sport: "Fútbol"
2. Browse "Products" → Shows jerseys with designs baked in
3. Click "Blue Stripes Jersey" → Product page
4. Can't easily apply this design to shorts or different sport
5. Admin must create separate products for each variation
```

### ✅ NEW FLOW (Product-First Navigation)

```
1. Homepage → Select Sport: "Fútbol"

2. PRODUCT TYPE CATALOG → Shows product categories with sample designs:
   - Camisetas (Jerseys) - 150 designs available - CLP 25,000
   - Shorts - 80 designs available - CLP 15,000
   - Poleras (Hoodies) - 60 designs available - CLP 35,000
   - Medias (Socks) - 40 designs available - CLP 5,000

3. Click "Camisetas" → DESIGN BROWSER for Soccer Jerseys:
   - Shows grid of all jersey designs displayed on soccer jerseys
   - Each design card shows preview on soccer jersey

4. Click "Blue Stripes Design" → DESIGN DETAIL PAGE:
   - Primary view: Blue Stripes on Soccer Jersey
   - "See this design on other sports:" [Soccer] [Basketball] [Volleyball] [Rugby]
   - Click Basketball → Shows Blue Stripes on Basketball Jersey
   - "Add to Order" → Adds Basketball Jersey + Blue Stripes design

5. Customer flexibility:
   - User browsing Fútbol jerseys sees "Blue Stripes"
   - Can switch to see same design on Basketball jersey
   - Can order Basketball version even though they started in Fútbol catalog

6. Admin workflow:
   - Products are PRE-CONFIGURED (fixed list with prices set)
   - Admin continuously ADDS DESIGNS to product catalog
   - When adding design: Upload soccer image first, other sports can be added later
   - Design becomes available for all products once created
```

---

## 🏠 HOMEPAGE ARCHITECTURE

### Display Logic (Product-First)

```typescript
// Homepage shows PRODUCT TYPES for selected sport

interface SportHomepageCard {
  sport: {
    id: number;
    slug: string;       // "futbol", "basquetbol"
    name: string;       // "Fútbol", "Básquetbol"
  };
}

// After selecting sport, user sees PRODUCT TYPE CATALOG
interface ProductTypeCatalogCard {
  product_type: {
    slug: string;           // "jersey", "shorts", "hoodie"
    name: string;           // "Camisetas", "Shorts", "Poleras"
    base_price_cents: number;
  };
  sport_id: number;
  available_designs_count: number;  // How many designs for this product+sport
  sample_design_mockup: string;     // Show ONE design as preview
  featured_designs: DesignMockup[];  // 3-4 featured designs to preview
}

// SQL Query for Product Type Catalog Page
SELECT
  p.product_type_slug,
  p.product_type_name,
  p.base_price_cents,
  p.sport_id,
  COUNT(DISTINCT dm.design_id) as available_designs_count,
  (
    SELECT dm2.mockup_url
    FROM design_mockups dm2
    WHERE dm2.sport_id = p.sport_id
      AND dm2.product_type_slug = p.product_type_slug
      AND dm2.is_primary = true
    ORDER BY RANDOM()
    LIMIT 1
  ) as sample_design_mockup
FROM products p
LEFT JOIN design_mockups dm ON dm.sport_id = p.sport_id
  AND dm.product_type_slug = p.product_type_slug
WHERE p.sport_id = ${selectedSportId}
  AND p.active = true
GROUP BY p.id, p.product_type_slug, p.product_type_name, p.base_price_cents, p.sport_id
ORDER BY p.sort_order, p.product_type_name;
```

**Visual Presentation:**
- Homepage: User clicks sport "Fútbol"
- Product Catalog Page shows:
  - **Camisetas** - 150 designs - CLP 25,000 (shows sample jersey design)
  - **Shorts** - 80 designs - CLP 15,000 (shows sample shorts design)
  - **Poleras** - 60 designs - CLP 35,000 (shows sample hoodie design)
- Clicking "Camisetas" → Goes to Design Browser for Soccer Jerseys

---

## 🎨 DESIGN BROWSER PAGE

### Browsing Designs Within a Product Type

```typescript
// URL: /catalog/futbol/camisetas
// User has selected: Sport = Fútbol, Product Type = Camisetas (Jerseys)

interface DesignBrowserCard {
  design: {
    id: string;
    slug: string;
    name: string;
    style_tags: string[];    // ["modern", "geometric", "bold"]
    color_scheme: string[];  // ["blue", "white", "red"]
  };
  mockup: {
    url: string;              // Shows design on Soccer Jersey
    view_angle: string;       // "front"
  };
  available_on_sports: Sport[];  // Can see this design on other sports
}

// SQL Query for Design Browser
SELECT
  d.id,
  d.slug,
  d.name,
  d.style_tags,
  d.color_scheme,
  dm.mockup_url,
  dm.view_angle,
  -- Get list of sports this design is available on
  ARRAY_AGG(DISTINCT s.name) as available_sports
FROM designs d
JOIN design_mockups dm ON dm.design_id = d.id
  AND dm.sport_id = ${sportId}           -- Show on selected sport (Fútbol)
  AND dm.product_type_slug = ${productType}  -- Show on selected product (jersey)
  AND dm.is_primary = true
LEFT JOIN design_mockups dm2 ON dm2.design_id = d.id
LEFT JOIN sports s ON s.id = dm2.sport_id
WHERE d.active = true
GROUP BY d.id, d.slug, d.name, d.style_tags, d.color_scheme, dm.mockup_url, dm.view_angle
ORDER BY d.featured DESC, d.created_at DESC;
```

**Visual Presentation:**

```
┌────────────────────────────────────────────────────────────┐
│  CAMISETAS DE FÚTBOL                           CLP 25,000   │
│  150 diseños disponibles                                    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  [Grid of design cards - each showing jersey with design]  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   [Image]   │  │   [Image]   │  │   [Image]   │        │
│  │  Blue       │  │  Geometric  │  │  Red        │        │
│  │  Stripes    │  │  Waves      │  │  Lightning  │        │
│  │             │  │             │  │             │        │
│  │ Also on: ⚾🏀│  │ Also on: 🏀 │  │ Also on: 🏐 │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  [Ver más diseños...]                                       │
└────────────────────────────────────────────────────────────┘
```

**Key Features:**
- All designs shown on Soccer Jerseys (selected sport + product)
- Small icons show which other sports this design is available on
- Clicking design → Goes to Design Detail Page
- Price shown at top (same for all jerseys, varies by product type)

---

## 🎨 DESIGN DETAIL PAGE

### Structure (With Cross-Sport Switching)

```
┌─────────────────────────────────────────────────────────┐
│  DESIGN: "Geometric Waves"                              │
│  Tags: Modern, Bold, Geometric                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [🖼️ PRIMARY IMAGE: Design on Selected Sport's Jersey] │
│                                                          │
│  🏀 SPORT SWITCHER (Cross-Sport Navigation):            │
│  Currently viewing: Fútbol                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │  ⚽  │ │  🏀  │ │  🏐  │ │  🏉  │                   │
│  │Fútbol│ │Básquet││Vóley │ │Rugby │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│  [ACTIVE]  [Click]  [Click]  [N/A]                      │
│                                                          │
│  💡 TIP: You can order this design on ANY of these      │
│     sports, regardless of which sport you started with! │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  💰 PRICING FOR FÚTBOL                                  │
│  ├─ Design: FREE (included)                            │
│  └─ Product prices:                                     │
│       • Camiseta (Jersey): CLP 25,000                  │
│       • Shorts: CLP 15,000                             │
│       • Polera (Hoodie): CLP 35,000                    │
│       • Medias (Socks): CLP 5,000                      │
│       • Customization (+names/numbers): +CLP 3,000     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  🛒 ADD TO ORDER                                        │
│  Currently selected:                                     │
│    Sport: Fútbol (change above to see other sports)    │
│                                                          │
│  Select product type to order:                          │
│  [ ] Camiseta - CLP 25,000                              │
│  [ ] Shorts - CLP 15,000                                │
│  [ ] Polera - CLP 35,000                                │
│  [ ] Medias - CLP 5,000                                 │
│                                                          │
│  [Add to Team Order]  or  [Request Custom Quote]       │
└─────────────────────────────────────────────────────────┘
```

**Key Interaction Flow:**

1. User browsing "Camisetas de Fútbol" clicks on "Geometric Waves" design
2. Design detail page shows design on Soccer Jersey by default
3. User sees sport switcher with Basketball, Volleyball, Rugby options
4. User clicks Basketball icon → Page updates to show same design on Basketball Jersey
5. Pricing updates to show Basketball product prices
6. User can add Basketball Jersey + Geometric Waves design to order
7. This works even though they started in Fútbol catalog!

---

## 👥 TEAM MANAGEMENT INTEGRATION

### Design Request Flow

```typescript
// When team manager creates design request:

Step 1: Select Design
  - Browse designs filtered by team's sport
  - OR browse ALL designs (cross-sport flexibility)
  - Preview design on different sports/products

Step 2: Select Product(s)
  - Choose one or more product types:
    ☑ Jersey (CLP 25,000 × 15 players = CLP 375,000)
    ☑ Shorts (CLP 15,000 × 15 players = CLP 225,000)
    ☐ Hoodie (CLP 35,000 × 5 coaches = CLP 175,000)

Step 3: Customize
  - Adjust colors (if design allows)
  - Upload team logo
  - Enable names/numbers (+CLP 3,000 per item)

Step 4: Collect Player Info
  - Each player selects:
    • Size
    • Gender cut
    • Name/Number (if enabled)
  - Linked to design_id + product_id combination

Step 5: Generate Order
  - Creates order_items for each player × product combination
  - Each order_item references: design_id + product_id + player_info
  - Pricing: product.base_price_cents + customization costs
```

---

## 🛠️ ADMIN PANEL WORKFLOW

### Step 1: Configure Products (ONE-TIME SETUP)

**Products are PRE-CONFIGURED** - This is done ONCE and rarely changes.

```
┌─────────────────────────────────────────┐
│  PRODUCT CATALOG MANAGEMENT             │
│  (Fixed list - prices can be updated)  │
├─────────────────────────────────────────┤
│                                          │
│  FÚTBOL Products:                       │
│  ✓ Camiseta       - CLP 25,000 [Edit]  │
│  ✓ Shorts         - CLP 15,000 [Edit]  │
│  ✓ Polera         - CLP 35,000 [Edit]  │
│  ✓ Medias         - CLP 5,000  [Edit]  │
│                                          │
│  BÁSQUETBOL Products:                   │
│  ✓ Camiseta       - CLP 28,000 [Edit]  │
│  ✓ Shorts         - CLP 16,000 [Edit]  │
│  ✓ Polera         - CLP 37,000 [Edit]  │
│                                          │
│  VÓLEIBOL Products:                     │
│  ✓ Camiseta       - CLP 26,000 [Edit]  │
│  ✓ Shorts         - CLP 15,500 [Edit]  │
│                                          │
│  [+ Add New Product Type]               │
└─────────────────────────────────────────┘
```

**Product Edit Screen:**
```
┌─────────────────────────────────────────┐
│  EDIT PRODUCT                           │
├─────────────────────────────────────────┤
│  Sport:        Fútbol (fixed)           │
│  Product Type: Camiseta (fixed)         │
│  Base Price:   [CLP 25,000     ]        │
│                                          │
│  Available Sizes:                       │
│    [✓] S  [✓] M  [✓] L  [✓] XL  [✓] XXL│
│                                          │
│  Size Price Modifiers:                  │
│    • XL:  +CLP [1,000]                  │
│    • XXL: +CLP [2,000]                  │
│                                          │
│  Fabric: [Dry-Fit Premium]              │
│  Weight: [180g]                         │
│                                          │
│  [Update Product]                       │
└─────────────────────────────────────────┘
```

---

### Step 2: Add Designs (CONTINUOUS CONTENT CREATION)

**Designs are ADDED CONTINUOUSLY** - This is the main ongoing admin activity.

```
┌─────────────────────────────────────────┐
│  CREATE NEW DESIGN                      │
├─────────────────────────────────────────┤
│  Design Name: [Blue Thunder            ]│
│  Description: [Bold geometric pattern  ]│
│  Style Tags:  [modern] [geometric] [+]  │
│  Color Scheme: [blue] [white] [black]  │
│  Allow Recoloring: [✓]                  │
│                                          │
│  📸 UPLOAD MOCKUPS BY SPORT             │
│  (You can start with one sport and add  │
│   others later!)                        │
│                                          │
│  ⚽ FÚTBOL:                              │
│  ├─ Camiseta                            │
│  │   • Front view  [Upload] ✓          │
│  │   • Back view   [Upload] ✓          │
│  ├─ Shorts                              │
│  │   • Front view  [Upload] ✓          │
│  └─ Polera                              │
│      • Front view  [Upload]             │
│                                          │
│  🏀 BÁSQUETBOL: (Optional - add later)  │
│  ├─ Camiseta                            │
│  │   • Front view  [Upload]             │
│  │   • Back view   [Upload]             │
│  └─ [Add more product mockups...]       │
│                                          │
│  🏐 VÓLEIBOL: (Not yet added)           │
│  └─ [+ Add Vóleibol mockups]            │
│                                          │
│  ✓ Status: Design created!              │
│    • Available on Fútbol: Camiseta,     │
│      Shorts (2 products)                │
│    • Can be added to Básquetbol later   │
│                                          │
│  [Save Design]  [Save & Add Another]   │
└─────────────────────────────────────────┘
```

**Key Admin Workflow Points:**

1. **Products are set once** → Admin focuses on pricing, fabric specs
2. **Designs are added continuously** → Main content creation workflow
3. **Start with one sport** → Upload soccer jersey mockup first
4. **Add other sports incrementally** → Come back later to add basketball version
5. **Design becomes available** → As soon as ANY mockup uploaded for a sport+product
6. **Cross-sport flexibility** → Once design exists, it CAN be ordered on any sport (if mockup exists)

---

## 💰 PRICING LOGIC

### Formula

```typescript
// Order Item Price Calculation

const calculateOrderItemPrice = (
  product: Product,
  customizations: Customization[]
): number => {
  let price = product.base_price_cents;

  // Add size modifier
  if (size === 'XL') price += 1000;
  if (size === 'XXL') price += 2000;

  // Add customization costs
  if (customizations.includes('name_number')) {
    price += 3000;  // Name + number printing
  }

  if (customizations.includes('custom_logo')) {
    price += 2000;  // Custom logo embroidery
  }

  // Design has NO cost - it's included

  return price;
};

// Example order for 15 players:
const jerseyProduct = {
  base_price_cents: 25000,
  sport: 'futbol',
  type: 'jersey'
};

const selectedDesign = {
  id: 'design_123',
  name: 'Geometric Waves',
  // NO PRICE
};

// Order total:
15 players × CLP 25,000 (jersey) = CLP 375,000
+ 15 × CLP 3,000 (names/numbers) = CLP 45,000
─────────────────────────────────────────────
TOTAL: CLP 420,000

// Design "Geometric Waves" adds NO cost to order
```

---

## 🔑 KEY BENEFITS

### For Customers
1. ✅ See same design across multiple sports
2. ✅ Mix and match: soccer design on basketball jersey if desired
3. ✅ Clear, predictable pricing per product type
4. ✅ More design options without price confusion

### For Deserve Athletics
1. ✅ Create ONE design, use across ALL sports (upload mockups per sport)
2. ✅ Consistent product pricing strategy
3. ✅ Easier inventory management (products standardized)
4. ✅ Better analytics: track popular designs separately from products
5. ✅ Scalability: add new designs without creating products
6. ✅ Flexibility: adjust product prices independently of designs

### For Admin Users
1. ✅ Separate workflows: design creation vs product pricing
2. ✅ Reuse designs across sports easily
3. ✅ Update product prices globally without touching designs
4. ✅ Better content management

---

## 📊 MIGRATION STRATEGY

### Phase 1: Database Schema (Week 1)
- [ ] Create `designs` table
- [ ] Create `design_mockups` table
- [ ] Restructure `products` table (remove design fields)
- [ ] Create `design_products` junction table
- [ ] Update `design_requests` FK relationships
- [ ] Update `order_items` to reference both design_id + product_id

### Phase 2: Data Migration (Week 1-2)
- [ ] Script: Extract designs from current products table
- [ ] Script: Create product entries for each sport+type combo
- [ ] Script: Link existing orders to new design+product structure
- [ ] Script: Migrate design_requests references

### Phase 3: API Updates (Week 2)
- [ ] `/api/designs` - CRUD for designs
- [ ] `/api/designs/[slug]` - Get design with mockups
- [ ] `/api/products` - List products by sport
- [ ] `/api/catalog/browse` - Browse designs filtered by sport
- [ ] Update `/api/design-requests` to handle new structure
- [ ] Update `/api/orders/create-from-design` to use design_id + product_id

### Phase 4: Frontend Updates (Week 3)
- [ ] Homepage: Display designs (not products)
- [ ] Design detail page: Show design on multiple sports + product selector
- [ ] Team dashboard: Design selection flow
- [ ] Admin panel: Separate design creation from product management
- [ ] Cart/checkout: Show design + product clearly

### Phase 5: Testing & Launch (Week 4)
- [ ] E2E test: Browse design → order → payment → fulfillment
- [ ] Test: Cross-sport design selection
- [ ] Test: Price calculations for different products
- [ ] Load testing
- [ ] Deploy to production

---

## 🎯 SUCCESS METRICS

### Technical
- ✅ Zero orphaned references after migration
- ✅ All existing orders maintain correct design + product associations
- ✅ Product prices update globally without affecting designs

### Business
- ✅ 50% reduction in admin time to add new designs
- ✅ 100+ designs available within first month
- ✅ Customers can see 3+ sports per design on average

### User Experience
- ✅ Clear separation: "This design costs nothing, jerseys cost CLP 25,000"
- ✅ Users understand they're choosing design THEN product
- ✅ Reduced support tickets about pricing confusion

---

## 📝 IMPLEMENTATION CHECKLIST

**Critical Questions to Answer:**
- [ ] Do we allow same design on ANY product type, or restrict some combos?
- [ ] Should designs have a "premium" tier with extra cost?
- [ ] How do we handle seasonal/limited designs?
- [ ] What's the approval process for user-submitted designs?
- [ ] Do we need design versioning (design_v1, design_v2)?

**Dependencies:**
- [ ] Confirm sports list is stable (affects mockup uploads)
- [ ] Define product types taxonomy (jersey, shorts, hoodie, pants, jacket, etc.)
- [ ] Establish design tagging/categorization system
- [ ] Set up CDN for design mockup images

**Risks & Mitigations:**
- Risk: Data migration errors → Mitigation: Run in staging first, keep backup
- Risk: Frontend confusion about design vs product → Mitigation: Clear UI/UX, user testing
- Risk: Admin workflow too complex → Mitigation: Phased rollout, training docs

---

## 📊 KEY ARCHITECTURAL DECISIONS SUMMARY

### Navigation Hierarchy: Product-First Approach

**DECISION**: Users browse **Products first**, then **Designs**, not the reverse.

```
Homepage → Sport Selection → PRODUCT TYPE CATALOG → Design Browser → Design Detail
```

**Why This Matters:**

1. **Clearer User Intent**: Customer knows they want a jersey, then picks a design
2. **Predictable Pricing**: Product price shown upfront, same for all designs
3. **Natural Shopping Flow**: Physical product → Visual customization
4. **Admin Efficiency**: Products are set once, designs added continuously

### Cross-Sport Design Flexibility

**DECISION**: Designs are **sport-agnostic** but **displayed sport-specifically**.

- Design "Blue Thunder" is ONE design entity
- Has mockups for: Soccer Jersey, Basketball Jersey, Volleyball Jersey
- User browsing Soccer catalog sees it on soccer jersey
- User can switch to Basketball view and order basketball version
- **Key insight**: "I saw this soccer design but want it on a basketball jersey" is ALLOWED

### Admin Content Strategy

**DECISION**: **Products = One-time setup**, **Designs = Continuous content**.

1. **Phase 1** (Setup): Configure 12-16 products (4 sports × 3-4 product types)
2. **Phase 2** (Ongoing): Add 5-10 designs per week
3. **Incremental Mockups**: Start with soccer images, add basketball later
4. **Design Availability**: Design becomes orderable as soon as first mockup uploaded

### Database Architecture Principles

**DECISION**: **Complete separation** of design and product concerns.

- `designs` table = Pure visual patterns (no price, no sport)
- `design_mockups` table = How design looks on specific sport+product combos
- `products` table = Physical items with fixed prices (sport + product type)
- `design_products` junction = Which designs work on which products

**This enables:**
- Update product prices globally without touching designs
- Add new designs without creating products
- Show same design across multiple sports
- Track design popularity separately from product sales

---

## 🚀 READY TO IMPLEMENT

This architecture separates concerns perfectly:
- **Designs** = Creative content (no price, incrementally added)
- **Products** = Physical goods (priced, configured once)
- **Homepage** = Sport → Product types → Designs
- **Cross-sport flexibility** = Users can switch sports at design level
- **Orders** = Combine design + product choice

**Next Steps:**
1. Review this refined product-first architecture
2. Approve schema changes
3. Begin Phase 1: Database migration (designs, design_mockups, updated products)
4. Phase 2: API endpoints for product catalog and design browser
5. Phase 3: Frontend - product-first navigation flow
6. Phase 4: Admin panel - product configuration + design upload workflow

**Questions? Need clarification on any section?**
