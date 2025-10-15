# Current Database Schema Reference

**Last Updated:** 2025-10-12 (Fresh Supabase export - validated production schema)
**Schema:** `public`
**Status:** ✅ Synced with production + ✅ Institution Migration Applied (2025-10-12)

This document tracks the ACTUAL current state of the database schema. Always reference this when creating new migrations or features.

**Recent Changes:**
- ✅ **Institution Migration Applied** (2025-10-12) - 2 new tables created, 4 tables extended, 9 RLS policies added, 2 helper functions created

---

## Quick Reference

### Schema Inspection Endpoint
Visit: `http://localhost:3000/api/dev/schema-info`

### Total Tables: 51

**Core Team Tables**: `teams`, `team_memberships`, `team_members`, `team_settings`, `team_invites`
**Order Tables**: `orders`, `order_items`, `order_status_history`
**Payment Tables**: `payment_contributions`, `bulk_payments`, `bulk_payment_orders`, `mercadopago_preferences`, `mercadopago_payments`
**Design Tables**: `design_requests`, `designs`, `design_mockups`, `design_products`, `design_votes`, `design_feedback`
**Product Tables**: `products`, `product_types`, `product_images`, `fabrics`, `pricing_tiers`
**Roster Tables**: `player_info_submissions`, `roster_members`
**User Tables**: `profiles` (references `auth.users`)

---

## Critical Tables for Institution Implementation

### 1. teams ✅ Ready for Institutions

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name text NOT NULL,
  slug text UNIQUE,

  -- Sport Configuration
  sport text,                    -- Legacy single sport
  sport_id bigint REFERENCES sports(id),
  sports text[],                 -- Array for multi-sport (institutions)

  -- Team Type (CRITICAL FOR INSTITUTIONS)
  team_type text DEFAULT 'single_team'
    CHECK (team_type IN ('single_team', 'institution')),
  is_institutional boolean DEFAULT false, -- Legacy flag
  institution_name text,

  -- Ownership
  created_by uuid NOT NULL REFERENCES auth.users(id),
  owner_id uuid REFERENCES auth.users(id),
  current_owner_id uuid REFERENCES auth.users(id),

  -- Branding
  colors jsonb NOT NULL DEFAULT '{}',
  logo_url text,

  -- Setup
  setup_completed boolean DEFAULT false,

  -- Legacy Voting (single teams)
  quorum_threshold integer DEFAULT 70,
  quorum_locked boolean DEFAULT false,
  voting_open boolean DEFAULT false,
  voting_closes_at timestamptz,
  design_allowance_used integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points:**
- ✅ `team_type` supports `'institution'`
- ✅ `sports` array for multiple sports
- ✅ `institution_name` field exists
- ⚠️ Both `is_institutional` (boolean) and `team_type` (text) exist - redundant

---

### 2. team_memberships ✅ Extended with Institution Support

**Primary Key:** Composite `(user_id, team_id)`

```sql
CREATE TABLE public.team_memberships (
  team_id uuid NOT NULL REFERENCES teams(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'player')),
  institution_role text CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  )),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
```

**Current Status:**
- ✅ Actively used in codebase (see `/src/app/mi-equipo/[slug]/page.tsx:163`)
- ✅ `institution_role` column added (2025-10-12)

**Migration Applied:**
✅ Column added successfully in INSTITUTION_SETUP_MIGRATION.sql

**Usage Pattern:**
```typescript
// Single team
{ team_id: 'uuid', user_id: 'uuid', role: 'manager', institution_role: null }

// Institution staff
{ team_id: 'inst-uuid', user_id: 'uuid', role: 'manager', institution_role: 'athletic_director' }
```

---

### 3. team_members ⚠️ Duplicate/Legacy?

**Primary Key:** Composite `(team_id, user_id)`

```sql
CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES teams(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text DEFAULT 'member',  -- Generic, no constraints
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
```

**Status:**
- ⚠️ Similar to `team_memberships` but with generic `role` field
- ❓ Purpose unclear - may be legacy or for different use case
- 🎯 **Decision Needed:** Clarify relationship with `team_memberships`

---

### 4. player_info_submissions ✅ Perfect for Roster Data

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.player_info_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  design_request_id bigint REFERENCES design_requests(id),
  user_id uuid REFERENCES auth.users(id), -- NULLABLE!

  -- Roster Data
  player_name text NOT NULL,
  jersey_number text,
  size text NOT NULL,
  position text,
  additional_notes text,

  -- Metadata
  submitted_by_manager boolean DEFAULT false,
  submission_token text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points:**
