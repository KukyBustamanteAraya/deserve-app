# Institution Implementation - Architectural Decisions Archive

**⚠️ ARCHIVED - HISTORICAL REFERENCE ONLY**

**Purpose**: This document preserves the architectural decision-making process and rationale for the institution team management feature implementation.

**Date**: 2025-10-12
**Status**: ✅ All decisions implemented - Database migration complete
**Based on**: Fresh schema analysis + Small team codebase analysis

---

## 🔒 Archive Notice

This document is **no longer actively maintained**. It serves as historical reference for:
- Understanding **why** certain architectural choices were made
- Reviewing the decision-making process and trade-offs
- Reference for future similar design decisions

**For current implementation status**, see:
- `MASTER_IMPLEMENTATION_PLAN.md` - Overall project progress
- `INSTITUTION_IMPLEMENTATION_PLAN.md` - Detailed implementation roadmap
- `CURRENT_DATABASE_SCHEMA.md` - Live database schema reference

---

## Executive Summary

After analyzing the production database schema and existing small team implementation, we refined the institution implementation with:

1. ✅ **85% of infrastructure already exists** - payment system, orders, design requests all ready
2. ✅ **3 critical decisions APPROVED** - All Option A recommendations accepted
3. ✅ **Database migration COMPLETE (2025-10-12)** - All tables created, RLS policies active
4. 📦 **20+ reusable components identified** - can start building UI immediately

---

## Critical Decisions Status

### ✅ Decision 1: Membership Table Strategy - APPROVED & IMPLEMENTED

**Problem**: Two membership tables exist: `team_members` and `team_memberships`

**Current State**:
- `team_memberships` - Actively used in code, has role constraints ('owner', 'manager', 'player')
- `team_members` - Generic role field, purpose unclear

**Options**:

#### **Option A: Extend `team_memberships` (RECOMMENDED)**
```sql
ALTER TABLE team_memberships
  ADD COLUMN institution_role text
  CHECK (institution_role IN ('athletic_director', 'program_coordinator', 'head_coach', 'assistant'));
```

**Pros**:
- ✅ Uses actively maintained table
- ✅ Preserves existing single team functionality
- ✅ Code already references this table
- ✅ Easier RLS policies (one table)

**Cons**:
- ⚠️ Mixing single team and institution concepts in one table

**Example Usage**:
```typescript
// Single team manager
{ team_id: 'uuid', user_id: 'uuid', role: 'manager', institution_role: null }

// Athletic Director
{ team_id: 'inst-uuid', user_id: 'uuid', role: 'manager', institution_role: 'athletic_director' }

// Head Coach
{ team_id: 'inst-uuid', user_id: 'uuid', role: 'manager', institution_role: 'head_coach' }
```

---

#### **Option B: Use `team_members` for institutions only**
```sql
ALTER TABLE team_members
  ADD COLUMN institution_role text
  CHECK (institution_role IN ('athletic_director', 'program_coordinator', 'head_coach', 'assistant'));
```

**Pros**:
- ✅ Clean separation: `team_memberships` for single teams, `team_members` for institutions

**Cons**:
- ❌ Need to update all code to check both tables
- ❌ More complex queries and RLS policies
- ❌ Unclear if `team_members` has existing data/purpose

---

#### **Option C: Create new `institution_staff` table**
```sql
CREATE TABLE institution_staff (
  team_id uuid REFERENCES teams(id),
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('athletic_director', 'program_coordinator', 'head_coach', 'assistant')),
  program_ids uuid[], -- Which sub-teams they manage
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
```

**Pros**:
- ✅ Cleanest separation
- ✅ Institution-specific fields (like `program_ids`)

**Cons**:
- ❌ Another table to maintain
- ❌ More code changes needed

---

**✅ APPROVED DECISION**: **Option A** - Extend `team_memberships` with `institution_role` column
**Status**: ✅ Implemented in migration (2025-10-12)

---

### ✅ Decision 2: Sub-Team to Order Linking - APPROVED & IMPLEMENTED

**Options**:

#### **Option A: Add `sub_team_id` to `orders` table (RECOMMENDED)**
```sql
ALTER TABLE orders
  ADD COLUMN sub_team_id uuid REFERENCES institution_sub_teams(id);

CREATE INDEX idx_orders_sub_team ON orders(sub_team_id);
```

**Pros**:
- ✅ Explicit foreign key relationship
- ✅ Enables efficient queries and joins
- ✅ Database enforces referential integrity

