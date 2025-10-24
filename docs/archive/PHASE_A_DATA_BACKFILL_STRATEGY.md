# Phase A: Data Backfill Strategy

**Date:** 2025-10-11
**Status:** 📋 Planning
**Purpose:** Migrate existing products and design requests to new Design/Product Architecture

---

## 🎯 Goal

Transform existing product data (which mixes designs and products) into the new separated architecture where:
- **Designs** = Visual patterns (sport-agnostic)
- **Products** = Physical items (sport+product_type specific)
- **Design Mockups** = How a design looks on specific sport+product combinations

---

## 📊 Current State Analysis

### Existing Products Table
```sql
-- Example current structure:
id  | sport_id | mockup | name                    | slug
----+----------+--------+-------------------------+------------------
1   | 1        | url1   | Fútbol Jersey Design A  | futbol-jersey-a
2   | 2        | url2   | Basketball Jersey B     | basketball-jersey-b
```

**Problem:** Each row represents a design+product combination, not reusable designs.

### Existing Design Requests Table
```sql
-- Current structure:
id  | team_id | product_id | customization | status
----+---------+------------+---------------+--------
1   | uuid1   | 1          | {...}         | pending
```

**Problem:** Links directly to product (which embeds design), not to reusable design.

---

## 🔄 Backfill Strategy

### Phase A.1: Audit Current Data

**Action:** Query and document all existing products.

```sql
-- Run in Supabase SQL Editor:
SELECT
  p.id,
  p.slug,
  p.name,
  p.mockup,
  s.slug as sport_slug,
  s.name as sport_name,
  pt.slug as product_type_slug,
  pt.display_name as product_type_name
FROM products p
LEFT JOIN sports s ON s.id = p.sport_id
LEFT JOIN product_types pt ON pt.id = p.product_type_id
ORDER BY s.slug, pt.slug, p.id;
```

**Expected Output:** Complete inventory of all products with their sport and type.

---

### Phase A.2: Design Extraction Strategy

**Decision Point:** How to convert existing products into designs?

#### Option 1: One-to-One Migration (Conservative)
- Create 1 design for each existing product
- Keep existing product records
- Link them via `design_products` junction

**Pros:**
- ✅ No data loss
- ✅ Immediate compatibility
- ✅ Preserves existing references

**Cons:**
- ❌ Doesn't leverage cross-sport reusability
- ❌ Still have duplicate designs across sports

#### Option 2: Manual Curation (Recommended for MVP)
- Start with empty `designs` table
- Manually add 3-5 test designs
- Create mockups for multiple sports
- Keep existing products untouched (legacy mode)
- Gradually migrate as new designs are added

**Pros:**
- ✅ Clean slate for new architecture
- ✅ Existing functionality unaffected
- ✅ Time to test cross-sport designs
- ✅ Gradual migration path

**Cons:**
- ⚠️ Requires manual design creation
- ⚠️ Two systems running in parallel

#### Option 3: Automated De-duplication (Future)
- Analyze existing products for similar designs
- Group by visual similarity
- Create consolidated designs
- Generate mockups for each sport

**Pros:**
- ✅ Maximizes reusability
- ✅ Cleaner design library

**Cons:**
- ❌ Complex implementation
- ❌ Risk of incorrect grouping
- ❌ Requires image analysis

---

## ✅ Recommended Approach: Option 2 (Manual Curation)

### Step-by-Step Plan

#### 1. Leave Existing Products Untouched
```sql
-- No changes to existing products table rows
-- They continue to work as before
```

#### 2. Create Test Designs Manually
```sql
-- Example: Create "Lightning Strike" design
INSERT INTO designs (slug, name, description, style_tags, color_scheme, featured, active)
VALUES (
  'lightning-strike',
  'Lightning Strike',
  'Bold diagonal lightning pattern with modern geometric elements',
  ARRAY['modern', 'geometric', 'dynamic'],
  ARRAY['electric-blue', 'black', 'white'],
  true,
  true
);
```

#### 3. Upload Mockups for Multiple Sports
```sql
-- Upload mockup images to Supabase Storage:
-- /mockups/lightning-strike/futbol-jersey-front.png
-- /mockups/lightning-strike/futbol-jersey-back.png
-- /mockups/lightning-strike/basquetbol-jersey-front.png
-- /mockups/lightning-strike/voleibol-jersey-front.png

-- Create mockup records:
INSERT INTO design_mockups (design_id, sport_id, product_type_slug, mockup_url, view_angle, is_primary)
SELECT
  (SELECT id FROM designs WHERE slug = 'lightning-strike'),
  s.id,
  'jersey',
  '/mockups/lightning-strike/' || s.slug || '-jersey-front.png',
  'front',
  true
FROM sports s
WHERE s.slug IN ('futbol', 'basquetbol', 'voleibol', 'rugby');
```