- ✅ `user_id` nullable (players without accounts)
- ✅ Can be reused for sub-team rosters
- ⚠️ Consider adding `sub_team_id` column for institutions

**Institution Usage:**
- Could store sub-team roster data
- Or create separate `institution_sub_team_members` table (recommended)

---

### 5. orders ✅ Ready for Institution Orders

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  customer_id uuid REFERENCES customers(id),
  user_id uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),

  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'design_review', 'design_approved',
      'design_changes', 'production', 'quality_check', 'shipped', 'delivered')),
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),

  -- Payment Mode
  payment_mode text DEFAULT 'individual'
    CHECK (payment_mode IN ('individual', 'manager_pays_all')),

  -- Pricing (Chilean Pesos - no decimals)
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  total_cents integer GENERATED ALWAYS AS (
    ((subtotal_cents - discount_cents) + tax_cents) + shipping_cents
  ) STORED,
  total_amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CLP',

  -- Shipping
  shipping_address_id uuid REFERENCES shipping_addresses(id),
  shipping_recipient_name text,
  shipping_street_address text,
  shipping_commune text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  delivery_instructions text,

  -- Tracking
  tracking_number text,
  courier_name text,
  carrier text,

  -- Timeline
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status_updated_at timestamptz DEFAULT now(),
  design_approved_at timestamptz,
  production_started_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  production_start_date timestamptz,
  estimated_delivery_date timestamptz,
  estimated_delivery date,

  -- Stages
  current_stage text DEFAULT 'pending'
    CHECK (current_stage IN ('pending', 'design_review', 'design_approved',
      'in_production', 'qc', 'ready', 'in_transit', 'delivered')),

  -- Notes
  notes text,
  admin_notes text,
  customer_notes text,
  internal_notes text
);
```

**Institution Extension Applied (2025-10-12):**
✅ `sub_team_id` column added with foreign key to `institution_sub_teams(id)`

---

### 6. order_items ✅ Ready

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),

  -- Product
  product_id bigint NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  collection text,
  images text[] NOT NULL DEFAULT '{}',
  design_id uuid REFERENCES designs(id),

  -- Pricing
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_cents integer GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,

  -- Player Assignment
  player_id uuid,
  player_name text,
  jersey_number text,

  -- Customization
  customization jsonb,
  used_size_calculator boolean DEFAULT false,
  size_calculator_recommendation text,
  notes text,

  -- Opt-out
  opted_out boolean DEFAULT false,
  opted_out_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### 7. payment_contributions ✅ Universal Payment System

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.payment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id uuid NOT NULL REFERENCES orders(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),

  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency bpchar NOT NULL DEFAULT 'CLP',

  -- Status (dual columns exist)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Mercado Pago
  mp_payment_id text UNIQUE,
  mercadopago_payment_id text,
  mp_preference_id text,
  external_reference text UNIQUE,
  payment_method text,
  raw_payment_data jsonb,

  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Note:** Two status columns exist (`status` and `payment_status`) - may be redundant

---

### 8. bulk_payments ✅ Ready for AD Bulk Payments

**Primary Key:** `id` (UUID)

```sql
CREATE TABLE public.bulk_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),

  total_amount_cents integer NOT NULL CHECK (total_amount_cents >= 0),
  currency bpchar NOT NULL DEFAULT 'CLP',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),

  mp_payment_id text UNIQUE,
  mp_preference_id text,
  external_reference text UNIQUE,
  raw_payment_data jsonb,

  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bulk_payment_orders (
  bulk_payment_id uuid NOT NULL REFERENCES bulk_payments(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  PRIMARY KEY (order_id, bulk_payment_id)
);
```

**Usage:** Athletic Director pays for multiple sub-team orders at once

---

### 9. design_requests ✅ Ready

**Primary Key:** `id` (bigint)

```sql
CREATE TABLE public.design_requests (
  id bigint PRIMARY KEY,

  -- Team
  team_id uuid NOT NULL REFERENCES teams(id),
  team_slug text REFERENCES teams(slug),

  -- Requester
  requested_by uuid NOT NULL REFERENCES profiles(id),
  user_id uuid REFERENCES auth.users(id),
  user_type text CHECK (user_type IN ('player', 'manager')),

  -- Design
  design_id uuid REFERENCES designs(id),
  selected_apparel jsonb DEFAULT '{}',
  product_slug text,
  product_name text,
  sport_slug text,

  -- Customization
  primary_color text,
  secondary_color text,
  accent_color text,
  logo_url text,
  logo_placements jsonb DEFAULT '{}',
  uniform_details jsonb DEFAULT '{}',
  names_numbers boolean DEFAULT false,

  -- Status
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('pending', 'rendering', 'ready', 'cancelled')),
  approval_status text DEFAULT 'pending_review'
    CHECK (approval_status IN ('pending_review', 'approved',
      'changes_requested', 'revision_ready')),
  priority text DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),

  -- Voting
  voting_enabled boolean DEFAULT false,
  voting_closes_at timestamptz,
  approval_votes_count integer DEFAULT 0,
  rejection_votes_count integer DEFAULT 0,
  required_approvals integer DEFAULT 1,
  design_options jsonb DEFAULT '[]',

  -- Linked Order
  order_id uuid REFERENCES orders(id),

  -- Approval
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),

  -- Mockups
  mockup_urls text[] DEFAULT ARRAY[],
  admin_comments jsonb DEFAULT '[]',
  feedback text,
  render_spec jsonb,
  output_url text,

  -- Versioning
  version integer DEFAULT 1,
  revision_count integer DEFAULT 0,

  -- Legacy
  brief text,
  selected_candidate_id bigint REFERENCES design_candidates(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Institution Extension Applied (2025-10-12):**
✅ `sub_team_id` column added with foreign key to `institution_sub_teams(id)`

---

### 10. team_settings ✅ Ready (can be extended)

**Primary Key:** `team_id` (UUID)

```sql
CREATE TABLE public.team_settings (
  team_id uuid PRIMARY KEY REFERENCES teams(id),

  -- Approval
  approval_mode text NOT NULL DEFAULT 'owner_only',
  min_approvals_required integer DEFAULT 1,
  voting_deadline timestamptz,
  designated_voters uuid[],

  -- Player Info
  player_info_mode text DEFAULT 'hybrid',
  self_service_enabled boolean DEFAULT true,
  info_collection_link text,
  info_collection_token text,
  info_collection_expires_at timestamptz,

  -- Access
  access_mode text DEFAULT 'invite_only',
  allow_member_invites boolean DEFAULT false,

  -- Notifications
  notify_on_design_ready boolean DEFAULT true,
  notify_on_vote_required boolean DEFAULT true,

  -- Payment
  payment_mode text DEFAULT 'individual'
    CHECK (payment_mode IN ('individual', 'manager_pays_all')),

  -- Branding
  primary_color text,
  secondary_color text,
  tertiary_color text,
  logo_url text,
  banner_url text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Institution Extensions Applied (2025-10-12):**
✅ 5 institution-specific settings columns added:
- `allow_program_autonomy` - boolean
- `require_ad_approval_for_orders` - boolean
- `budget_tracking_enabled` - boolean
- `budget_per_program_cents` - integer
- `fiscal_year_start_month` - integer (1-12)

---

## Institution Tables (Created 2025-10-12)

### 1. institution_sub_teams ✅ EXISTS

**Created:** 2025-10-12 via INSTITUTION_SETUP_MIGRATION.sql

```sql
CREATE TABLE public.institution_sub_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Sub-Team Identity
  name text NOT NULL,
  slug text,
  sport_id bigint NOT NULL REFERENCES sports(id),
  level text,

  -- Management
  head_coach_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coordinator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Branding
  colors jsonb DEFAULT '{}',
  logo_url text,

  -- Status
  active boolean DEFAULT true,
  season_year text,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_institution_sub_team_slug UNIQUE(institution_team_id, slug)
);
```

**RLS Policies:** 6 policies created (athletic_directors, head_coaches, coordinators)
**Indexes:** 5 indexes for performance

---

### 2. institution_sub_team_members ✅ EXISTS

**Created:** 2025-10-12 via INSTITUTION_SETUP_MIGRATION.sql

```sql
CREATE TABLE public.institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES institution_sub_teams(id) ON DELETE CASCADE,

  -- Player Info (NO USER ACCOUNT - roster data only)
  player_name text NOT NULL,
  email text,  -- Optional, for notifications only (NOT for login)

  -- Roster Data
  position text,
  jersey_number integer CHECK (jersey_number > 0 AND jersey_number <= 999),
  size text,
  additional_info jsonb DEFAULT '{}',

  -- Metadata
  joined_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  CONSTRAINT unique_sub_team_member_email UNIQUE(sub_team_id, email)
);
```

**RLS Policies:** 3 policies created (head_coaches, athletic_directors, coordinators)
**Indexes:** 3 indexes for performance

---

### 3. Helper Functions ✅ CREATED

**Created:** 2025-10-12 via INSTITUTION_SETUP_MIGRATION.sql

1. **`get_institution_sub_teams(institution_id uuid)`**
   - Returns all sub-teams for an institution with aggregated data
   - Includes sport name, coach name, roster count

2. **`has_institution_role(team_id uuid, user_id uuid, role text)`**
   - Check if a user has a specific institution role
   - Supports: athletic_director, program_coordinator, head_coach, assistant

---

## Complete Table List (51 tables)

1. activity_log
2. admin_notifications
3. bulk_payment_orders
4. bulk_payments
5. bundles
6. cart_items
7. carts
8. component_pricing
9. customers
10. design_candidates
11. design_feedback
12. design_mockups
13. design_products
14. design_request_activity
15. design_request_reactions
16. design_requests
17. design_votes
18. designs
19. fabric_aliases
20. fabrics
21. gear_requests
22. manufacturer_order_assignments
23. manufacturer_users
24. mercadopago_payments
25. mercadopago_preferences
26. notifications_log
27. order_items
28. order_status_history
29. orders
30. payment_contributions
31. payment_events
32. payments
33. player_info_submissions
34. pricing_overrides
35. pricing_tiers
36. pricing_tiers_product
37. product_fabric_recommendations
38. product_images
39. product_types
40. products
41. profiles
42. roster_members
43. shipping_addresses
44. sport_fabric_overrides
45. sports
46. team_invites
47. team_members
48. team_memberships
49. team_ownership_history
50. team_settings
51. teams

---

## Migration Checklist for Institution Implementation

### ✅ Ready to Use As-Is
- [x] `teams` with `team_type='institution'`
- [x] `orders` with payment tracking
- [x] `order_items` with player assignments
- [x] `payment_contributions` for split payments
- [x] `bulk_payments` for AD bulk payments
- [x] `design_requests` with approval workflow
- [x] `team_settings` with configuration

### ✅ Extension Complete (2025-10-12)
- [x] `team_memberships` - ✅ Added `institution_role` column
- [x] `orders` - ✅ Added `sub_team_id` column
- [x] `design_requests` - ✅ Added `sub_team_id` column
- [x] `team_settings` - ✅ Added 5 institution-specific settings

### ✅ Tables Created (2025-10-12)
- [x] `institution_sub_teams` table - ✅ Created with 5 indexes
- [x] `institution_sub_team_members` table - ✅ Created with 3 indexes
- [x] RLS policies for institution tables - ✅ 9 policies created
- [x] Helper functions - ✅ 2 functions created

---

## Unified Member Management Pattern

**Current Implementation (from `/src/app/mi-equipo/[slug]/settings/page.tsx`):**

```typescript
const loadMembers = async (teamId: string) => {
  // 1. Active members
  const { data: membershipsData } = await supabase
    .from('team_memberships')
    .select('role, user_id, created_at')
    .eq('team_id', teamId);

  // 2. Roster players
  const { data: playersData } = await supabase
    .from('player_info_submissions')
    .select('id, player_name, user_id, created_at')
    .eq('team_id', teamId);

  // 3. Pending invites
  const { data: invitesData } = await supabase
    .from('team_invites')
    .select('id, email, status, created_at')
    .eq('team_id', teamId);

  // Combine and show unified list
};
```

---

## Change Log

- **2025-10-12**: ✅ Institution migration applied - 2 new tables created, 4 tables extended, 9 RLS policies, 2 helper functions
- **2025-10-12**: Updated documentation to reflect completed INSTITUTION_SETUP_MIGRATION.sql
- **2025-10-12**: Major update - synced with fresh Supabase export (51 tables documented)
- **2025-10-12**: Added institution implementation requirements and missing tables
- **2025-10-10**: Created initial reference during Phase 3.0 implementation
- **2025-10-10**: Fixed migration 052 - changed `player_info_id` to `player_submission_id`

---

**Document Status:** ✅ Current and validated against production