**Query Example**:
```sql
-- All orders for a specific sub-team
SELECT * FROM orders WHERE sub_team_id = 'varsity-soccer-id';

-- All orders for entire institution
SELECT o.* FROM orders o
  LEFT JOIN institution_sub_teams st ON o.sub_team_id = st.id
WHERE o.team_id = 'institution-id' OR st.institution_team_id = 'institution-id';
```

---

#### **Option B: Use JSONB metadata in existing columns**
```sql
-- Store in notes or customer_notes
UPDATE orders
SET customer_notes = '{"sub_team_id": "uuid", "sub_team_name": "Varsity Soccer"}'::jsonb
WHERE id = '...';
```

**Pros**:
- ✅ No schema changes needed

**Cons**:
- ❌ No foreign key constraints
- ❌ Harder to query
- ❌ No database-level validation

---

**✅ APPROVED DECISION**: **Option A** - Add `sub_team_id` column to `orders` and `design_requests` tables
**Status**: ✅ Implemented in migration (2025-10-12)

---

### ✅ Decision 3: Roster Data Table Strategy - APPROVED & IMPLEMENTED

**Options**:

#### **Option A: Create separate `institution_sub_team_members` table (RECOMMENDED)**
```sql
CREATE TABLE institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES institution_sub_teams(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  email text,
  position text,
  jersey_number integer,
  size text,
  additional_info jsonb,
  joined_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(sub_team_id, email)
);
```

**Pros**:
- ✅ Clear separation: `player_info_submissions` for single teams, `institution_sub_team_members` for institutions
- ✅ No risk of breaking single team functionality
- ✅ Institution-specific fields and constraints

**Cons**:
- ⚠️ Another table to maintain

---

#### **Option B: Reuse `player_info_submissions` with `sub_team_id`**
```sql
ALTER TABLE player_info_submissions
  ADD COLUMN sub_team_id uuid REFERENCES institution_sub_teams(id);
```

**Pros**:
- ✅ Reuses existing table

**Cons**:
- ❌ Mixing single team and institution roster data
- ❌ `team_id` would reference institution (parent) while `sub_team_id` references actual team
- ❌ Confusing data model

---

**✅ APPROVED DECISION**: **Option A** - Create separate `institution_sub_team_members` table
**Status**: ✅ Implemented in migration (2025-10-12)

---

## Database Schema - IMPLEMENTED (2025-10-12)

### Assuming Recommended Options (A, A, A)

#### Phase 1: Extend Existing Tables

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

COMMENT ON COLUMN team_settings.allow_program_autonomy IS
  'If true, head coaches can approve designs without AD approval.';
COMMENT ON COLUMN team_settings.require_ad_approval_for_orders IS
  'If true, all orders must be approved by Athletic Director before production.';
COMMENT ON COLUMN team_settings.budget_tracking_enabled IS
  'Enable budget tracking per program.';
```

---

#### Phase 2: Create Institution Tables

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

  -- Branding (can inherit from institution or customize)
  colors jsonb DEFAULT '{}',
  logo_url text,

  -- Status
  active boolean DEFAULT true,
  season_year text, -- "2024-2025"

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
CREATE INDEX idx_sub_teams_coordinator ON institution_sub_teams(coordinator_user_id);
CREATE INDEX idx_sub_teams_active ON institution_sub_teams(active) WHERE active = true;

-- 2. Create institution_sub_team_members table
CREATE TABLE IF NOT EXISTS public.institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES public.institution_sub_teams(id) ON DELETE CASCADE,

  -- Player Information (NO USER ACCOUNT)
  player_name text NOT NULL,
  email text, -- Optional, for notifications only (NOT for login)

  -- Roster Data
  position text, -- "Forward", "Defense", "Midfielder", etc.
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

#### Phase 3: Row-Level Security (RLS) Policies

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

-- Policy: Athletic Directors can manage all sub-teams
CREATE POLICY "athletic_directors_manage_all_subteams"
ON institution_sub_teams FOR ALL
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

-- Policy: Head Coaches manage only their sub-team
CREATE POLICY "head_coaches_manage_own_subteam"
ON institution_sub_teams FOR UPDATE
USING (
  head_coach_user_id = auth.uid()
);

-- Policy: Program Coordinators see sub-teams they coordinate
CREATE POLICY "coordinators_view_coordinated_subteams"
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

-- Policy: Athletic Directors see all rosters in their institution
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

-- Policy: Program Coordinators see rosters for their coordinated programs
CREATE POLICY "coordinators_view_coordinated_rosters"
ON institution_sub_team_members FOR SELECT
USING (
  sub_team_id IN (
    SELECT id FROM institution_sub_teams
    WHERE coordinator_user_id = auth.uid()
  )
);
```

