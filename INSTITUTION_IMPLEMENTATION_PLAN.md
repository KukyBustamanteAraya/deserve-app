# Institution Team Dashboard - Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for **Institution-Type Team Pages**, designed specifically for Athletic Directors and Sports Coordinators managing large organizations with multiple sports programs and teams.

**Key Differentiators from Small Team Pages:**
- Multi-sport program management (not single team)
- Centralized Athletic Director control (not collaborative democracy)
- Nested team hierarchy (programs → teams → players)
- Bulk operations and oversight tools (not individual player actions)
- Budget tracking across programs (not just single order payments)
- Institution-wide communication (not team-specific chat)

**Target Users:** Athletic Directors, Sports Coordinators, Institution Administrators managing 50-500+ members across multiple sports programs.

**Important Note:** For institutions, players are managed as **roster data only** (not system users). Only administrative staff (Athletic Director, Coach, Assistant) have system access and user accounts.

---

## 1. Core Concepts & Architecture

### 1.1 Hierarchy Model

```
Institution Team (is_institutional = true)
  └─ Administrative Staff (Athletic Director, Coaches, Assistants)
       └─ Sports Programs (array of sports)
            └─ Sub-Teams (optional, multiple teams per sport)
                 └─ Player Roster Data (names, sizes, positions - NOT user accounts)
                      └─ Orders & Design Requests
```

**Example:**
```
Lincoln High School Athletics
  ├─ Football Program
  │   ├─ Varsity Football (30 players)
  │   └─ JV Football (25 players)
  ├─ Basketball Program
  │   ├─ Boys Varsity (15 players)
  │   ├─ Girls Varsity (15 players)
  │   └─ Boys JV (12 players)
  └─ Soccer Program
      └─ Varsity Soccer (22 players)
```

### 1.2 Key Architectural Decisions

| Aspect | Small Team | Institution |
|--------|-----------|-------------|
| **Team Structure** | Single team, single sport | Multi-sport, multi-team hierarchy |
| **Decision Making** | Collaborative (voting, any_member) | Centralized (owner_only, Athletic Director) |
| **Player Info** | Self-service, hybrid | Manager-only (AD controls all data) |
| **Payment Model** | Individual contributions, split payments | Bulk institutional payment, budget allocation |
| **Access Control** | Invite-only, member visibility | Role-based, program-level permissions |
| **Navigation** | Single dashboard | Nested: Institution → Program → Team → Player |
| **Communication** | Team-wide chat | Program-level, cross-team announcements |

---

## 2. Database Schema Extensions

### 2.1 New Tables

#### `institution_programs`
Programs represent sports within an institution (e.g., "Football Program", "Basketball Program").

```sql
CREATE TABLE institution_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sport TEXT NOT NULL, -- 'futbol', 'basketball', etc.
  program_name TEXT, -- Optional custom name: "Varsity Basketball Program"
  budget_cents INTEGER DEFAULT 0, -- Program-level budget tracking
  budget_notes TEXT, -- Budget allocation notes
  coordinator_user_id UUID REFERENCES auth.users(id), -- Optional program coordinator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one program per sport per institution
  UNIQUE(institution_team_id, sport)
);

CREATE INDEX idx_institution_programs_team ON institution_programs(institution_team_id);
CREATE INDEX idx_institution_programs_sport ON institution_programs(sport);
```

#### `institution_sub_teams`
Sub-teams represent divisions within a program (e.g., "Varsity Football", "JV Football").

```sql
CREATE TABLE institution_sub_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES institution_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Varsity", "JV", "Boys", "Girls", etc.
  description TEXT,
  head_coach_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_institution_sub_teams_program ON institution_sub_teams(program_id);
```

#### `institution_sub_team_members`
Stores player roster data for sub-teams (NOT linked to user accounts).

```sql
CREATE TABLE institution_sub_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_team_id UUID NOT NULL REFERENCES institution_sub_teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL, -- Player full name
  email TEXT, -- Optional email for notifications (not for login)
  position TEXT, -- Player position (Forward, Defense, etc.)
  jersey_number INTEGER, -- Jersey number
  size TEXT, -- Clothing size (S, M, L, XL, XXL)
  additional_info JSONB, -- Flexible field for custom data (grade, student_id, etc.)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- Admin who added this player

  UNIQUE(sub_team_id, email) -- Prevent duplicate emails within same sub-team
);

CREATE INDEX idx_institution_sub_team_members_sub_team ON institution_sub_team_members(sub_team_id);
CREATE INDEX idx_institution_sub_team_members_email ON institution_sub_team_members(email);

COMMENT ON TABLE institution_sub_team_members IS 'Player roster data for institutions. Players do NOT have user accounts - they are managed by Athletic Directors and Coaches.';
```

#### `institution_budget_allocations`
Tracks budget allocations from institution → programs → orders.

```sql
CREATE TABLE institution_budget_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES institution_programs(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  allocation_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  allocated_by UUID REFERENCES auth.users(id), -- Athletic Director who allocated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_institution_budget_allocations_program ON institution_budget_allocations(program_id);
CREATE INDEX idx_institution_budget_allocations_order ON institution_budget_allocations(order_id);
```

### 2.2 Modifications to Existing Tables

#### `teams` table
```sql
-- Already exists from TEAM_MANAGEMENT_ARCHITECTURE.md
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS is_institutional BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS institution_type TEXT CHECK (institution_type IN ('high_school', 'college', 'club', 'other')),
  ADD COLUMN IF NOT EXISTS total_budget_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_year_start DATE,
  ADD COLUMN IF NOT EXISTS fiscal_year_end DATE;

COMMENT ON COLUMN teams.is_institutional IS 'True for Athletic Director institutions, False for small teams';
COMMENT ON COLUMN teams.institution_type IS 'Type of institution for categorization';
COMMENT ON COLUMN teams.total_budget_cents IS 'Total annual budget for all sports programs';
```

#### `team_members` table
```sql
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS institution_role TEXT CHECK (
    institution_role IN ('athletic_director', 'program_coordinator', 'head_coach', 'assistant')
  );

COMMENT ON COLUMN team_members.institution_role IS 'Role within institution hierarchy (only used if team.is_institutional = true). Players are NOT system users in institutions - they are roster data only.';
```

**Role Definitions:**
- `athletic_director`: Full administrative control over institution
- `program_coordinator`: Manages assigned program(s), equivalent to "Assistant" in whitepaper - handles data entry, communication, progress tracking
- `head_coach`: Oversees specific sub-team within program
- `assistant`: General assistant role with limited permissions (data entry, communication only)

#### `design_requests` table
```sql
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES institution_programs(id),
  ADD COLUMN IF NOT EXISTS sub_team_id UUID REFERENCES institution_sub_teams(id);

CREATE INDEX idx_design_requests_program ON design_requests(program_id);
CREATE INDEX idx_design_requests_sub_team ON design_requests(sub_team_id);

COMMENT ON COLUMN design_requests.program_id IS 'If institutional team, which program this design request belongs to';
COMMENT ON COLUMN design_requests.sub_team_id IS 'Optional: specific sub-team within program';
```

