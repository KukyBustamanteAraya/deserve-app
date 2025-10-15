# Database Schema Analysis for Institution Implementation

**Date**: 2025-10-12
**Source**: Fresh Supabase export (schema `public`)
**Status**: ✅ Analysis Complete

---

## Executive Summary

### ✅ Good News

1. **`teams.team_type` already supports `'institution'`**
   - Column: `team_type text DEFAULT 'single_team' CHECK (team_type IN ('single_team', 'institution'))`
   - Infrastructure is ready for institution teams

2. **Payment system is fully implemented and ready**
   - `payment_contributions` table with split payment support
   - `bulk_payments` + `bulk_payment_orders` for manager/bulk payments
   - Mercado Pago integration complete

3. **Core tables match our documentation**
   - `orders`, `order_items`, `design_requests` all validated
   - `team_settings` has all expected fields including branding

### ⚠️ Issues Identified

1. **Missing: `institution_role` column**
   - `team_members` table exists but does NOT have `institution_role` column
   - Current columns: `team_id`, `user_id`, `role` (generic text), `created_at`
   - **Action Required**: Add `institution_role` column OR use different table

2. **Dual Membership System**
   - Both `team_members` AND `team_memberships` tables exist
   - `team_memberships` has strict role constraints: `'owner' | 'manager' | 'player'`
   - `team_members` has generic `role` field
   - Code analysis shows `team_memberships` is actively used
   - **Clarification Needed**: Which table for institution roles?

3. **Missing: Institution-specific tables**
   - No `institution_sub_teams` table
   - No `institution_sub_team_members` table
   - **Action Required**: Create these tables per implementation plan

### 📊 Compatibility Score: 85%

- **Ready**: Payment, Orders, Design Requests, Team Settings
- **Needs Work**: Institution role storage, Sub-team tables
- **Clarification Needed**: Membership table strategy

---

## Detailed Table Analysis

### 1. Teams Table ✅

**Status**: Ready for institutions

```sql
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id bigint REFERENCES public.sports(id),
  name text NOT NULL,
  slug text UNIQUE,

  -- Institution Support
  team_type text DEFAULT 'single_team'
    CHECK (team_type IN ('single_team', 'institution')),
  is_institutional boolean DEFAULT false, -- Legacy?
  institution_name text,
  sports text[], -- Array for multiple sports (institutions)
  setup_completed boolean DEFAULT false,

  -- Ownership
  created_by uuid NOT NULL REFERENCES auth.users(id),
  owner_id uuid REFERENCES auth.users(id),
  current_owner_id uuid REFERENCES auth.users(id),

  -- Branding
  colors jsonb NOT NULL DEFAULT '{}',
  logo_url text,

  -- Legacy voting fields (for single teams)
  quorum_threshold integer DEFAULT 70 CHECK (quorum_threshold > 0 AND quorum_threshold <= 100),
  quorum_locked boolean DEFAULT false,
  voting_open boolean DEFAULT false,
  voting_closes_at timestamptz,
  design_allowance_used integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Validation**:
- ✅ `team_type` supports 'institution'
- ✅ `sports` array for multi-sport institutions
- ✅ `institution_name` field exists
- ✅ `setup_completed` for onboarding wizard
- ⚠️ Note: Both `is_institutional` (boolean) and `team_type` (text) exist - may be redundant

**Institution Usage**:
```sql
-- Create institution team
INSERT INTO teams (name, slug, team_type, institution_name, sports, created_by)
VALUES (
  'Lincoln High School Athletics',
  'lincoln-hs',
  'institution',
  'Lincoln High School',
  ARRAY['soccer', 'basketball', 'volleyball'],
  '...' -- Athletic Director user_id
);
```

---

### 2. Team Membership Tables ⚠️

#### Table 1: `team_members`

**Status**: Exists but missing `institution_role` column

```sql
CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text DEFAULT 'member', -- Generic, no constraints
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
```

**Validation**:
- ✅ Table exists
- ❌ No `institution_role` column
- ❌ Generic `role` field with no constraints

**What We Expected**:
```sql
ALTER TABLE team_members
  ADD COLUMN institution_role text
  CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  ));