---

## Reusable Components from Small Team Analysis

### ✅ Ready to Use As-Is (No Changes Needed)

**File Location**: `/src/components/team/`

1. **PaymentProgressCard** - Show sub-team order payment status
   ```typescript
   <PaymentProgressCard
     totalCents={order.total_amount_cents}
     paidCents={totalPaid}
     pendingCents={order.total_amount_cents - totalPaid}
     contributorCount={subTeamMembers.length}
     paidCount={paidContributions.length}
   />
   ```

2. **PaymentContributorsList** - Show which coaches/coordinators paid
   ```typescript
   <PaymentContributorsList
     contributions={contributions}
     totalContributors={totalContributors}
   />
   ```

3. **OrderItemsList** - Display sub-team order items
   ```typescript
   <OrderItemsList items={order.items} />
   ```

4. **MiniFieldMap** - Visualize sub-team rosters (supports 7+ sports)
   ```typescript
   <MiniFieldMap
     sport={subTeam.sport_slug}
     players={rosterMembers}
     onPlayerClick={(player) => setSelectedPlayer(player)}
   />
   ```

5. **PlayerDetailModal** - View player roster details
   ```typescript
   <PlayerDetailModal
     player={selectedPlayer}
     isOpen={modalOpen}
     onClose={() => setModalOpen(false)}
   />
   ```

6. **CompletionBar** - Track roster completion, payment progress
   ```typescript
   <CompletionBar
     percentage={rosterCompletionPercentage}
     label="Roster Completion"
     color={institutionPrimaryColor}
   />
   ```

7. **formatCLP()** - Chilean Peso formatting
   ```typescript
   import { formatCLP } from '@/types/payments';
   const displayPrice = formatCLP(45000); // "$45.000"
   ```

8. **getPaymentStatusColor()** - Status badge styling
   ```typescript
   import { getPaymentStatusColor } from '@/types/payments';
   <span className={getPaymentStatusColor(contribution.payment_status)}>
     {contribution.payment_status}
   </span>
   ```

---

### ⚠️ Components to Adapt (Minor Changes)

1. **DesignApprovalModal**
   - **Change Needed**: Add multi-level approval workflow
   - **Current**: Manager approves → creates order
   - **Institution**: Head Coach → Program Coordinator → Athletic Director → creates order

2. **Team Dashboard** (`/src/app/mi-equipo/[slug]/page.tsx`)
   - **Change Needed**: Build out institution dashboard
   - **Infrastructure Already Exists**:
     ```typescript
     if (team.team_type === 'institution') {
       return <InstitutionDashboard team={team} />;
     }
     return <SingleTeamDashboard team={team} />;
     ```

3. **Settings Page** (`/src/app/mi-equipo/[slug]/settings/page.tsx`)
   - **Change Needed**: Add institution-specific settings UI
   - **Extend existing settings form with**:
     - Allow program autonomy checkbox
     - Require AD approval for orders checkbox
     - Budget tracking toggle

---

### 🆕 New Components Needed

1. **InstitutionDashboard** - Overview of all programs, budgets, orders
2. **SubTeamList** - Grid/list of all sub-teams with stats
3. **SubTeamCard** - Individual sub-team summary card
4. **RosterImportWizard** - CSV upload for bulk player data
5. **BudgetTracker** - Track spending per program
6. **ApprovalWorkflowVisualizer** - Show approval chain (Coach → Coordinator → AD)
7. **ProgramHierarchyTree** - Visual org chart

---

## API Routes to Create

### Institution Management

```typescript
// 1. Create institution
POST /api/institutions/create
Body: {
  name: string;
  institution_name: string;
  sports: string[];
  created_by: string; // Athletic Director user_id
}
Response: { institution: Team }

// 2. Create sub-team
POST /api/institutions/[id]/sub-teams
Body: {
  name: string;
  sport_id: number;
  level: string;
  head_coach_user_id?: string;
}
Response: { subTeam: InstitutionSubTeam }

// 3. Import roster CSV
POST /api/institutions/[id]/sub-teams/[subTeamId]/roster/import
Body: FormData with CSV file
CSV Format: player_name, email, position, jersey_number, size, grade
Response: { imported: number; errors: string[] }

// 4. Dashboard stats
GET /api/institutions/[id]/dashboard-stats
Response: {
  totalPrograms: number;
  totalMembers: number;
  activeOrders: number;
  totalSpentCents: number;
  pendingDesignRequests: number;
}

// 5. Bulk approve orders (Athletic Director)
POST /api/institutions/[id]/bulk-approve-orders
Body: { orderIds: string[] }
Response: { approved: number; failed: string[] }

// 6. Budget report
GET /api/institutions/[id]/budget-report
Query: ?fiscalYear=2024-2025
Response: {
  programs: Array<{
    subTeamId: string;
    name: string;
    budgetCents: number;
    spentCents: number;
    remainingCents: number;
  }>;
}
```