#### `orders` table
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES institution_programs(id),
  ADD COLUMN IF NOT EXISTS sub_team_id UUID REFERENCES institution_sub_teams(id),
  ADD COLUMN IF NOT EXISTS budget_allocation_id UUID REFERENCES institution_budget_allocations(id);

CREATE INDEX idx_orders_program ON orders(program_id);
CREATE INDEX idx_orders_sub_team ON orders(sub_team_id);

COMMENT ON COLUMN orders.program_id IS 'If institutional order, which program pays for this';
COMMENT ON COLUMN orders.sub_team_id IS 'Optional: specific sub-team receiving the order';
COMMENT ON COLUMN orders.budget_allocation_id IS 'Links order to budget allocation';
```

---

## 3. User Interface Design

### 3.1 Navigation Structure

#### Small Team (Current):
```
/mi-equipo/[slug] → Single team dashboard
  ├─ /payments → Payment tracking
  ├─ /members → Team roster
  └─ /designs → Design requests
```

#### Institution (New):
```
/mi-equipo/[slug] → Institution overview dashboard
  ├─ /programs → All sports programs (grid view)
  │   └─ /programs/[sport] → Program detail page
  │       ├─ /teams → Sub-teams within program
  │       ├─ /orders → Orders for this program
  │       ├─ /budget → Budget allocation & tracking
  │       └─ /members → All members in program
  ├─ /orders → Unified orders table (all programs)
  ├─ /finance → Institution-wide finance dashboard
  ├─ /members → All members across all programs
  └─ /settings → Institution settings
```

### 3.2 Institution Overview Dashboard

**File Location**: `/src/app/mi-equipo/[slug]/page.tsx` (modify to detect `is_institutional`)

#### Layout Sections:

**A. Header Bar**
```
┌─────────────────────────────────────────────────────────────┐
│  🏫 Lincoln High School Athletics                           │
│  Athletic Director: John Smith                              │
│  📊 8 Programs  |  142 Members  |  $45,000 Budget           │
└─────────────────────────────────────────────────────────────┘
```

**B. Quick Stats Cards**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 💰 Total     │ 📦 Active    │ ⏳ Pending   │ ✅ Delivered │
│   Budget     │   Orders     │   Approvals  │   Orders     │
│ $45,000      │    12        │     3        │     28       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**C. Sports Programs Grid**
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│  ⚽ Soccer Program   │  🏀 Basketball      │  🏈 Football        │
│                     │     Program         │     Program         │
│  45 Members         │  32 Members         │  55 Members         │
│  2 Sub-Teams        │  3 Sub-Teams        │  2 Sub-Teams        │
│  3 Active Orders    │  1 Active Order     │  5 Active Orders    │
│  $8,200 Allocated   │  $5,500 Allocated   │  $12,000 Allocated  │
│                     │                     │                     │
│  [View Program →]   │  [View Program →]   │  [View Program →]   │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

**D. Recent Activity Feed**
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Recent Activity                                         │
│  ────────────────────────────────────────────────────────   │
│  🏀 Basketball - New design request submitted (2h ago)     │
│  ⚽ Soccer - Order #1234 marked as delivered (5h ago)      │
│  🏈 Football - Budget allocation approved ($12,000) (1d)   │
│  🎾 Tennis - 8 new members added to roster (2d ago)        │
└─────────────────────────────────────────────────────────────┘
```

**E. Action Buttons**
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Add New Program]  [📊 View All Orders]  [💬 Announce]  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Program Detail Page

**File Location**: `/src/app/mi-equipo/[slug]/programs/[sport]/page.tsx` (NEW)

**URL Example**: `/mi-equipo/lincoln-hs-athletics/programs/futbol`

#### Layout Sections:

**A. Program Header**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Institution                                      │
│                                                             │
│  ⚽ Soccer Program                                           │
│  Lincoln High School Athletics                              │
│                                                             │
│  Program Coordinator: Maria Garcia                          │
│  📊 45 Members  |  2 Sub-Teams  |  $8,200 Budget           │
└─────────────────────────────────────────────────────────────┘
```

**B. Sub-Teams Section**
```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Sub-Teams in Soccer Program                             │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Varsity Soccer      │  │  JV Soccer           │        │
│  │  25 Players          │  │  20 Players          │        │
│  │  Coach: John Smith   │  │  Coach: Amy Lee      │        │
│  │  [View Roster →]     │  │  [View Roster →]     │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  [+ Add New Sub-Team]                                       │
└─────────────────────────────────────────────────────────────┘
```

**C. Orders Table for Program**
```
┌─────────────────────────────────────────────────────────────┐
│  📦 Orders for Soccer Program                               │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Order ID    | Sub-Team      | Items | Total   | Status   │
│  ─────────────────────────────────────────────────────────  │
│  #1234       | Varsity       | 25    | $3,500  | ✅ Paid  │
│  #1256       | JV Soccer     | 20    | $2,800  | ⏳ Pending│
│  #1287       | Varsity       | 5     | $1,200  | 🚚 Transit│
│                                                             │
│  [+ Create New Order]  [Export CSV]                         │
└─────────────────────────────────────────────────────────────┘
```

**D. Budget Tracker**
```
┌─────────────────────────────────────────────────────────────┐
│  💰 Budget Allocation - Soccer Program                      │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Total Budget: $8,200                                       │
│  Allocated:    $7,500  ████████████████░░  91%             │
│  Remaining:    $700                                         │
│                                                             │
│  Breakdown:                                                 │
│  • Varsity Soccer Uniforms: $4,700                          │
│  • JV Soccer Uniforms: $2,800                               │
│                                                             │
│  [Adjust Budget]  [View Allocation History]                 │
└─────────────────────────────────────────────────────────────┘
```

**E. Members Roster**
```
┌─────────────────────────────────────────────────────────────┐
│  👥 All Members in Soccer Program (45)                      │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  [Filter: All Sub-Teams ▼]  [Search...]  [+ Add Members]   │
│                                                             │
│  Name            | Sub-Team    | Position | Jersey # | ... │
│  ──────────────────────────────────────────────────────────│
│  John Doe        | Varsity     | Forward  | #10      | ... │
│  Jane Smith      | Varsity     | Midfield | #7       | ... │
│  Mike Johnson    | JV Soccer   | Defense  | #4       | ... │
│  ...                                                        │
│                                                             │
│  [Export Roster CSV]  [Bulk Import]                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Unified Orders Manager

**File Location**: `/src/app/mi-equipo/[slug]/orders/page.tsx` (NEW)

**URL**: `/mi-equipo/lincoln-hs-athletics/orders`