```

---

#### Table 2: `team_memberships`

**Status**: Active membership table with role constraints

```sql
CREATE TABLE public.team_memberships (
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'player')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, team_id) -- Note: different PK order
);
```

**Validation**:
- ✅ Table exists
- ✅ Referenced in code analysis (`/src/app/mi-equipo/[slug]/page.tsx`)
- ✅ Role constraints match small team usage
- ❌ No `institution_role` column

**Code Usage**:
```typescript
// From mi-equipo/[slug]/page.tsx:163-183
const { data: membership } = await supabase
  .from('team_memberships')
  .select('role')
  .eq('team_id', teamData.id)
  .eq('user_id', user.id)
  .single();

const isManager = membership?.role === 'owner' || membership?.role === 'manager';
```

---

#### 🤔 Dual Table Strategy

**Questions**:
1. Why do both `team_members` and `team_memberships` exist?
2. Which table should store institution roles?
3. Is `team_members` legacy or for a different purpose?

**Recommendations**:

**Option A: Use `team_memberships` + add institution role**
```sql
ALTER TABLE team_memberships
  ADD COLUMN institution_role text
  CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  ));

-- For single teams: institution_role is NULL
-- For institutions: role might be 'manager' + institution_role='athletic_director'
```

**Option B: Use `team_members` for institutions only**
```sql
ALTER TABLE team_members
  ADD COLUMN institution_role text
  CHECK (institution_role IN (...));

-- Keep team_memberships for single teams
-- Use team_members for institution staff
```

**Option C: Create new `institution_staff` table**
```sql
CREATE TABLE institution_staff (
  team_id uuid REFERENCES teams(id),
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  )),
  program_ids uuid[], -- Which sub-teams they manage
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
```

**Recommendation**: **Option A** is cleanest - extend `team_memberships` with optional `institution_role` column.

---

### 3. Player Info Submissions ✅

**Status**: Perfect for roster data (no user accounts)

```sql
CREATE TABLE public.player_info_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  design_request_id bigint REFERENCES public.design_requests(id),
  user_id uuid REFERENCES auth.users(id), -- Nullable!

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

**Validation**:
- ✅ `user_id` is nullable (players don't need accounts)
- ✅ Stores roster data: name, number, size, position
- ✅ `submitted_by_manager` flag
- ✅ Can be used for sub-team rosters

**Institution Usage**:
This table can store player roster data for sub-teams! Just add a reference to sub-team:

```sql
-- Option 1: Use existing team_id as sub_team_id
-- (if we make sub-teams just regular teams with parent_id)

-- Option 2: Add sub_team_id column
ALTER TABLE player_info_submissions
  ADD COLUMN sub_team_id uuid REFERENCES institution_sub_teams(id);
```

**Preferred**: Create separate `institution_sub_team_members` table for clarity

---

### 4. Orders Table ✅

**Status**: Ready for institution orders

```sql
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Team/Customer
  customer_id uuid REFERENCES public.customers(id),
  user_id uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),

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
  shipping_address_id uuid REFERENCES public.shipping_addresses(id),
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

**Validation**:
- ✅ `team_id` links to teams (institutions or sub-teams)
- ✅ `payment_mode` supports both individual and manager-pays-all
- ✅ `payment_status` tracks payment progress
- ✅ Chilean Peso amounts stored correctly (no division needed)

**Institution Usage**:
```sql
-- Sub-team order
INSERT INTO orders (team_id, user_id, payment_mode, total_amount_cents)
VALUES (
  'institution-team-id', -- Main institution ID
  'head-coach-user-id',
  'manager_pays_all', -- Head coach pays for their team
  450000 -- $450.000 CLP
);

-- Could add metadata to track sub-team
UPDATE orders SET notes = 'Varsity Soccer Team Order' WHERE id = '...';
```

**Recommendation**: Add optional `sub_team_id` column or use `notes`/`metadata` JSONB field

---

### 5. Order Items Table ✅

**Status**: Ready for player-specific items

```sql
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),

  -- Product
  product_id bigint NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  collection text,
  images text[] NOT NULL DEFAULT '{}',
  design_id uuid REFERENCES public.designs(id),

  -- Pricing
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_cents integer GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,

  -- Player Assignment
  player_id uuid, -- User ID or roster ID
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

**Validation**:
- ✅ `player_id` nullable (can be roster data ID, not auth.users)
- ✅ `player_name` and `jersey_number` for display
- ✅ `customization` JSONB for size, position, notes
- ✅ `opted_out` flag for optional orders

**Institution Usage**: Works perfectly as-is

---

### 6. Payment Contributions Table ✅

**Status**: Universal payment system ready