---

### Sub-Team Management

```typescript
// 1. Get sub-team details
GET /api/sub-teams/[id]
Response: {
  subTeam: InstitutionSubTeam;
  rosterCount: number;
  activeOrders: Order[];
  designRequests: DesignRequest[];
}

// 2. Update sub-team
PATCH /api/sub-teams/[id]
Body: Partial<InstitutionSubTeam>
Response: { subTeam: InstitutionSubTeam }

// 3. Add roster member
POST /api/sub-teams/[id]/roster
Body: {
  player_name: string;
  email?: string;
  position?: string;
  jersey_number?: number;
  size?: string;
}
Response: { member: InstitutionSubTeamMember }

// 4. Update roster member
PATCH /api/sub-teams/[id]/roster/[memberId]
Body: Partial<InstitutionSubTeamMember>
Response: { member: InstitutionSubTeamMember }

// 5. Delete roster member
DELETE /api/sub-teams/[id]/roster/[memberId]
Response: { success: boolean }
```

---

## Implementation Phases

### Phase 1: Database Setup (Day 1) - 2 hours

**Tasks**:
1. Run Phase 1 migrations (extend existing tables)
2. Run Phase 2 migrations (create institution tables)
3. Run Phase 3 migrations (RLS policies)
4. Verify with `/api/dev/schema-info` endpoint
5. Test policies with sample data

**Deliverables**:
- ✅ All tables created
- ✅ RLS policies active
- ✅ Sample institution with 2-3 sub-teams

---

### Phase 2: Core API Routes (Days 2-3) - 2 days

**Tasks**:
1. Create `POST /api/institutions/create`
2. Create `POST /api/institutions/[id]/sub-teams`
3. Create `GET /api/sub-teams/[id]`
4. Create `POST /api/sub-teams/[id]/roster` (add member)
5. Create `PATCH /api/sub-teams/[id]/roster/[memberId]` (update member)

**Deliverables**:
- ✅ Institution creation works
- ✅ Sub-team CRUD operations
- ✅ Roster management API

---

### Phase 3: Institution Dashboard UI (Days 4-6) - 3 days

**Tasks**:
1. Create `InstitutionDashboard` component
2. Create `SubTeamList` component
3. Create `SubTeamCard` component
4. Update team dashboard to route based on `team_type`
5. Fetch and display dashboard stats

**Deliverables**:
- ✅ Athletic Director sees overview of all programs
- ✅ Stats cards (programs, members, orders, budget)
- ✅ Sub-team grid with quick actions

---

### Phase 4: Sub-Team Management UI (Days 7-9) - 3 days

**Tasks**:
1. Create sub-team detail page
2. Create roster management interface (table view)
3. Add/edit/delete roster members
4. Integrate `MiniFieldMap` for visualization
5. Integrate `PlayerDetailModal` for details

**Deliverables**:
- ✅ Head Coach can manage their roster
- ✅ Visual field map showing players
- ✅ Add/edit player forms

---

### Phase 5: CSV Import (Day 10) - 1 day

**Tasks**:
1. Create `RosterImportWizard` component
2. Create `POST /api/.../roster/import` endpoint
3. Parse CSV and validate data
4. Bulk insert roster members
5. Show import results (success/errors)

**Deliverables**:
- ✅ Upload CSV button
- ✅ Preview import data
- ✅ Error handling with user feedback

---

### Phase 6: Design Request Flow (Days 11-13) - 3 days

**Tasks**:
1. Extend design request wizard to accept `sub_team_id`
2. Update `DesignApprovalModal` for multi-level approval
3. Create approval workflow UI
4. Update design request list to filter by sub-team

**Deliverables**:
- ✅ Head Coach creates design for their sub-team
- ✅ Program Coordinator reviews
- ✅ Athletic Director approves
- ✅ Order auto-created on final approval

---

### Phase 7: Order & Payment Integration (Days 14-16) - 3 days

**Tasks**:
1. Link orders to sub-teams via `sub_team_id`
2. Create order list filtered by sub-team
3. Integrate existing payment components
4. Test head coach paying for sub-team order
5. Test Athletic Director bulk payment

**Deliverables**:
- ✅ Orders linked to specific sub-teams
- ✅ Head Coach can pay for their team
- ✅ Athletic Director can pay for multiple teams at once
- ✅ Payment progress tracked per sub-team