```
┌─────────────────────────────────────────────────────────────┐
│  📦 All Orders - Lincoln High School Athletics              │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  [Filter: All Programs ▼]  [Status: All ▼]  [Search...]    │
│                                                             │
│  Order ID | Program    | Sub-Team    | Items | Total   | Status │
│  ──────────────────────────────────────────────────────────│
│  #1234    | Soccer     | Varsity     | 25    | $3,500  | ✅ Paid│
│  #1256    | Soccer     | JV          | 20    | $2,800  | ⏳ Pending│
│  #1301    | Basketball | Boys Varsity| 15    | $2,400  | ✅ Paid│
│  #1287    | Football   | Varsity     | 30    | $6,000  | 🚚 Transit│
│  ...                                                        │
│                                                             │
│  Showing 45 orders  |  Total Value: $45,000                │
│                                                             │
│  [Export All Orders CSV]  [Generate Report]                 │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter by program, sub-team, status
- Search by order ID, player name, product
- Bulk actions (export, approve, cancel)
- Quick view modal for order details
- Status badges with color coding

### 3.5 Finance Dashboard

**File Location**: `/src/app/mi-equipo/[slug]/finance/page.tsx` (NEW)

**URL**: `/mi-equipo/lincoln-hs-athletics/finance`

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Finance Dashboard - Lincoln High School Athletics       │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Fiscal Year: 2025-2026  (Aug 1, 2025 - Jul 31, 2026)      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Institution Budget Overview                        │   │
│  │  ───────────────────────────────────────────────    │   │
│  │  Total Budget:     $45,000                          │   │
│  │  Allocated:        $38,200  ████████████████░░  85% │   │
│  │  Spent (Paid):     $28,500  ████████████░░░░░░  63% │   │
│  │  Pending Orders:   $9,700                           │   │
│  │  Remaining:        $6,800                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Budget by Program:                                         │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Program       | Budget   | Allocated | Spent    | Remain  │
│  ──────────────────────────────────────────────────────────│
│  🏈 Football   | $12,000  | $11,500   | $9,000   | $500    │
│  ⚽ Soccer     | $8,200   | $7,500    | $6,300   | $700    │
│  🏀 Basketball| $5,500   | $5,500    | $4,800   | $0      │
│  🏐 Volleyball| $6,000   | $5,000    | $3,200   | $1,000  │
│  ...                                                        │
│                                                             │
│  Recent Transactions:                                       │
│  ────────────────────────────────────────────────────────   │
│  • Soccer - Order #1234 paid: $3,500 (2 days ago)         │
│  • Football - Budget allocated: $6,000 (5 days ago)        │
│  • Basketball - Order #1301 paid: $2,400 (1 week ago)     │
│                                                             │
│  [Adjust Budgets]  [Export Financial Report]  [History]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Specifications

### 4.1 Multi-Program Management

**Feature**: Athletic Director can create and manage multiple sports programs under one institution.

**User Story**: As an Athletic Director, I want to create a new sports program (e.g., "Tennis Program") so that I can organize teams and orders for that sport.

**Implementation:**

1. **Add Program Flow**:
   - Click "Add New Program" button on institution dashboard
   - Modal opens with form:
     - Sport (dropdown: all sports)
     - Custom Program Name (optional, defaults to "{Sport} Program")
     - Budget Allocation (CLP)
     - Program Coordinator (optional user select)
   - Submit → Creates `institution_programs` record
   - Auto-creates initial program card on dashboard

2. **API Endpoint**: `POST /api/institutions/[teamId]/programs`
   ```typescript
   // Body:
   {
     sport: 'futbol',
     program_name: 'Varsity Soccer Program',
     budget_cents: 8200000, // $8,200 CLP
     coordinator_user_id: 'uuid-here'
   }
   ```

3. **Database Operation**:
   ```sql
   INSERT INTO institution_programs (institution_team_id, sport, program_name, budget_cents, coordinator_user_id)
   VALUES ($1, $2, $3, $4, $5);
   ```

**Acceptance Criteria:**
- ✅ Athletic Director can create new programs
- ✅ Program appears on institution dashboard immediately
- ✅ Sport emoji and name display correctly
- ✅ Budget is tracked independently per program
- ✅ Can assign program coordinator (optional)

### 4.2 Sub-Team Organization

**Feature**: Within each program, Athletic Director can create sub-teams (Varsity, JV, Boys, Girls, etc.).

**User Story**: As an Athletic Director, I want to create "Varsity Football" and "JV Football" sub-teams under the Football Program so that I can manage rosters and orders separately.

**Implementation:**

1. **Add Sub-Team Flow**:
   - Navigate to Program Detail page (`/programs/[sport]`)
   - Click "Add New Sub-Team" button
   - Modal opens with form:
     - Sub-Team Name (text: "Varsity", "JV", "Boys", etc.)
     - Description (optional)
     - Head Coach (user select from team members)
   - Submit → Creates `institution_sub_teams` record

2. **API Endpoint**: `POST /api/institutions/[teamId]/programs/[programId]/sub-teams`
   ```typescript
   // Body:
   {
     name: 'Varsity',
     description: 'Varsity Football Team',
     head_coach_user_id: 'uuid-here'
   }
   ```

3. **Database Operation**:
   ```sql
   INSERT INTO institution_sub_teams (program_id, name, description, head_coach_user_id)
   VALUES ($1, $2, $3, $4);
   ```

**Acceptance Criteria:**
- ✅ Can create multiple sub-teams per program
- ✅ Sub-teams display on Program Detail page
- ✅ Can assign head coach to each sub-team
- ✅ Can add members to specific sub-teams
- ✅ Sub-team roster is independently viewable

### 4.3 Bulk Player Roster Import

**Feature**: Athletic Director can import player roster data via CSV for each sub-team.

**User Story**: As an Athletic Director, I want to upload a CSV file with 30 football player names and sizes so that I don't have to add them one-by-one.

**Important**: Players are roster data only, NOT user accounts. Emails are optional and used only for notifications (e.g., order ready for pickup).

**Implementation:**

1. **CSV Upload Flow**:
   - Navigate to Program Detail page → Members section
   - Click "Bulk Import" button
   - Upload CSV file (format: `name,email,sub_team,position,jersey_number,size`)
   - System validates CSV structure
   - Preview table shows what will be imported
   - Click "Confirm Import" → Process rows

2. **CSV Format**:
   ```csv
   name,email,sub_team,position,jersey_number,size
   John Doe,john@example.com,Varsity,Forward,10,L
   Jane Smith,jane@example.com,Varsity,Midfield,7,M
   Mike Johnson,mike@example.com,JV,Defense,4,XL
   Sarah Lee,,Varsity,Forward,11,S
   ```
   Note: Email is optional (empty string allowed)

3. **API Endpoint**: `POST /api/institutions/[teamId]/programs/[programId]/import-roster`
   ```typescript
   // Body: FormData with CSV file
   ```

4. **Processing Logic**:
   - Parse CSV
   - For each row:
     - Validate required fields: `name`, `sub_team`
     - Find or create `institution_sub_teams` by name
     - Create `institution_sub_team_members` record (roster data)
     - **Do NOT create user accounts or send invitations**
   - Return summary: {imported: 28, skipped: 2, errors: []}

**Acceptance Criteria:**
- ✅ CSV upload accepts standard format
- ✅ Validates required fields (name, sub_team)
- ✅ Email is optional, no invitations sent
- ✅ Creates roster entries in `institution_sub_team_members`
- ✅ Links roster data to correct sub-team
- ✅ Shows import summary with errors
- ✅ Rollback on critical errors

### 4.4 Program-Level Order Creation

**Feature**: Athletic Director can create orders for specific programs and sub-teams.

**User Story**: As an Athletic Director, I want to create an order for "Varsity Football" with 30 jerseys, assign it to the Football Program budget, so that the order is tracked and paid from the correct allocation.

**Implementation:**

1. **Order Creation Flow**:
   - Navigate to Program Detail page
   - Click "Create New Order" button
   - Order creation wizard opens:
     - **Step 1**: Select sub-team (dropdown: Varsity, JV, etc.)
     - **Step 2**: Select design (from approved designs for this sport)
     - **Step 3**: Add order items (select members from sub-team roster)
     - **Step 4**: Review total cost
     - **Step 5**: Assign budget allocation
   - Submit → Creates `orders` record with `program_id` and `sub_team_id`

2. **Budget Assignment**:
   - When order is created, check program budget remaining
   - If sufficient, create `institution_budget_allocations` record
   - Deduct from program's available budget
   - Link order to budget allocation

3. **API Endpoint**: `POST /api/institutions/[teamId]/orders`
   ```typescript
   // Body:
   {
     program_id: 'uuid',
     sub_team_id: 'uuid',
     design_id: 'uuid',
     items: [
       { player_id: 'uuid', product_id: 'uuid', size: 'M', quantity: 1 },
       // ...
     ],
     total_amount_cents: 3500000,
     budget_allocation: true
   }
   ```

4. **Database Operations**:
   ```sql
   -- Create order
   INSERT INTO orders (team_id, program_id, sub_team_id, total_amount_cents, payment_status)
   VALUES ($1, $2, $3, $4, 'unpaid');

   -- Create budget allocation
   INSERT INTO institution_budget_allocations (program_id, order_id, amount_cents, allocated_by)
   VALUES ($2, $order_id, $4, $user_id);

   -- Update program budget
   UPDATE institution_programs
   SET budget_cents = budget_cents - $4
   WHERE id = $2;
   ```

**Acceptance Criteria:**
- ✅ Order creation wizard includes program/sub-team selection
- ✅ Can only select members from chosen sub-team
- ✅ Budget validation prevents over-allocation
- ✅ Order linked to program_id and sub_team_id
- ✅ Budget allocation automatically created and tracked
- ✅ Program budget updates in real-time

### 4.5 Centralized Order Management

**Feature**: Athletic Director can view all orders across all programs in a unified table.

**User Story**: As an Athletic Director, I want to see all 45 orders across 8 sports programs in one table so that I can track the status of every order without navigating to each program individually.

**Implementation:**

1. **Unified Orders Page**: `/mi-equipo/[slug]/orders`
   - Fetch all orders where `orders.team_id = institution_team_id`
   - Join with `institution_programs` and `institution_sub_teams` to show program/sub-team names
   - Display in sortable, filterable table

2. **Filters**:
   - **Program**: Dropdown to filter by sport (Soccer, Basketball, etc.)
   - **Sub-Team**: Dropdown to filter by sub-team (Varsity, JV, etc.)
   - **Status**: Dropdown (Unpaid, Pending, Paid, In Transit, Delivered)
   - **Date Range**: Date picker for order creation date
   - **Search**: Text search by order ID, player name, product name

3. **Bulk Actions**:
   - Select multiple orders (checkboxes)
   - Bulk approve design requests
   - Bulk export to CSV
   - Bulk status update (if applicable)

4. **API Endpoint**: `GET /api/institutions/[teamId]/orders?program=futbol&status=unpaid&limit=50`
   ```typescript
   // Response:
   {
     orders: [
       {
         id: 'order-uuid',
         program: { name: 'Soccer Program', sport: 'futbol' },
         sub_team: { name: 'Varsity' },
         items_count: 25,
         total_amount_cents: 3500000,
         payment_status: 'paid',
         created_at: '2025-10-01T12:00:00Z'
       },
       // ...
     ],
     total_count: 45,
     total_value_cents: 45000000
   }
   ```

**Acceptance Criteria:**
- ✅ All orders from all programs display in one table
- ✅ Filters work correctly (program, status, date)
- ✅ Search finds orders by ID or player name
- ✅ Table is sortable by all columns
- ✅ Can export filtered results to CSV
- ✅ Pagination works for large datasets (50+ orders)

### 4.6 Finance & Budget Tracking

**Feature**: Athletic Director can view institution-wide budget allocation, spending, and remaining funds across all programs.

**User Story**: As an Athletic Director, I want to see how much of my $45,000 budget is allocated, spent, and remaining across all sports programs so that I can make informed budget decisions.

**Implementation:**

1. **Finance Dashboard Page**: `/mi-equipo/[slug]/finance`
   - Fetch institution team with `total_budget_cents`
   - Fetch all `institution_programs` with `budget_cents`
   - Fetch all `institution_budget_allocations` with linked orders
   - Calculate:
     - Total Budget: `teams.total_budget_cents`
     - Allocated: Sum of `institution_programs.budget_cents`
     - Spent: Sum of `orders.total_amount_cents` where `payment_status = 'paid'`
     - Pending: Sum of `orders.total_amount_cents` where `payment_status IN ('unpaid', 'pending')`
     - Remaining: Total Budget - Allocated

2. **Budget by Program Table**:
   - List each program with:
     - Program name
     - Budget allocated
     - Amount spent (paid orders)
     - Amount pending (unpaid orders)
     - Remaining budget
   - Visual progress bars for each program

3. **Budget Adjustment Flow**:
   - Click "Adjust Budgets" button
   - Modal with form showing all programs
   - Can increase/decrease each program's budget
   - Real-time validation: Total allocated cannot exceed institution total budget
   - Submit → Update `institution_programs.budget_cents` for each program

4. **API Endpoints**:
   - `GET /api/institutions/[teamId]/finance/overview`
   - `GET /api/institutions/[teamId]/finance/transactions?program=futbol&date_from=2025-01-01`
   - `PATCH /api/institutions/[teamId]/finance/adjust-budgets`

**Acceptance Criteria:**
- ✅ Finance dashboard shows accurate institution-wide totals
- ✅ Budget progress bars are correct
- ✅ Can adjust program budgets without exceeding total
- ✅ Transaction history shows all allocations and payments
- ✅ Can filter transactions by program and date
- ✅ Can export financial report to CSV/PDF

### 4.7 Institution-Wide Communication

**Feature**: Athletic Director can send announcements to all members or specific programs.

**User Story**: As an Athletic Director, I want to send an announcement to all Football Program members about a schedule change so that everyone is informed without emailing individually.

**Implementation:**

1. **Announcement Creation Flow**:
   - Click "Announce" button on institution dashboard
   - Modal opens with form:
     - **Title**: Text (e.g., "Football Practice Schedule Change")
     - **Message**: Textarea (supports markdown)
     - **Audience**:
       - All members (institution-wide)
       - Specific program(s) (multi-select: Soccer, Basketball, etc.)
       - Specific sub-team(s) (multi-select: Varsity Football, JV Basketball, etc.)
     - **Send Via**:
       - In-app notification
       - Email (optional checkbox)
   - Submit → Creates announcement records

2. **Database Schema**:
   ```sql
   CREATE TABLE institution_announcements (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     institution_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
     created_by UUID NOT NULL REFERENCES auth.users(id),
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     audience_type TEXT NOT NULL CHECK (audience_type IN ('all', 'program', 'sub_team')),
     audience_ids UUID[], -- Array of program_ids or sub_team_ids
     send_email BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE institution_announcement_reads (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     announcement_id UUID NOT NULL REFERENCES institution_announcements(id) ON DELETE CASCADE,
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     read_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(announcement_id, user_id)
   );
   ```

3. **Notification System**:
   - Create in-app notification for each target user
   - If `send_email = true`, queue email job to send via Resend or similar
   - Users see notification badge on dashboard
   - Clicking notification marks as read

4. **API Endpoint**: `POST /api/institutions/[teamId]/announcements`
   ```typescript
   // Body:
   {
     title: 'Football Practice Schedule Change',
     message: 'Practice moved to 4pm on Tuesdays starting next week.',
     audience_type: 'program',
     audience_ids: ['football-program-uuid'],
     send_email: true
   }
   ```

**Acceptance Criteria:**
- ✅ Can create announcements with title and message
- ✅ Can target all members, specific programs, or sub-teams
- ✅ In-app notifications delivered to correct audience
- ✅ Email sent if checkbox selected
- ✅ Users can mark announcements as read
- ✅ Unread count badge displays on dashboard

---

## 5. Permission & Access Control

### 5.1 Role Hierarchy

**Note:** Players do NOT have system access in institutions. Only administrative staff have user accounts.

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **Athletic Director** | Institution-wide | • Full control over all programs, teams, and player rosters<br>• Create/edit/delete programs and sub-teams<br>• Manage all orders and budgets<br>• Send institution-wide announcements<br>• Assign roles (Program Coordinator, Head Coach, Assistant)<br>• Approve design requests across all programs<br>• Make institutional payments via Mercado Pago |
| **Program Coordinator / Assistant** | Program-level | • View and manage assigned program only<br>• Data entry for player rosters<br>• Communication and progress tracking<br>• Add/edit player information within program<br>• Send program-level announcements<br>• **Cannot** create orders or adjust budgets<br>• **Cannot** make payments |
| **Head Coach** | Sub-team-level | • View assigned sub-team roster<br>• Edit player data for assigned sub-team<br>• View orders for sub-team<br>• Communication with Athletic Director<br>• **Cannot** create orders or adjust budgets<br>• **Cannot** create sub-teams or manage budget |

### 5.2 RLS Policies

#### `institution_programs` RLS
```sql
-- Athletic Directors can view all programs in their institution
CREATE POLICY "Athletic Directors can view programs"
  ON institution_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = institution_programs.institution_team_id
        AND team_members.user_id = auth.uid()
        AND team_members.institution_role = 'athletic_director'
    )
  );