#### 4. Link Designs to Products
```sql
-- Link "Lightning Strike" design to jersey products across all sports
INSERT INTO design_products (design_id, product_id, is_recommended)
SELECT
  (SELECT id FROM designs WHERE slug = 'lightning-strike'),
  p.id,
  true
FROM products p
WHERE p.product_type_id = (SELECT id FROM product_types WHERE slug = 'jersey');
```

#### 5. Create New Design Requests with design_id
```sql
-- When users request designs going forward:
-- OLD: Insert with product_id only
-- NEW: Insert with both product_id AND design_id

INSERT INTO design_requests (team_id, product_id, design_id, customization, status)
VALUES (
  'team-uuid',
  123,  -- product_id (for product details)
  'design-uuid',  -- design_id (for design reference)
  '{"colors": {...}}',
  'pending'
);
```

---

## 📋 Data Migration Checklist

### Before Adding First Test Design
- [x] Schema tables created (`designs`, `design_mockups`, `design_products`)
- [x] Indexes and RLS policies in place
- [x] Schema exported and documented
- [ ] Query current products inventory
- [ ] Identify 3-5 designs to start with
- [ ] Prepare mockup images

### For Each Test Design
- [ ] Create design record in `designs` table
- [ ] Upload mockup images to Supabase Storage (organized by design slug)
- [ ] Create `design_mockups` records for each sport+product+angle
- [ ] Link to products via `design_products` junction
- [ ] Test design appears in catalog API
- [ ] Test design can be selected in design request flow

### Frontend Integration
- [ ] Build `/catalog/[sport]` - Product type selector
- [ ] Build `/catalog/[sport]/[product_type]` - Design browser
- [ ] Build `/designs/[slug]` - Design detail with cross-sport mockups
- [ ] Update design request flow to save `design_id`
- [ ] Update admin panel to manage designs

---

## 🔍 Validation Queries

### Check Design Coverage
```sql
-- How many designs exist?
SELECT COUNT(*) as design_count FROM designs WHERE active = true;

-- How many mockups per design?
SELECT
  d.name,
  COUNT(dm.id) as mockup_count
FROM designs d
LEFT JOIN design_mockups dm ON dm.design_id = d.id
GROUP BY d.id, d.name
ORDER BY mockup_count DESC;
```

### Check Product Linkage
```sql
-- How many products linked to each design?
SELECT
  d.name,
  COUNT(dp.product_id) as linked_products
FROM designs d
LEFT JOIN design_products dp ON dp.design_id = d.id
GROUP BY d.id, d.name
ORDER BY linked_products DESC;
```

### Check Cross-Sport Availability
```sql
-- Which designs are available for which sports?
SELECT
  d.name as design,
  s.name as sport,
  COUNT(dm.id) as mockup_count
FROM designs d
LEFT JOIN design_mockups dm ON dm.design_id = d.id
LEFT JOIN sports s ON s.id = dm.sport_id
GROUP BY d.id, d.name, s.id, s.name
ORDER BY d.name, s.name;
```

---

## 🚦 Rollout Plan

### Stage 1: MVP with Test Designs (Week 1)
- Create 3 test designs
- Generate mockups for all 4 sports
- Link to jersey products only
- Test catalog browsing
- Test design selection flow

### Stage 2: Expand Product Types (Week 2)
- Add mockups for shorts
- Add mockups for hoodies (if applicable)
- Test multi-product design application

### Stage 3: User Testing (Week 3)
- Beta test with real teams
- Collect feedback on design browsing
- Validate cross-sport design reuse
- Monitor performance

### Stage 4: Full Rollout (Week 4)
- Add 10-20 production designs
- Phase out old product selection flow
- Keep legacy products for historical orders
- Migrate old design requests (optional)

---

## 🛡️ Safety Measures

### Backward Compatibility
- **Old design requests** (no `design_id`) still work
- **Old products** (no design linkage) still work
- **Frontend** checks for `design_id` presence before using new flow
- **Admin panel** supports both old and new flows

### Data Integrity
- Foreign keys ensure no orphaned records
- `ON DELETE CASCADE` for design deletions
- `ON DELETE SET NULL` for design_requests and order_items
- RLS policies prevent unauthorized access

### Rollback Plan
If issues arise:
1. Keep existing products table unchanged
2. Frontend falls back to old flow if design_id is null
3. Can disable new catalog pages
4. Can mark all designs as inactive (hides from public)

---

## 📝 Next Steps

1. **Query existing products** to understand current inventory
2. **Identify first 3 test designs** to create
3. **Prepare mockup images** (or use placeholder images)
4. **Insert test designs** manually in Supabase
5. **Build catalog API endpoints** to serve designs
6. **Build catalog frontend pages** to browse designs

---

**This approach prioritizes safety and gradual adoption while establishing the foundation for the new architecture.**

Last Updated: 2025-10-11
