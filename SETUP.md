# Deserve App - Setup Guide

## Prerequisites

- Node.js 18+ (check with `node -v`)
- npm or yarn
- Supabase account
- Mercado Pago account (for payments)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For migrations

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Mercado Pago (optional for development)
MP_ACCESS_TOKEN=your-access-token
MP_PUBLIC_KEY=your-public-key
MP_WEBHOOK_TOKEN=your-webhook-secret

# Optional
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=30
CSRF_ALLOWED_ORIGINS=
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Option A: Via Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents of `migrations/013_pricing_and_voting.sql`
4. Execute the query
5. Verify tables created: fabrics, pricing_tiers, design_candidates, etc.

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Seed Data

```bash
# Seed pricing data (single items + bundles)
npx tsx scripts/seed-pricing.ts
```

Expected output:
```
🚀 Starting pricing seed...
📦 Creating single items...
✅ Created Socks
✅ Created Shorts
✅ Created Jersey
✅ Created Pants
🎁 Creating bundles...
✅ Created Jersey + Shorts (saves $5k)
✅ Created Full Kit (saves $5k)
...
✨ Pricing seed complete!
```

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Database Schema Overview

### Core Tables

**Fabrics** (`public.fabrics`)
- 10 fabric types (Deserve, Premium, Agile, etc.)
- Price modifiers (e.g., Premium +$3k)
- Composition, GSM, use cases

**Products** (`public.products`)
- Single items (jersey, shorts, socks)
- Bundles (Full Kit, Home+Away, etc.)
- Linked to fabrics, sports
- Base price + retail anchor price

**Pricing Tiers** (`public.pricing_tiers`)
- Quantity-based discounts
- Per-product tiers (1-5, 6-15, 16+)

**Teams** (`public.teams`)
- Team info + quorum settings
- Voting status
- Design allowance tracking

**Design Candidates** (`public.design_candidates`)
- Team design voting system
- Uploaded by captain
- Vote tallies (yes/no)

**Design Votes** (`public.design_votes`)
- One vote per user per design
- Tracks voting participation

**Orders** (`public.orders`)
- 7-stage pipeline tracking
- Production dates + delivery estimates
- Courier tracking

**Notifications Log** (`public.notifications_log`)
- Email/WhatsApp audit trail
- Delivery status tracking

---

## API Endpoints

### Pricing API

**GET /api/pricing/calculate**

Calculate dynamic pricing based on quantity and fabric.

Query Parameters:
- `product_id` (required): UUID of product
- `quantity` (optional): Number of items (default 1)
- `fabric_id` (optional): UUID of fabric (defaults to Deserve)

Example:
```bash
curl "http://localhost:3000/api/pricing/calculate?product_id=xxx&quantity=10&fabric_id=yyy"
```

Response:
```json
{
  "base_price_cents": 35000,
  "fabric_modifier_cents": 3000,
  "unit_price_cents": 38000,
  "total_price_cents": 380000,
  "tier": {
    "min_quantity": 10,
    "max_quantity": 19,
    "price_per_unit_cents": 35000
  },
  "savings_cents": 20000,
  "retail_price_cents": 40000,
  "currency": "CLP"
}
```

### Catalog API

**GET /api/catalog/products**

List products with filters.

Query Parameters:
- `status`: draft | active | archived
- `sport_id`: UUID
- `category`: camiseta | shorts | medias | etc.

### Fabrics API

**GET /api/fabrics**

List all available fabrics.

Response:
```json
{
  "fabrics": [
    {
      "id": "uuid",
      "name": "Deserve",
      "composition": "100% polyester",
      "gsm": 150,
      "price_modifier_cents": 0,
      "description": "Standard lightweight fabric"
    },
    ...
  ]
}
```

---

## White Paper Alignment

This setup implements **Phase 1** of the white paper:

✅ **Fabrics System**
- 10 fabrics with modifiers
- Video/close-up support (URLs stored)

✅ **Dynamic Pricing**
- Quantity-based tiers
- Fabric modifiers additive
- Bundle discounts

✅ **Design Voting**
- 2-6 candidates per team
- Yes/No votes
- Quorum logic (default 70%)
- Captain tie-breaker

✅ **Team Page Foundation**
- Quorum threshold tracking
- Voting status
- Design allowance counter

⏳ **Coming Next (Phase 2-3)**
- Mi Equipo page UI
- Quantity slider component
- Size calculator
- CSV roster upload
- Manufacturer portal

---

## Troubleshooting

### Migration Errors

**Error:** `relation "fabrics" already exists`
- Solution: Migration already ran. Skip or drop table first:
  ```sql
  DROP TABLE IF EXISTS public.fabrics CASCADE;
  ```

**Error:** `permission denied for table products`
- Solution: Check RLS policies. Use service role key for migrations:
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-pricing.ts
  ```

### Seed Script Errors

**Error:** `Missing environment variables`
- Solution: Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Error:** `Product already exists`
- This is normal on re-runs. Script skips duplicates automatically.

### Development Server

**Error:** `Runtime chunk error (./682.js)`
- Solution: Clean cache and reinstall:
  ```bash
  npm run clean
  ```

**Error:** `Cookies can only be modified...`
- Solution: Cookie mutations only work in Route Handlers/Server Actions. Check code location.

---

## Next Steps

After setup, proceed to:

1. **Test Pricing API:**
   - Visit `/api/pricing/calculate?product_id=xxx&quantity=10`
   - Verify calculations match white paper

2. **Create Test Team:**
   - Login as user
   - Create team at `/dashboard/team`
   - Test quorum settings

3. **Upload Design Candidates:**
   - Add 2-3 designs to team
   - Test voting with multiple users

4. **Build Product Page:**
   - Add fabric selector
   - Add quantity slider
   - Integrate pricing API

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run clean            # Clean cache + reinstall

# Database
npm run gen:types        # Generate Supabase types
npm run db:migrate       # Push migrations (if using CLI)

# Testing
npm run qa:auth          # Auth flow QA tests

# Deployment
vercel                   # Deploy to Vercel
```

---

## Support

Issues? Check:
- [White Paper](/Deserve_White_Paper_v2.1.md)
- [Pricing Spec](/Deserve_Pricing_Spec_ALL.csv)
- [Migration File](/migrations/013_pricing_and_voting.sql)

For bugs, create an issue in the repo with:
- Steps to reproduce
- Expected vs actual behavior
- Console errors
- Database state (anonymized)