-- Program Coordinators can view their assigned program
CREATE POLICY "Program Coordinators can view their program"
  ON institution_programs
  FOR SELECT
  USING (coordinator_user_id = auth.uid());
```

#### `institution_sub_teams` RLS
```sql
-- Athletic Directors and Program Coordinators can view sub-teams
CREATE POLICY "AD and Coordinators can view sub-teams"
  ON institution_sub_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM institution_programs p
      INNER JOIN team_members tm ON tm.team_id = p.institution_team_id
      WHERE institution_sub_teams.program_id = p.id
        AND tm.user_id = auth.uid()
        AND tm.institution_role IN ('athletic_director', 'program_coordinator')
    )
  );

-- Head Coaches can view their assigned sub-team
CREATE POLICY "Head Coaches can view their sub-team"
  ON institution_sub_teams
  FOR SELECT
  USING (head_coach_user_id = auth.uid());
```

#### `orders` RLS (modification)
```sql
-- Athletic Directors can view all orders in their institution
CREATE POLICY "Athletic Directors can view institution orders"
  ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = orders.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.institution_role = 'athletic_director'
    )
  );

-- Program Coordinators can view orders for their program
CREATE POLICY "Program Coordinators can view program orders"
  ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM institution_programs
      WHERE institution_programs.id = orders.program_id
        AND institution_programs.coordinator_user_id = auth.uid()
    )
  );