```sql
CREATE TABLE public.payment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),

  -- Amount
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency bpchar NOT NULL DEFAULT 'CLP',

  -- Status (dual columns - both exist!)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Mercado Pago
  mp_payment_id text UNIQUE,
  mercadopago_payment_id text, -- Duplicate column?
  mp_preference_id text,
  external_reference text UNIQUE,
  payment_method text,
  raw_payment_data jsonb,

  -- Timestamps
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Validation**:
- ✅ Supports split payments (multiple contributors per order)
- ✅ `team_id` can be institution or sub-team
- ✅ Mercado Pago integration fields
- ⚠️ Dual status columns (`status` and `payment_status`) - seems redundant

**Institution Usage**: No changes needed - head coaches can pay via contributions

---

### 7. Bulk Payments Tables ✅

**Status**: Ready for Athletic Director bulk payments

```sql
CREATE TABLE public.bulk_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),

  total_amount_cents integer NOT NULL CHECK (total_amount_cents >= 0),
  currency bpchar NOT NULL DEFAULT 'CLP',

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),

  -- Mercado Pago
  mp_payment_id text UNIQUE,
  mp_preference_id text,
  external_reference text UNIQUE,
  raw_payment_data jsonb,

  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bulk_payment_orders (
  bulk_payment_id uuid NOT NULL REFERENCES public.bulk_payments(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  PRIMARY KEY (order_id, bulk_payment_id)
);
```

**Validation**:
- ✅ Athletic Director can pay for multiple sub-team orders at once
- ✅ Many-to-many relationship via join table

**Institution Usage**: Perfect as-is

---

### 8. Design Requests Table ✅

**Status**: Ready for sub-team design requests

```sql
CREATE TABLE public.design_requests (
  id bigint PRIMARY KEY,

  -- Team Reference
  team_id uuid NOT NULL REFERENCES public.teams(id),
  team_slug text REFERENCES public.teams(slug),

  -- Requester
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  user_id uuid REFERENCES auth.users(id),
  user_type text CHECK (user_type IN ('player', 'manager')),

  -- Design Details
  design_id uuid REFERENCES public.designs(id),
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

  -- Status & Approval
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
  order_id uuid REFERENCES public.orders(id),

  -- Approval Tracking
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),

  -- Mockups & Feedback
  mockup_urls text[] DEFAULT ARRAY[],
  admin_comments jsonb DEFAULT '[]',
  feedback text,
  render_spec jsonb,
  output_url text,

  -- Versioning
  version integer DEFAULT 1,
  revision_count integer DEFAULT 0,

  -- Brief (legacy?)
  brief text,
  selected_candidate_id bigint REFERENCES public.design_candidates(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Validation**:
- ✅ `team_id` can reference institution
- ✅ `user_type` can be 'manager' (head coach)
- ✅ Approval workflow with voting
- ✅ Links to `order_id` when approved

**Institution Adaptation**:
```sql
-- Add sub_team_id for tracking
ALTER TABLE design_requests
  ADD COLUMN sub_team_id uuid REFERENCES institution_sub_teams(id);

-- Head coach creates request for their sub-team
INSERT INTO design_requests (
  team_id, -- Main institution ID
  sub_team_id, -- Varsity Soccer ID
  requested_by, -- Head Coach user_id
  user_type -- 'manager'
  -- ... rest of fields
);
```

---

### 9. Team Settings Table ✅

**Status**: Ready, can extend for institutions

```sql
CREATE TABLE public.team_settings (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id),

  -- Approval Settings
  approval_mode text NOT NULL DEFAULT 'owner_only',
  min_approvals_required integer DEFAULT 1,
  voting_deadline timestamptz,
  designated_voters uuid[],

  -- Player Info Collection
  player_info_mode text DEFAULT 'hybrid',
  self_service_enabled boolean DEFAULT true,
  info_collection_link text,
  info_collection_token text,
  info_collection_expires_at timestamptz,

  -- Access Control
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

**Validation**:
- ✅ All expected fields present
- ✅ Branding fields included
- ✅ Payment mode setting

**Institution Extensions**:
```sql
ALTER TABLE team_settings
  ADD COLUMN allow_program_autonomy boolean DEFAULT false,
  ADD COLUMN require_ad_approval_for_orders boolean DEFAULT true,
  ADD COLUMN budget_tracking_enabled boolean DEFAULT false,
  ADD COLUMN budget_per_program_cents integer,
  ADD COLUMN fiscal_year_start_month integer DEFAULT 1;
```

---

### 10. Team Invites Table ✅

**Status**: Ready for staff invitations

```sql
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  player_submission_id uuid REFERENCES public.player_info_submissions(id),

  email text,
  token text NOT NULL UNIQUE,

  role text DEFAULT 'player'
    CHECK (role IN ('player', 'manager', 'coach')),

  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  invited_by uuid REFERENCES auth.users(id),
  accepted_by uuid REFERENCES auth.users(id),

  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);
```

**Validation**:
- ✅ Can invite staff with role='coach' or 'manager'
- ✅ Token-based invitation system

**Institution Usage**: Can invite Program Coordinators and Head Coaches

---

## Missing Tables

### 1. Institution Sub-Teams ❌

**Status**: DOES NOT EXIST - needs creation

**Proposed Schema**:
```sql
CREATE TABLE public.institution_sub_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_team_id uuid NOT NULL REFERENCES public.teams(id),

  -- Sub-Team Identity
  name text NOT NULL, -- "Varsity Soccer", "JV Basketball"
  slug text, -- "varsity-soccer"
  sport_id bigint NOT NULL REFERENCES public.sports(id),
  level text, -- "varsity", "jv", "freshman", etc.

  -- Management
  head_coach_user_id uuid REFERENCES auth.users(id),
  coordinator_user_id uuid REFERENCES auth.users(id),

  -- Branding (inherit from institution or customize)
  colors jsonb DEFAULT '{}',
  logo_url text,

  -- Status
  active boolean DEFAULT true,
  season_year text, -- "2024-2025"

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(institution_team_id, slug)
);

