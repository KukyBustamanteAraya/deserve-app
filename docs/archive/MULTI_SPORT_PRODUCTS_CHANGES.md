# Multi-Sport Products Implementation - Remaining Changes

**Date:** 2025-10-11
**Status:** In Progress - Database Migration Complete, Types Updated

---

## ✅ COMPLETED

1. **Database Migration**
   - Added `sport_ids bigint[]` column to products table
   - Migrated existing data from `sport_id` to `sport_ids`
   - Added GIN index for efficient array queries
   - Added constraint to ensure at least 1 sport per product
   - **REMOVED CONSTRAINT**: `products_active_needs_hero` (2025-10-11) - Products display design mockups, not their own images

2. **Schema Documentation**
   - Updated SCHEMA_REFERENCE.sql with products table structure
   - Added architecture notes
   - Documented constraint removal

3. **TypeScript Types**
   - Updated `src/types/database.types.ts` with `sport_ids: number[]`
   - Updated `src/types/products.ts` Product interface
   - Updated `src/types/catalog.ts` ProductBase and ProductDetail interfaces

4. **ProductForm Component**
   - Changed from single sport dropdown to multi-select checkboxes
   - Added custom price input field (Chilean Pesos)
   - Updated validation logic
   - Changed to blue color scheme (from pink)
   - Removed image upload (products display design mockups)

5. **POST API** (`/api/catalog/products`)
   - Accepts `sport_ids: number[]` array
   - Accepts `price_cents` from request
   - Removed automatic pricing from component_pricing table

6. **PATCH API** (`/api/admin/products/[id]`)
   - Added `sportIds` to update schema
   - Handles updating `sport_ids` array

7. **Admin Components**
   - **ProductsGrid**: Updated to display multiple sports with badges, sport filter, CSV export
   - **Admin products page.tsx**: Fetches all sports and maps to sport_names
   - **Product edit page**: Loads sport_ids array for editing

8. **Catalog Query Functions**
   - **queryProducts.ts**: Updated to use `.contains('sport_ids', [sportId])` for array queries

9. **Catalog API Routes**
   - **/api/catalog/products/[slug]**: Updated to return sports array
   - **/api/catalog/products/by-slug**: Updated to return sports array

---

## 🔄 IN PROGRESS

### 1. **ProductsGrid Component** (`src/app/admin/products/ProductsGrid.tsx`)

**Lines to Update:**

- [x] Line 18: Interface updated to include `sport_ids: number[]` and `sport_names?: string[]`
- [ ] Lines 43-48: `uniqueSports` - Extract all unique sport names from all products' sport_names arrays
- [ ] Lines 76-79: Sport filter - Filter products that have the selected sport in their sport_names array
- [ ] Line 245: CSV export - Show all sports separated by semicolon
- [ ] Lines 266-273: Duplicate function - Pass `sport_ids` instead of `sport_id`
- [ ] Line 724: List view - Display all sports with badges instead of single sport name
- [ ] Line 877: Grid view - Display all sports with badges instead of single sport name
- [ ] Line 1013: Preview modal - Display all sports with badges instead of single sport name

---

## 📋 TODO

### 2. **Admin Products Page** (`src/app/admin/products/page.tsx`)

**Current Query:**
```typescript
.select(`
  *,
  sports:sport_id (id, name)
`)
```

**Needs to Change To:**
We can't join to multiple sports with the current schema. Two options:

**Option A:** Fetch all sports separately and map in JavaScript:
```typescript
// 1. Fetch products with sport_ids
const products = await supabase
  .from('products')
  .select('*')
  .order('created_at', { ascending: false });

// 2. Fetch all sports
const sports = await supabase
  .from('sports')
  .select('id, name');

// 3. Map sport_ids to sport_names
products.forEach(product => {
  product.sport_names = product.sport_ids
    ?.map(id => sports.find(s => s.id === id)?.name)
    .filter(Boolean);
});
```

**Option B:** Use PostgreSQL array functions:
```sql
SELECT
  products.*,
  ARRAY(
    SELECT sports.name
    FROM sports
    WHERE sports.id = ANY(products.sport_ids)
  ) as sport_names
FROM products
```

**Recommendation:** Use Option A for simplicity and TypeScript safety.

---

### 3. **Product Edit Page** (`src/app/admin/products/[id]/edit/page.tsx`)

**Current:**
```typescript
const { data: product } = await supabase
  .from('products')
  .select(`
    *,
    sports!inner (id, name)
  `)
  .eq('id', params.id)
  .single();
```