```

---

## 6. Differentiation from Small Team Pages

| Feature | Small Team | Institution |
|---------|-----------|-------------|
| **Dashboard Layout** | Single sport focus | Multi-program grid overview |
| **Navigation** | Flat (team → members, payments) | Nested (institution → program → sub-team → roster) |
| **Decision Making** | Collaborative (voting, any_member) | Centralized (Athletic Director approval only) |
| **Player Management** | Players are system users (accounts) | Players are roster data only (no accounts) |
| **Roster Data Entry** | Self-service, players add themselves | Admin-only, bulk import CSV or manual entry |
| **Payment Model** | Individual contributions, split payments | Institutional budget, Athletic Director pays all |
| **Order Creation** | Any member can request design | Only Athletic Director creates orders |
| **Budget Tracking** | Per-order payment tracking | Institution-wide budget allocation across programs |
| **Communication** | Team chat (all members) | Top-down announcement system (admin to admin) |
| **User Roles** | Owner, Member (all have accounts) | Athletic Director, Coach, Assistant (players have NO accounts) |
| **Data Visibility** | All members see all data | Role-based access (Coordinators see only their program) |
| **Bulk Operations** | Not needed (5-15 members) | Essential (50-500+ roster entries) |
| **Reporting** | Simple order list | Finance dashboard, CSV exports, analytics |
| **Invitations** | Members invite friends | Only Athletic Director manages staff |

---

## 7. Implementation Phases

### ✅ Phase 1: Database Schema & Core Architecture - COMPLETE (2025-10-12)

**Completed Tasks:**
1. ✅ Created new tables:
   - `institution_sub_teams` (simplified from original plan)
   - `institution_sub_team_members` (roster data only, no user accounts)

2. ✅ Modified existing tables:
   - Added `institution_role` to `team_memberships` (athletic_director, program_coordinator, head_coach, assistant)
   - Added `sub_team_id` to `orders` and `design_requests` tables
   - Extended `team_settings` with 5 institution-specific columns

3. ✅ Created 9 RLS policies for all new tables (role-based access control)

4. ✅ Created 2 helper functions:
   - `get_institution_sub_teams(institution_id)` - Returns sub-teams with aggregated data
   - `has_institution_role(team_id, user_id, role)` - Check user's institution role

**Deliverables:**
- ✅ Migration file `INSTITUTION_SETUP_MIGRATION.sql` created and applied
- ✅ RLS policies tested and verified
- ✅ Database functions documented and working
- ✅ Migration verification completed successfully

**Important Note**: The actual implementation simplified the original plan. Instead of creating separate `institution_programs` table, the implementation uses `institution_sub_teams` directly linked to `teams.id`, which works better with the existing architecture. Players are managed as roster data in `institution_sub_team_members` (no user accounts).

### 📝 Phase 2: Institution Dashboard & Program Management (Week 3-4) - READY TO START

**Tasks:**
1. Modify `/mi-equipo/[slug]/page.tsx` to detect `is_institutional` and render different layout
2. Create `InstitutionDashboard` component (enhance existing)
3. Build Program Management features:
   - Add Program modal and API endpoint
   - Program cards grid with stats
   - Program detail page (`/programs/[sport]/page.tsx`)
4. Implement Sub-Team Management:
   - Add Sub-Team modal and API endpoint
   - Sub-team roster view
   - Sub-team assignment UI

**API Endpoints to Build:**
- `POST /api/institutions/[teamId]/programs` - Create program
- `GET /api/institutions/[teamId]/programs` - List programs
- `GET /api/institutions/[teamId]/programs/[programId]` - Get program details
- `PATCH /api/institutions/[teamId]/programs/[programId]` - Update program
- `DELETE /api/institutions/[teamId]/programs/[programId]` - Delete program
- `POST /api/institutions/[teamId]/programs/[programId]/sub-teams` - Create sub-team
- `GET /api/institutions/[teamId]/programs/[programId]/sub-teams` - List sub-teams

**Deliverables:**
- ✅ Institution dashboard fully functional
- ✅ Program creation and management working
- ✅ Sub-team creation and roster management working
- ✅ UI distinguishes institutional vs small team pages

### Phase 3: Bulk Roster Management & CSV Import (Week 5)

**Tasks:**
1. Build CSV upload UI component
2. Implement CSV parser and validator
3. Create bulk roster import API endpoint (roster data, NOT user accounts)
4. Build manual "Add Player" form for individual entries
5. Store roster data in `institution_sub_team_members` table

**API Endpoints to Build:**
- `POST /api/institutions/[teamId]/programs/[programId]/import-roster` - Bulk CSV roster import
- `POST /api/institutions/[teamId]/programs/[programId]/roster` - Add single player (roster data)
- `PATCH /api/institutions/[teamId]/programs/[programId]/roster/[playerId]` - Edit player data
- `DELETE /api/institutions/[teamId]/programs/[programId]/roster/[playerId]` - Remove player

**Deliverables:**
- ✅ CSV upload and import working for roster data
- ✅ Validation shows errors clearly
- ✅ Import summary displays (success/failed counts)
- ✅ Manual player add/edit/delete working
- ✅ No user invitations sent (roster data only)

### Phase 4: Order Management & Budget Tracking (Week 6-7)

**Tasks:**
1. Modify order creation wizard to include program/sub-team selection
2. Implement budget allocation logic:
   - Check program budget before order creation
   - Create `institution_budget_allocations` record
   - Deduct from program budget
3. Build Unified Orders page (`/orders/page.tsx`)
4. Implement filters and search for orders table
5. Create Finance Dashboard page (`/finance/page.tsx`)
6. Build budget adjustment UI

**API Endpoints to Build:**
- `POST /api/institutions/[teamId]/orders` - Create order with budget allocation
- `GET /api/institutions/[teamId]/orders` - List all orders (with filters)
- `GET /api/institutions/[teamId]/finance/overview` - Finance dashboard data
- `PATCH /api/institutions/[teamId]/finance/adjust-budgets` - Update program budgets

**Deliverables:**
- ✅ Order creation linked to programs and sub-teams
- ✅ Budget validation prevents over-allocation
- ✅ Unified orders table working with filters
- ✅ Finance dashboard shows accurate totals
- ✅ Budget adjustment UI functional

### Phase 5: Communication & Announcements (Week 8)

**Tasks:**
1. Build announcement creation UI (modal)
2. Implement audience targeting logic (all, program, sub-team)
3. Create in-app notification system
4. Integrate email sending (Resend or similar)
5. Build announcement read tracking
6. Add unread badge to dashboard

**API Endpoints to Build:**
- `POST /api/institutions/[teamId]/announcements` - Create announcement
- `GET /api/institutions/[teamId]/announcements` - List announcements for user
- `PATCH /api/institutions/[teamId]/announcements/[announcementId]/read` - Mark as read

**Deliverables:**
- ✅ Announcement creation working
- ✅ Audience targeting correct (all, program, sub-team)
- ✅ In-app notifications delivered
- ✅ Email notifications sent (if enabled)
- ✅ Read tracking functional

### Phase 6: Reporting & Analytics (Week 9)

**Tasks:**
1. Build CSV export functionality for orders
2. Build CSV export for member rosters
3. Create PDF report generator for finances
4. Add analytics dashboard (optional):
   - Orders over time (line chart)
   - Spending by program (pie chart)
   - Member growth over time
5. Implement role-based data filtering (Coordinators only see their program)

**API Endpoints to Build:**
- `GET /api/institutions/[teamId]/reports/orders?format=csv`
- `GET /api/institutions/[teamId]/reports/members?format=csv`
- `GET /api/institutions/[teamId]/reports/finance?format=pdf`

**Deliverables:**
- ✅ CSV exports working for orders and members
- ✅ PDF finance report generates correctly
- ✅ Analytics dashboard displays charts (optional)
- ✅ Role-based data filtering enforced

### Phase 7: Testing & Refinement (Week 10)

**Tasks:**
1. End-to-end testing of all institution features
2. Test RLS policies with different roles
3. Performance testing with large datasets (500+ members, 100+ orders)
4. UI/UX refinement based on user feedback
5. Mobile responsiveness testing
6. Documentation for Athletic Directors (user guide)

**Test Scenarios:**
- Athletic Director creates institution with 8 programs
- Bulk import 200 members across multiple sub-teams
- Create 50 orders across different programs
- Budget allocation and tracking accuracy
- Announcements delivered to correct audience
- Role permissions enforced (Coordinator can't see other programs)

**Deliverables:**
- ✅ All features tested and bugs fixed
- ✅ Performance optimized for large institutions
- ✅ Mobile UI works correctly
- ✅ User guide documentation complete

---

## 8. Technical Considerations

### 8.1 Performance Optimization

**Challenge**: Large institutions may have 500+ members and 100+ orders. Queries must be optimized.

**Solutions:**
1. **Database Indexes**: Add indexes on frequently queried columns
   ```sql
   CREATE INDEX idx_orders_program_status ON orders(program_id, payment_status);
   CREATE INDEX idx_team_members_role ON team_members(team_id, institution_role);
   ```

2. **Query Optimization**: Use joins and aggregations efficiently
   ```sql
   -- Bad: N+1 query for each program's orders
   -- Good: Single query with join
   SELECT
     p.id,
     p.sport,
     COUNT(o.id) as order_count,
     SUM(o.total_amount_cents) as total_spent
   FROM institution_programs p
   LEFT JOIN orders o ON o.program_id = p.id
   WHERE p.institution_team_id = $1
   GROUP BY p.id;
   ```

3. **Pagination**: Use cursor-based pagination for large lists
   ```typescript
   // API: ?cursor=uuid&limit=50
   const { data, error } = await supabase
     .from('orders')
     .select('*')
     .eq('team_id', teamId)
     .gt('id', cursor)
     .order('id', { ascending: true })
     .limit(50);
   ```

4. **Caching**: Cache institution overview stats with short TTL (5 minutes)
   ```typescript
   // Use React Query with staleTime
   const { data } = useQuery(
     ['institution', 'overview', teamId],
     fetchInstitutionOverview,
     { staleTime: 5 * 60 * 1000 } // 5 minutes
   );
   ```

### 8.2 Data Migration Strategy

**Challenge**: Existing small teams should not be affected. New institutions start fresh.

**Strategy:**
1. All new database tables are additive (no breaking changes)
2. `is_institutional` defaults to `false` on `teams` table
3. Existing small teams continue working unchanged
4. New institutions created with `is_institutional = true`
5. UI routing logic:
   ```typescript
   // /mi-equipo/[slug]/page.tsx
   const { data: team } = await supabase
     .from('teams')
     .select('*, is_institutional')
     .eq('slug', slug)
     .single();

   if (team.is_institutional) {
     return <InstitutionDashboard team={team} />;
   } else {
     return <SmallTeamDashboard team={team} />;
   }
   ```

### 8.3 Role-Based UI Rendering

**Challenge**: Different roles see different features on the same page.

**Solution**: Use role-based component rendering
```typescript
// components/dashboard/InstitutionDashboard.tsx
const userRole = team.members.find(m => m.user_id === currentUserId)?.institution_role;