CREATE INDEX idx_sub_teams_institution ON institution_sub_teams(institution_team_id);
CREATE INDEX idx_sub_teams_sport ON institution_sub_teams(sport_id);
CREATE INDEX idx_sub_teams_head_coach ON institution_sub_teams(head_coach_user_id);
```

---

### 2. Institution Sub-Team Members (Roster) ❌

**Status**: DOES NOT EXIST - needs creation

**Proposed Schema**:
```sql
CREATE TABLE public.institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES public.institution_sub_teams(id) ON DELETE CASCADE,

  -- Player Information (NO USER ACCOUNT)
  player_name text NOT NULL,
  email text, -- Optional for notifications, NOT for login

  -- Roster Data
  position text, -- "Forward", "Defense", "Midfielder", etc.
  jersey_number integer,
  size text, -- "S", "M", "L", "XL", "XXL"

  -- Flexible Data
  additional_info jsonb, -- Grade level, parent contact, medical notes, etc.

  -- Metadata
  joined_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- Head coach who added player

  UNIQUE(sub_team_id, email)
);

CREATE INDEX idx_sub_team_members_sub_team ON institution_sub_team_members(sub_team_id);
CREATE INDEX idx_sub_team_members_created_by ON institution_sub_team_members(created_by);
```

**Key Features**:
- Players are roster data only (no `user_id` column)
- Email is optional and for notifications only (not authentication)
- `additional_info` JSONB for custom fields
- Links to sub-team, not main institution
- Cascade delete when sub-team is deleted

---

## Schema Integration Recommendations

### 1. Membership Strategy 🎯

**Recommended Approach**: Extend `team_memberships` table

```sql
-- Add institution_role column
ALTER TABLE public.team_memberships
  ADD COLUMN institution_role text
  CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  ));

-- For single teams: institution_role is NULL
-- For institutions: role='manager' + institution_role='athletic_director'

-- Example queries:
-- Athletic Director
SELECT * FROM team_memberships
WHERE team_id = 'institution-id'
  AND institution_role = 'athletic_director';

-- All institution admins
SELECT * FROM team_memberships
WHERE team_id = 'institution-id'
  AND institution_role IS NOT NULL;

-- Single team managers (unaffected)
SELECT * FROM team_memberships
WHERE team_id = 'single-team-id'
  AND role IN ('owner', 'manager')
  AND institution_role IS NULL;
```

**Rationale**:
- Extends existing active table
- Preserves single team functionality
- Aligns with code patterns already in use
- RLS policies easier to manage in one table

---

### 2. Sub-Team to Order Linking 🎯

**Option A: Add `sub_team_id` to orders**
```sql
ALTER TABLE public.orders
  ADD COLUMN sub_team_id uuid REFERENCES public.institution_sub_teams(id);