---

### Phase 8: Settings & Polish (Days 17-18) - 2 days

**Tasks**:
1. Extend team settings page with institution settings
2. Create budget tracking UI (if enabled)
3. Polish all UIs with loading states, error handling
4. Add help text and tooltips
5. Mobile responsiveness check

**Deliverables**:
- ✅ Institution settings configurable
- ✅ Budget tracking (optional feature)
- ✅ All features responsive and polished

---

### Phase 9: Testing & Documentation (Days 19-20) - 2 days

**Tasks**:
1. End-to-end testing of full flow
2. Test all role permissions (AD, Coordinator, Coach)
3. Load testing with large rosters
4. Update user documentation
5. Create admin guide

**Deliverables**:
- ✅ All features tested
- ✅ Documentation complete
- ✅ Ready for production

---

## Total Timeline: **20 days (4 weeks)**

---

## Role-Based Access Summary

### Athletic Director
**Can**:
- ✅ Create institution
- ✅ Create sub-teams
- ✅ Assign head coaches and coordinators
- ✅ View all sub-teams and rosters
- ✅ View all orders and payments
- ✅ Approve design requests (final approval)
- ✅ Pay for multiple orders at once (bulk payment)
- ✅ Configure institution settings
- ✅ Track budgets across all programs

**Cannot**:
- ❌ Directly edit rosters (head coach responsibility)

---

### Program Coordinator
**Can**:
- ✅ View assigned sub-teams
- ✅ View rosters for assigned sub-teams
- ✅ Review design requests (middle approval)
- ✅ Track progress for assigned programs
- ✅ Communicate with head coaches

**Cannot**:
- ❌ Create sub-teams
- ❌ Edit rosters
- ❌ Give final approval for orders
- ❌ Access other programs not assigned to them

---

### Head Coach
**Can**:
- ✅ View own sub-team only
- ✅ Manage roster (add/edit/delete players)
- ✅ Import roster via CSV
- ✅ Create design requests for their team
- ✅ View orders for their team
- ✅ Pay for their team's orders (individual or full)

**Cannot**:
- ❌ View other sub-teams
- ❌ Give final approval for designs
- ❌ Create new sub-teams
- ❌ Modify institution settings

---

### Assistant (Future Enhancement)
**Can**:
- ✅ View assigned sub-team
- ✅ Help head coach manage roster
- ✅ View orders

**Cannot**:
- ❌ Create design requests
- ❌ Approve anything
- ❌ Make payments

---

## Pre-Implementation Checklist

### ✅ Documentation Complete
- [x] Small team analysis document created
- [x] Database schema analysis complete
- [x] Local schema reference updated
- [x] Implementation refinements document created

### ✅ Decisions APPROVED & IMPLEMENTED (2025-10-12)
- [x] **Decision 1**: Extend `team_memberships` with `institution_role` column ✅ IMPLEMENTED
- [x] **Decision 2**: Add `sub_team_id` to `orders` and `design_requests` tables ✅ IMPLEMENTED
- [x] **Decision 3**: Create separate `institution_sub_team_members` table ✅ IMPLEMENTED

### ✅ Database Setup COMPLETE (2025-10-12)
- [x] 20+ reusable components identified
- [x] Payment system validated (no changes needed)
- [x] Migration script created (`INSTITUTION_SETUP_MIGRATION.sql`)
- [x] ✅ Migration applied to database successfully
- [x] ✅ 2 tables created (`institution_sub_teams`, `institution_sub_team_members`)
- [x] ✅ 4 tables modified (team_memberships, orders, design_requests, team_settings)
- [x] ✅ 9 RLS policies created and active
- [x] ✅ 2 helper functions created (`get_institution_sub_teams`, `has_institution_role`)
- [x] ✅ Migration verified successfully
- [x] API routes planned
- [x] 20-day implementation timeline created

---

## Next Steps - Phase 2 Ready to Begin

1. ✅ **Decisions confirmed** (All 3 approved - Option A for each)
2. ✅ **Migrations run** on database (COMPLETE)
3. ⏭️ **Start Phase 2 implementation** (Core API Routes) - READY TO START
4. ⏭️ **Start Phase 3 implementation** (Institution Dashboard UI) - After Phase 2

---

**Document Status**: 🔒 ARCHIVED - Historical reference only

**Implemented**: 2025-10-12 - All architectural decisions implemented in production database

**For current progress**: See `MASTER_IMPLEMENTATION_PLAN.md` and `INSTITUTION_IMPLEMENTATION_PLAN.md`