**Needs:**
- Remove `sports!inner` join
- Fetch product with `sport_ids`
- Fetch all sports separately
- Pass `sport_ids` array to ProductForm as `initialData`

---

### 4. **Admin Products API** (`src/app/api/admin/products/route.ts`)

Check if this endpoint exists and if it needs updating for:
- Listing products with sport_names
- Filtering by sport

---

### 5. **Catalog Query Functions** (`src/lib/catalog/queryProducts.ts`)

This is **CRITICAL** for customer-facing catalog. Needs to:
- Query products WHERE sport_id is in the sport_ids array
- Example: `WHERE :sport_id = ANY(sport_ids)`

**Current Logic:**
```typescript
query = query.eq('sport_id', sportId);
```

**New Logic:**
```typescript
query = query.contains('sport_ids', [sportId]);
// OR
query = query.filter('sport_ids', 'cs', `{${sportId}}`);
```

---

### 6. **Catalog Routes**

#### **`src/app/api/catalog/[sport]/[product_type]/designs/route.ts`**
- Update product queries to use `sport_ids` array

#### **`src/app/api/catalog/products/[slug]/route.ts`**
- Update to fetch and display multiple sports

#### **`src/app/api/catalog/products/by-slug/route.ts`**
- Update to fetch and display multiple sports

#### **`src/app/catalog/[slug]/page.tsx`**
- Update to display multiple sports for each product

---

### 7. **Design Related Files**

#### **`src/components/admin/DesignForm.tsx`**
Check if designs reference products and if those references need updating.

#### **`src/app/api/admin/designs/[id]/mockups/route.ts`**
Check if mockup uploads reference products.

---

### 8. **Team Related Files**
- `src/app/mi-equipo/page.tsx`
- `src/app/mi-equipo/[slug]/page.tsx`
- Check if teams display products and if those displays need updating

---

### 9. **Types Files**

#### **`src/types/catalog.ts`**
Check and update product-related types to use `sport_ids` and `sport_names`.

---

### 10. **Hooks**

#### **`src/hooks/api/useProducts.ts`**
Update to handle `sport_ids` array.

---

## 🧪 TESTING CHECKLIST

After all changes:

1. **Create Product**
   - [ ] Create product with single sport
   - [ ] Create product with multiple sports (2-3)
   - [ ] Create product with all 4 sports
   - [ ] Verify price is saved correctly
   - [ ] Verify product appears in admin list

2. **Edit Product**
   - [ ] Load existing product in edit form
   - [ ] Sports checkboxes show correctly selected
   - [ ] Can add more sports
   - [ ] Can remove sports
   - [ ] Can change price

3. **Admin Products Grid**
   - [ ] Products display with all sports shown
   - [ ] Sport filter works (shows products that have that sport)
   - [ ] Search works across sport names
   - [ ] Duplicate function preserves all sports
   - [ ] CSV export includes all sports

4. **Catalog (Customer-Facing)**
   - [ ] Browse soccer catalog - shows products with soccer in sport_ids
   - [ ] Browse basketball catalog - shows products with basketball in sport_ids
   - [ ] Product that has both soccer and basketball appears in both catalogs
   - [ ] Product detail page shows all available sports

5. **Design-Product Linking**
   - [ ] Can link design to multi-sport product
   - [ ] Design mockups display correctly for multi-sport products

---

## 🎯 PRIORITY ORDER

1. **HIGH - Admin Functionality**
   - ProductsGrid display updates (so admin can see what they created)
   - Admin products page.tsx query updates
   - Product edit page updates

2. **HIGH - Customer-Facing**
   - queryProducts function (catalog queries)
   - Catalog route updates
   - Product detail pages

3. **MEDIUM - Design Integration**
   - DesignForm updates
   - Design-product linking

4. **LOW - Other References**
   - Team pages
   - Hooks
   - Misc types

---

## ⚠️ CRITICAL CONSIDERATIONS

1. **Backward Compatibility**
   - Old `sport_id` column still exists in database
   - Old code might still reference it
   - Need to ensure all queries use `sport_ids` instead

2. **Performance**
   - GIN index on `sport_ids` ensures efficient queries
   - Array operations are performant in PostgreSQL

3. **Data Integrity**
   - Constraint ensures products always have at least 1 sport
   - Migration preserved existing data

---

**Next Step:** Start with ProductsGrid updates, then move to admin pages, then catalog functions.