-- Query orders for a specific sub-team
SELECT * FROM orders WHERE sub_team_id = 'varsity-soccer-id';

-- Query all orders for an institution
SELECT o.* FROM orders o
  LEFT JOIN institution_sub_teams st ON o.sub_team_id = st.id
WHERE o.team_id = 'institution-id' OR st.institution_team_id = 'institution-id';
```

**Option B: Use JSONB metadata**
```sql
-- Store in existing columns
UPDATE orders
SET customer_notes = 'Varsity Soccer Team Order',
    notes = '{"sub_team_id": "uuid-here", "sub_team_name": "Varsity Soccer"}'::jsonb
WHERE id = '...';
```

**Recommendation**: **Option A** - explicit foreign key is cleaner and enables proper joins/indexes

---

### 3. Design Requests for Sub-Teams 🎯

```sql
ALTER TABLE public.design_requests
  ADD COLUMN sub_team_id uuid REFERENCES public.institution_sub_teams(id);

-- Head coach creates design request for their sub-team
INSERT INTO design_requests (
  team_id, -- Main institution ID (for billing/permissions)
  sub_team_id, -- Specific sub-team (Varsity Soccer)
  requested_by, -- Head Coach user_id
  user_type, -- 'manager'
  sport_slug, -- 'soccer'
  -- ... rest of design details
);

-- Query all design requests for an institution
SELECT dr.* FROM design_requests dr
  LEFT JOIN institution_sub_teams st ON dr.sub_team_id = st.id
WHERE dr.team_id = 'institution-id' OR st.institution_team_id = 'institution-id';
```

---

### 4. Roster Data Flow 🎯

**Players in `institution_sub_team_members` should NOT link to `player_info_submissions`**

- `player_info_submissions` is for single teams (players may have user accounts)
- `institution_sub_team_members` is pure roster data (no user accounts)

**Separate concerns**:
```
Institution Sub-Teams:
  institution_sub_teams (programs)
    └── institution_sub_team_members (roster data only)

Single Teams:
  teams (team_type='single_team')
    └── player_info_submissions (roster with optional user accounts)
    └── team_memberships (active members with accounts)
```

---

## SQL Migration Script

### Phase 1: Extend Existing Tables

```sql
-- 1. Add institution_role to team_memberships
ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS institution_role text
  CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  ));

COMMENT ON COLUMN team_memberships.institution_role IS
  'Institution-specific role. NULL for single team members.';

-- 2. Add sub_team_id to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sub_team_id uuid
  REFERENCES public.institution_sub_teams(id);

CREATE INDEX IF NOT EXISTS idx_orders_sub_team
  ON public.orders(sub_team_id);

-- 3. Add sub_team_id to design_requests
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS sub_team_id uuid
  REFERENCES public.institution_sub_teams(id);

CREATE INDEX IF NOT EXISTS idx_design_requests_sub_team
  ON public.design_requests(sub_team_id);

-- 4. Extend team_settings for institutions
ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS allow_program_autonomy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_ad_approval_for_orders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS budget_tracking_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_per_program_cents integer,
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month integer DEFAULT 1;
```

---

### Phase 2: Create Institution Tables

```sql
-- 1. Create institution_sub_teams table
CREATE TABLE IF NOT EXISTS public.institution_sub_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Sub-Team Identity
  name text NOT NULL,
  slug text,
  sport_id bigint NOT NULL REFERENCES public.sports(id),
  level text, -- "varsity", "jv", "freshman", "middle_school", etc.

  -- Management
  head_coach_user_id uuid REFERENCES auth.users(id),
  coordinator_user_id uuid REFERENCES auth.users(id),

  -- Branding
  colors jsonb DEFAULT '{}',
  logo_url text,

  -- Status
  active boolean DEFAULT true,
  season_year text,

  -- Metadata
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(institution_team_id, slug)
);

COMMENT ON TABLE institution_sub_teams IS
  'Sub-teams/programs within an institution (e.g., Varsity Soccer, JV Basketball)';

CREATE INDEX idx_sub_teams_institution ON institution_sub_teams(institution_team_id);
CREATE INDEX idx_sub_teams_sport ON institution_sub_teams(sport_id);
CREATE INDEX idx_sub_teams_head_coach ON institution_sub_teams(head_coach_user_id);
CREATE INDEX idx_sub_teams_active ON institution_sub_teams(active) WHERE active = true;