return (
  <>
    {/* Athletic Director sees everything */}
    {userRole === 'athletic_director' && (
      <>
        <AddProgramButton />
        <FinanceDashboard />
        <AnnouncementCenter />
        <OrderCreation />
        <BudgetManagement />
      </>
    )}

    {/* Program Coordinators/Assistants see only their program */}
    {(userRole === 'program_coordinator' || userRole === 'assistant') && (
      <>
        <ProgramDetailView programId={assignedProgramId} />
        <RosterManagement readOnly={false} />
        <ProgramAnnouncements />
      </>
    )}

    {/* Head Coaches see only their sub-team */}
    {userRole === 'head_coach' && (
      <>
        <SubTeamRosterView subTeamId={assignedSubTeamId} />
        <OrdersForSubTeam readOnly={true} />
      </>
    )}
  </>
);
```

### 8.4 Budget Validation & Constraints

**Challenge**: Prevent over-allocation of budgets.

**Solution**: Database-level constraints + API validation
```sql
-- Constraint: Program budget cannot exceed institution budget
ALTER TABLE institution_programs
  ADD CONSTRAINT check_program_budget
  CHECK (
    budget_cents <= (
      SELECT total_budget_cents
      FROM teams
      WHERE id = institution_team_id
    )
  );
```

```typescript
// API validation before order creation
const program = await supabase
  .from('institution_programs')
  .select('budget_cents')
  .eq('id', programId)
  .single();