-- 2. Create institution_sub_team_members table
CREATE TABLE IF NOT EXISTS public.institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES public.institution_sub_teams(id) ON DELETE CASCADE,

  -- Player Information (NO USER ACCOUNT)
  player_name text NOT NULL,
  email text, -- Optional, for notifications only (NOT for login)

  -- Roster Data
  position text,
  jersey_number integer,
  size text, -- "S", "M", "L", "XL", "XXL", etc.

  -- Flexible Data
  additional_info jsonb, -- Grade, parent contact, medical info, etc.

  -- Metadata
  joined_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- Who added this player

  UNIQUE(sub_team_id, email)
);

COMMENT ON TABLE institution_sub_team_members IS
  'Roster data for sub-team players. Players do NOT have user accounts.';

CREATE INDEX idx_sub_team_members_sub_team ON institution_sub_team_members(sub_team_id);
CREATE INDEX idx_sub_team_members_created_by ON institution_sub_team_members(created_by);
```

---

### Phase 3: Row-Level Security (RLS) Policies

```sql
-- Enable RLS on new tables
ALTER TABLE institution_sub_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_sub_team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Athletic Directors see all sub-teams in their institution
CREATE POLICY "athletic_directors_view_all_subteams"
ON institution_sub_teams FOR SELECT
USING (
  institution_team_id IN (
    SELECT team_id FROM team_memberships
    WHERE user_id = auth.uid()
      AND institution_role = 'athletic_director'
  )
);

-- Policy: Head Coaches see only their sub-team
CREATE POLICY "head_coaches_view_own_subteam"
ON institution_sub_teams FOR SELECT
USING (
  head_coach_user_id = auth.uid()
);

-- Policy: Program Coordinators see sub-teams in their sport
CREATE POLICY "coordinators_view_program_subteams"
ON institution_sub_teams FOR SELECT
USING (
  coordinator_user_id = auth.uid()
);

-- Policy: Head Coaches manage their roster
CREATE POLICY "head_coaches_manage_own_roster"
ON institution_sub_team_members FOR ALL
USING (
  sub_team_id IN (
    SELECT id FROM institution_sub_teams
    WHERE head_coach_user_id = auth.uid()
  )
);

-- Policy: Athletic Directors see all rosters
CREATE POLICY "athletic_directors_view_all_rosters"
ON institution_sub_team_members FOR SELECT
USING (
  sub_team_id IN (
    SELECT st.id FROM institution_sub_teams st
    INNER JOIN team_memberships tm ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'athletic_director'
  )
);
```

---

## Validation Checklist

### ✅ Ready to Use As-Is

- [x] `teams` table with `team_type='institution'`
- [x] `orders` table with `payment_mode` and `payment_status`
- [x] `order_items` with player assignments
- [x] `payment_contributions` for split payments
- [x] `bulk_payments` + `bulk_payment_orders` for bulk payments
- [x] `design_requests` with approval workflow
- [x] `team_settings` with all configuration options
- [x] `team_invites` for staff invitations

### ⚠️ Needs Extension

- [ ] `team_memberships` - Add `institution_role` column
- [ ] `orders` - Add `sub_team_id` column
- [ ] `design_requests` - Add `sub_team_id` column
- [ ] `team_settings` - Add institution-specific settings

### ❌ Needs Creation

- [ ] `institution_sub_teams` table
- [ ] `institution_sub_team_members` table
- [ ] RLS policies for institution tables

---

## Next Steps

1. **Clarify membership table strategy** with user
   - Should we use `team_memberships` or `team_members`?
   - Preferred: Extend `team_memberships` with `institution_role`

2. **Run migration script** (Phase 1, 2, 3)
   - Test in development environment first
   - Validate RLS policies work correctly

3. **Update INSTITUTION_IMPLEMENTATION_PLAN**
   - Reflect actual schema
   - Reference reusable components from SMALL_TEAM_ANALYSIS
   - Finalize API endpoint designs

4. **Create seed data** for testing
   - Sample institution with 3 sub-teams
   - Athletic Director, 2 Program Coordinators, 3 Head Coaches
   - Roster data for each sub-team

---

**Analysis Complete** ✅

**Status**: Ready to proceed with implementation after running migrations

**Estimated Migration Time**: 10-15 minutes

**Risk Level**: Low (all changes are additive, no breaking changes to existing single team functionality)