if (program.budget_cents < orderTotalCents) {
  throw new Error('Insufficient program budget');
}
```

---

## 9. User Flows

### 9.1 Athletic Director: Create New Institution

1. User signs up and creates account
2. On team creation page, selects "Institution" type (radio button)
3. Fills in institution details:
   - Institution Name (e.g., "Lincoln High School Athletics")
   - Institution Type (dropdown: High School, College, Club, Other)
   - Total Annual Budget (CLP)
   - Fiscal Year Start/End dates
4. Clicks "Create Institution" → `teams` record created with `is_institutional = true`
5. Redirected to institution dashboard (empty state, no programs yet)
6. Clicks "Add New Program" to create first sports program

### 9.2 Athletic Director: Add Football Program with Sub-Teams

1. From institution dashboard, clicks "Add New Program"
2. Modal opens:
   - Selects "Football" from sport dropdown
   - Enters program name: "Football Program" (auto-filled)
   - Allocates budget: $12,000
   - Clicks "Create Program"
3. Football Program card appears on dashboard
4. Clicks "View Program" on Football card
5. On Program Detail page, clicks "Add New Sub-Team"
6. Creates "Varsity Football" sub-team:
   - Name: "Varsity"
   - Description: "Varsity Football Team"
   - Head Coach: Selects "Coach John Smith"
7. Repeats for "JV Football" sub-team
8. Clicks "Bulk Import" to upload roster CSV:
   - Uploads `football_roster.csv` with 55 players
   - Preview shows 30 Varsity, 25 JV
   - Clicks "Confirm Import" → Players added to sub-teams
9. Roster table now shows 55 players with sub-team assignments

### 9.3 Athletic Director: Create Order for Varsity Football

1. On Football Program Detail page, clicks "Create New Order"
2. Order wizard opens:
   - **Step 1**: Selects "Varsity Football" sub-team
   - **Step 2**: Selects approved design "Home Jersey Design #47"
   - **Step 3**: System auto-loads 30 Varsity players
     - For each player, selects size (S, M, L, XL, XXL)
     - Quantity defaults to 1 jersey per player
   - **Step 4**: Reviews total: $6,000 (30 players × $200/jersey)
   - **Step 5**: Confirms budget allocation from Football Program budget
3. Clicks "Create Order" → Order created with:
   - `orders.program_id = football_program_id`
   - `orders.sub_team_id = varsity_sub_team_id`
   - `orders.payment_status = 'unpaid'`
   - `institution_budget_allocations` record created
   - Football Program budget: $12,000 → $6,000 remaining
4. Order appears on Program Detail page and Unified Orders page
5. Athletic Director pays order via Mercado Pago (institutional payment)
6. Webhook updates `orders.payment_status = 'paid'`
7. Finance Dashboard updates: Spent increases by $6,000

### 9.4 Program Coordinator: View Assigned Program Only

1. User is assigned as "Program Coordinator" for Soccer Program
2. Logs in and navigates to `/mi-equipo/lincoln-hs-athletics`
3. Institution dashboard shows:
   - Overview stats (read-only)
   - Soccer Program card (full access)
   - Other programs (dimmed, "No Access")
4. Clicks "View Program" on Soccer card
5. On Soccer Program Detail page, can:
   - View sub-teams (Varsity, JV)
   - View roster
   - View orders for Soccer program
   - **Cannot** create new orders (only Athletic Director can)
   - **Cannot** adjust budget (read-only)
6. Coordinator can send announcements to Soccer Program members only

### 9.5 Head Coach: Manage Sub-Team Roster

1. User is assigned as "Head Coach" for Varsity Football sub-team
2. Logs in and navigates to `/mi-equipo/lincoln-hs-athletics`
3. Institution dashboard shows:
   - Overview stats (read-only)
   - Football Program card (view access to own sub-team only)
   - Other programs (not visible)
4. Clicks "View Program" on Football card
5. On Football Program Detail page, sees:
   - Varsity Football sub-team roster (can edit player data)
   - Orders for Varsity Football (read-only)
   - **Cannot** create new orders
   - **Cannot** adjust budget
6. Clicks "Edit" on a player in roster
7. Edit player modal opens:
   - Can update: Name, Position, Jersey Number, Size
   - **Cannot** delete player (only Athletic Director can)
8. Makes changes and saves → Player data updated
9. Can send messages to Athletic Director about roster needs

---

## 10. Open Questions & Decisions Needed

### 10.1 Payment Model for Institutions

**Question**: Should institutions ALWAYS pay in bulk, or can we support hybrid models where some orders are paid by institution and others are split among players?

**Options:**
- **A. Institutional Payment Only**: All orders paid by Athletic Director using institution budget (simplest, matches whitepaper)
- **B. Hybrid Model**: Athletic Director can choose "Institution Pays" or "Players Pay Individually" per order (more flexible, more complex)

**Recommendation**: Start with Option A (institutional payment only) for MVP. Add Option B in future if requested.

---

### 10.2 Sub-Team Requirement

**Question**: Are sub-teams optional or required? Can a program have zero sub-teams?

**Options:**
- **A. Required**: Every program must have at least one sub-team (enforces organization)
- **B. Optional**: Programs can have zero sub-teams; players linked directly to program (simpler for small programs)

**Recommendation**: Option B (optional). Some programs like Tennis may not need sub-teams. If no sub-team, link `order_items` directly to program.

---

### 10.3 Ownership Transfer

**Question**: Can an Athletic Director transfer ownership to another user? What happens to all programs and sub-teams?

**Options:**
- **A. Transfer Entire Institution**: New owner becomes Athletic Director, all programs transfer
- **B. Transfer Individual Programs**: Programs can be transferred to different coordinators, but ownership stays with original Athletic Director
- **C. No Transfer**: Once created, Athletic Director cannot transfer ownership (must create new institution)

**Recommendation**: Option A (transfer entire institution). Use existing ownership transfer system from `TEAM_MANAGEMENT_ARCHITECTURE.md`, extend to handle institutional role updates.

---

### 10.4 Multi-Sport Design Reuse

**Question**: If a design is approved for "Soccer", can it be used for "Basketball" orders? (Cross-sport design reuse)

**Context**: Current system allows designs to have multiple sports (`designs.sports[]`). Institutions may want to reuse a logo across all sports.

**Recommendation**: Yes, allow cross-sport reuse. When creating an order for Basketball Program, show designs where `'basketball' IN designs.sports`. Athletic Director can also create "institution-wide" designs applicable to all programs.

---

### 10.5 Administrative Role Permissions

**Question**: What exactly can each administrative role do?

**Final Permissions Matrix**:

| Action | Athletic Director | Program Coordinator / Assistant | Head Coach |
|--------|------------------|----------------------------------|------------|
| Create Program | ✅ Yes | ❌ No | ❌ No |
| Delete Program | ✅ Yes | ❌ No | ❌ No |
| Create Sub-Team | ✅ Yes | ✅ Yes (within assigned program) | ❌ No |
| Edit Sub-Team | ✅ Yes (all) | ✅ Yes (assigned program only) | ❌ No |
| Add/Remove Player Data | ✅ Yes (all programs) | ✅ Yes (assigned program only) | ✅ Yes (assigned sub-team only) |
| Edit Player Data | ✅ Yes (all) | ✅ Yes (assigned program) | ✅ Yes (assigned sub-team) |
| Create Orders | ✅ Yes | ❌ No (read-only) | ❌ No |
| Approve Design Requests | ✅ Yes (all) | ✅ Yes (assigned program only) | ❌ No (read-only) |
| Adjust Budget | ✅ Yes | ❌ No (read-only) | ❌ No (read-only) |
| Make Payments | ✅ Yes | ❌ No | ❌ No |
| Send Announcements | ✅ Yes (institution-wide) | ✅ Yes (assigned program only) | ❌ No |
| Bulk CSV Import | ✅ Yes (all programs) | ✅ Yes (assigned program only) | ❌ No |

**Key Principle**: As per whitepaper, Assistant role (Program Coordinator) focuses on **data entry, communication, and progress tracking** - NOT financial decisions or order creation.

---

## 11. Success Metrics

After implementation, measure success with:

1. **Adoption Rate**: % of new teams created as institutions vs. small teams
2. **Program Count**: Average number of programs per institution (target: 5-8)
3. **Member Count**: Average members per institution (target: 100-300)
4. **Order Volume**: Orders per institution vs. orders per small team (expect 5-10x higher)
5. **Time Savings**: Time to create an order for 50 members (target: <5 minutes with bulk import)
6. **Budget Accuracy**: % of institutions that stay within allocated budgets (target: >90%)
7. **User Satisfaction**: NPS score from Athletic Directors (target: >8/10)

---

## 12. Future Enhancements (Post-MVP)

- **Season Management**: Track multiple seasons (e.g., "Fall 2025 Football", "Spring 2026 Football")
- **Inventory Tracking**: Track received items, assign to players, mark as returned
- **Player Profiles**: Individual player pages with order history, sizes, jersey number
- **Analytics Dashboard**: Charts for spending trends, popular products, order velocity
- **Mobile App**: Native iOS/Android app for Athletic Directors and Coordinators
- **Integration with SIS**: Import student data from School Information Systems
- **Custom Reporting**: Build custom reports with filters and date ranges
- **Approval Workflows**: Multi-step approval for large orders (Coordinator → Athletic Director → Principal)
- **Parent Portal**: Parents can view their child's orders and payment status

---

## 13. Summary & Next Steps

This implementation plan provides a comprehensive roadmap for building the Institution Team Dashboard, designed specifically for Athletic Directors managing large organizations with multiple sports programs.

**Key Takeaways:**
- 10-week implementation timeline across 7 phases
- 6 new database tables, 4 modified existing tables
- 25+ new API endpoints
- Distinct UI/UX from small team pages
- **Players are roster data only (NO user accounts)**
- Role-based permissions for admin staff only (Athletic Director, Program Coordinator/Assistant, Head Coach)
- Budget tracking and finance management
- Bulk operations (CSV roster import, unified orders table)
- Institution-wide communication system (admin-to-admin)

**Immediate Next Steps:**
1. Review and approve this implementation plan
2. Begin Phase 1: Database schema design and migration files
3. Create technical specification documents for each API endpoint
4. Set up development environment for institutional features
5. Schedule design review for institution dashboard UI mockups

**Ready to proceed?** Let's start with Phase 1 and build the database foundation. 🚀

---

**Document Version**: 1.0
**Last Updated**: October 12, 2025
**Author**: Claude Code (Anthropic)
**Status**: Draft - Awaiting Approval
