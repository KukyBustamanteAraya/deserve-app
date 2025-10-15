# Institution Team Dashboard - Implementation Gap Analysis
**Date:** October 15, 2025
**Status:** Comprehensive Analysis of Current State vs. Planned Features

---

## Executive Summary

The institution dashboard implementation is **approximately 40% complete**. The foundational database schema, basic API endpoints, and core UI components exist, but critical features for providing "full service" to Athletic Directors are missing.

**Current Completion by Phase:**
- ✅ Phase 1: Database Schema & Architecture - **100% COMPLETE**
- 🟡 Phase 2: Dashboard & Program Management - **70% COMPLETE**
- ❌ Phase 3: Bulk Roster Management & CSV Import - **0% COMPLETE**
- 🟡 Phase 4: Order Management & Budget Tracking - **30% COMPLETE**
- ❌ Phase 5: Communication & Announcements - **0% COMPLETE**
- ❌ Phase 6: Reporting & Analytics - **0% COMPLETE**
- ❌ Phase 7: Testing & Refinement - **0% COMPLETE**

**Overall Completion: ~40%**

---

## ✅ What Currently EXISTS (Phase 1-2 Partial)

### 1. Database Schema (✅ 100% Complete)

**Tables Created:**
- ✅ `institution_sub_teams` - Stores programs/sub-teams with all fields
- ✅ `institution_sub_team_members` - Stores player roster data (NOT user accounts)

**Table Extensions:**
- ✅ `teams.team_type` - Supports 'institution' type
- ✅ `teams.institution_name` - Institution name field
- ✅ `team_memberships.institution_role` - Role hierarchy (athletic_director, program_coordinator, head_coach, assistant)
- ✅ `orders.sub_team_id` - Links orders to sub-teams
- ✅ `design_requests.sub_team_id` - Links design requests to sub-teams
- ✅ `team_settings` - 5 institution-specific columns added

**RLS Policies:**
- ✅ 9 RLS policies created for role-based access control
- ✅ Helper functions: `get_institution_sub_teams()`, `has_institution_role()`

**Migration Status:**
- ✅ Applied on 2025-10-12
- ✅ Verified and documented in CURRENT_DATABASE_SCHEMA.md

---

### 2. API Endpoints (🟡 70% Complete)

**Implemented:**
- ✅ `GET /api/institutions/[slug]/overview` - Institution dashboard data
- ✅ `GET /api/institutions/[slug]/sub-teams` - List all programs
- ✅ `POST /api/institutions/[slug]/sub-teams` - Create new program (Athletic Director only)
- ✅ `GET /api/institutions/[slug]/sub-teams/[id]` - Get specific program
- ✅ `GET /api/institutions/[slug]/sub-teams/[id]/members` - Get program roster
- ✅ `POST /api/institutions/[slug]/sub-teams/[id]/members` - Add individual member
- ✅ `PATCH /api/institutions/[slug]/sub-teams/[id]/members/[memberId]` - Edit member
- ✅ `DELETE /api/institutions/[slug]/sub-teams/[id]/members/[memberId]` - Remove member
- ✅ `GET /api/institutions/[slug]/orders` - List orders (with filters)
- ✅ `GET /api/institutions/[slug]/activity` - Activity feed

**Features:**
- ✅ Authentication and authorization checks
- ✅ Role-based permissions (Athletic Director verification)
- ✅ Input validation with Zod schemas
- ✅ Proper error handling and logging
- ✅ Filtering support for orders endpoint

---

### 3. UI Components (🟡 65% Complete)

**Dashboard Components:**
- ✅ `InstitutionStatsCards` - Overview stats (members, programs, orders)
- ✅ `ProgramsBySport` - Tabbed view of programs grouped by sport
- ✅ `ActivityFeed` - Recent activity stream
- ✅ `OrdersTable` - Unified orders table with filters
- ✅ `OrderDetailModal` - View order details
- ✅ `OrdersFilterBar` - Filter orders by status, program, etc.
- ✅ `ActiveOrdersSummary` - Summary cards for active orders
- ✅ `QuickActionsBar` - Quick action buttons

**Modal Components:**
- ✅ `AddProgramModal` - Create new sports program
- ✅ `CreateTeamModal` - Create sub-team within program

**Features:**
- ✅ Responsive design with glass morphism UI
- ✅ Gender category badges (male, female, both)
- ✅ Sport-specific icons and emojis
- ✅ Real-time data fetching with error handling
- ✅ Loading states and empty states
- ✅ Role-based UI rendering (Athletic Director sees all, Coordinators see their program)

---

### 4. Institution Dashboard Page (🟡 70% Complete)

**File:** `/src/app/mi-equipo/[slug]/page.tsx`

**Implemented Features:**
- ✅ Detects `team_type === 'institution'` and renders institution-specific UI
- ✅ Fetches institution overview data
- ✅ Displays stats cards (members, programs, active orders)
- ✅ Shows programs grouped by sport in tabbed interface
- ✅ Activity feed with recent events
- ✅ Orders table with filtering
- ✅ "Add Program" functionality
- ✅ "Create Sub-Team" functionality
- ✅ Role-based UI (AD sees everything, Coordinators see their program)

---

## ❌ What's MISSING (Critical Gaps for Full Service)

### Phase 3: Bulk Roster Management & CSV Import (❌ 0% Complete)

**Missing Features:**
1. **CSV Upload UI Component**
   - File upload dropzone
   - CSV format template download
   - Preview table before import
   - Progress indicator during upload

2. **CSV Parser & Validator**
   - Parse CSV file on client or server
   - Validate required fields (name, sub_team)
   - Email validation (optional field)
   - Size validation (S, M, L, XL, XXL)
   - Jersey number uniqueness check

3. **Bulk Import API Endpoint**
   - `POST /api/institutions/[slug]/programs/[programId]/import-roster`
   - Process CSV rows
   - Create `institution_sub_team_members` records
   - Return import summary (success/failed counts, errors)
   - Rollback on critical errors

4. **Import Summary Modal**
   - Show imported count
   - Show skipped count
   - Display validation errors
   - Allow retry for failed rows

**Why Critical:**
Without CSV import, Athletic Directors must manually add 50-300 players ONE BY ONE, which is completely impractical for institutions. This is a **blocker for real-world adoption**.

**Estimated Development Time:** 1 week

---

### Phase 4: Order Management & Budget Tracking (🟡 30% Complete)

**What Exists:**
- ✅ Orders API endpoint with filtering
- ✅ Orders table UI component
- ✅ Basic order creation (but not institution-specific)

**Missing Features:**

#### 4.1 Institution-Specific Order Creation Wizard (❌ 0% Complete)
**Current Issue:** Order creation wizard is designed for small teams. Doesn't include program/sub-team selection or budget allocation.

**Needs:**
- **Step 1:** Select program and sub-team
- **Step 2:** Select approved design for that sport
- **Step 3:** Auto-load players from sub-team roster (not from user accounts)
- **Step 4:** Assign sizes to each player
- **Step 5:** Review total cost and assign budget allocation

**API Endpoint Needed:**
- `POST /api/institutions/[slug]/orders` - Create order with `program_id`, `sub_team_id`, `budget_allocation_id`

#### 4.2 Budget Allocation System (❌ 0% Complete)
**Missing Tables:**
The implementation **simplified** the original plan. The `institution_programs` table was **NOT created**. Instead, `institution_sub_teams` serves as both programs AND sub-teams.

**This causes a problem:** There's no dedicated budget per PROGRAM (e.g., "Football Program Budget: $12,000"). Budget would need to be tracked at institution level or sub-team level.

**Options to Fix:**
1. **Add budget fields to `institution_sub_teams`** - Simple but less flexible
2. **Create `institution_programs` table** - Matches original plan, more robust
3. **Track budget in `teams` table only** - Institution-wide budget, no per-program tracking

**Recommendation:** Create `institution_programs` table as originally planned for proper budget hierarchy.

**Missing Features:**
- Budget allocation when creating orders
- Budget validation (prevent over-allocation)
- `institution_budget_allocations` table
- Budget deduction from program budget
- Budget remaining calculations

#### 4.3 Finance Dashboard (❌ 0% Complete)
**File Needed:** `/src/app/mi-equipo/[slug]/finance/page.tsx`

**Missing Features:**
- Institution-wide budget overview
- Budget by program table
- Allocated vs. Spent vs. Remaining progress bars
- Transaction history
- Budget adjustment modal
- CSV/PDF export

**API Endpoints Needed:**
- `GET /api/institutions/[slug]/finance/overview` - Finance dashboard data
- `GET /api/institutions/[slug]/finance/transactions` - Transaction history
- `PATCH /api/institutions/[slug]/finance/adjust-budgets` - Update program budgets

**Why Critical:**
Athletic Directors need to know how much budget is allocated, spent, and remaining across all programs. This is **essential for financial planning and compliance**.

**Estimated Development Time:** 2 weeks

---

### Phase 5: Communication & Announcements (❌ 0% Complete)

**Missing Features:**

#### 5.1 Announcement System (❌ 0% Complete)
**Missing Tables:**
- `institution_announcements` - Stores announcements
- `institution_announcement_reads` - Tracks who read each announcement

**Missing API Endpoints:**
- `POST /api/institutions/[slug]/announcements` - Create announcement
- `GET /api/institutions/[slug]/announcements` - List announcements for user
- `PATCH /api/institutions/[slug]/announcements/[id]/read` - Mark as read

**Missing UI Components:**
- Announcement creation modal
- Audience targeting UI (all, specific program, specific sub-team)
- Email send checkbox
- Announcement feed/notification center
- Unread count badge

#### 5.2 Email Integration (❌ 0% Complete)
**Missing:**
- Email service integration (Resend, SendGrid, etc.)
- Email templates for announcements
- Email queue system
- Email sending logic in announcement creation

**Why Critical:**
Athletic Directors need to communicate with coaches and coordinators about schedule changes, order updates, and important announcements. Currently **no way to broadcast messages** institution-wide or to specific programs.

**Estimated Development Time:** 1.5 weeks

---

### Phase 6: Reporting & Analytics (❌ 0% Complete)

**Missing Features:**

#### 6.1 CSV Exports (❌ 0% Complete)
**Needed Exports:**
- Orders CSV (all orders with filters)
- Member roster CSV (all players across all programs)
- Financial report CSV (budget allocations and spending)

**API Endpoints Needed:**
- `GET /api/institutions/[slug]/reports/orders?format=csv`
- `GET /api/institutions/[slug]/reports/members?format=csv`
- `GET /api/institutions/[slug]/reports/finance?format=csv`

#### 6.2 Analytics Dashboard (❌ 0% Complete)
**Missing Charts:**
- Orders over time (line chart)
- Spending by program (pie chart)
- Member growth over time (line chart)
- Top products ordered (bar chart)

#### 6.3 PDF Reports (❌ 0% Complete)
**Needed:**
- Financial report PDF generation
- Order summary PDF
- Roster PDF for printing

**Why Critical:**
Athletic Directors need to provide reports to principals, superintendents, and school boards. **CSV and PDF exports are mandatory** for compliance and auditing.

**Estimated Development Time:** 1.5 weeks

---

### Phase 7: Testing & Refinement (❌ 0% Complete)

**Missing:**
- End-to-end testing of all institution features
- RLS policy testing with different roles
- Performance testing with large datasets (500+ members, 100+ orders)
- UI/UX refinement based on user feedback
- Mobile responsiveness testing
- User guide documentation

**Estimated Development Time:** 1 week

---

## 🚨 Critical Blockers for Athletic Directors

### Blocker #1: No Bulk CSV Roster Import ⚠️
**Impact:** CRITICAL
**Why:** Athletic Directors manage 50-500 players. Adding them one-by-one is **completely impractical**.
**Status:** ❌ 0% Complete
**Priority:** 🔴 **HIGHEST - START IMMEDIATELY**

### Blocker #2: No Budget Management System ⚠️
**Impact:** CRITICAL
**Why:** Athletic Directors must track budgets per program. Without this, they **cannot allocate funds** or ensure they stay within budget.
**Status:** ❌ 0% Complete (no program budget table, no finance dashboard)
**Priority:** 🔴 **HIGHEST - CRITICAL FOR INSTITUTIONAL USE**

### Blocker #3: Order Creation Not Institution-Friendly ⚠️
**Impact:** HIGH
**Why:** Current order wizard doesn't allow selecting program/sub-team or assigning budget. Athletic Directors **cannot create orders** properly.
**Status:** 🟡 30% Complete (basic orders work, but missing institution-specific flow)
**Priority:** 🟠 **HIGH - REQUIRED FOR ORDERS**

### Blocker #4: No Communication System ⚠️
**Impact:** MEDIUM-HIGH
**Why:** Athletic Directors need to send announcements to all coaches or specific programs. Currently **no way to communicate** institution-wide.
**Status:** ❌ 0% Complete
**Priority:** 🟠 **HIGH - IMPORTANT FOR OPERATIONS**

### Blocker #5: No Reporting & Exports ⚠️
**Impact:** MEDIUM
**Why:** Athletic Directors must provide reports to school administration. **CSV and PDF exports are mandatory** for compliance.
**Status:** ❌ 0% Complete
**Priority:** 🟡 **MEDIUM - REQUIRED FOR COMPLIANCE**

---

## 📊 Feature Completion Matrix

| Feature Category | Sub-Feature | Status | Completion | Priority | Est. Time |
|-----------------|-------------|---------|-----------|----------|-----------|
| **Phase 1: Database Schema** | All tables & RLS | ✅ Complete | 100% | - | - |
| **Phase 2: Dashboard & Programs** | Overview dashboard | ✅ Complete | 100% | - | - |
| | Program cards UI | ✅ Complete | 100% | - | - |
| | Add program modal | ✅ Complete | 100% | - | - |
| | Create sub-team modal | ✅ Complete | 100% | - | - |
| | Activity feed | ✅ Complete | 100% | - | - |
| | Orders table | ✅ Complete | 100% | - | - |
| | Program detail page | ❌ Missing | 0% | 🟡 Medium | 3 days |
| **Phase 3: Bulk Roster Mgmt** | CSV upload UI | ❌ Missing | 0% | 🔴 Highest | 2 days |
| | CSV parser & validator | ❌ Missing | 0% | 🔴 Highest | 2 days |
| | Bulk import API | ❌ Missing | 0% | 🔴 Highest | 2 days |
| | Import summary UI | ❌ Missing | 0% | 🔴 Highest | 1 day |
| **Phase 4: Orders & Budget** | Institution order wizard | ❌ Missing | 0% | 🟠 High | 3 days |
| | Budget allocation system | ❌ Missing | 0% | 🔴 Highest | 5 days |
| | Finance dashboard | ❌ Missing | 0% | 🔴 Highest | 5 days |
| | Budget adjustment UI | ❌ Missing | 0% | 🔴 Highest | 2 days |
| **Phase 5: Communication** | Announcement creation UI | ❌ Missing | 0% | 🟠 High | 2 days |
| | Announcement tables (DB) | ❌ Missing | 0% | 🟠 High | 1 day |
| | Audience targeting | ❌ Missing | 0% | 🟠 High | 2 days |
| | Email integration | ❌ Missing | 0% | 🟠 High | 3 days |
| | In-app notifications | ❌ Missing | 0% | 🟠 High | 2 days |
| **Phase 6: Reporting** | Orders CSV export | ❌ Missing | 0% | 🟡 Medium | 2 days |
| | Members CSV export | ❌ Missing | 0% | 🟡 Medium | 2 days |
| | Finance CSV export | ❌ Missing | 0% | 🟡 Medium | 2 days |
| | PDF report generation | ❌ Missing | 0% | 🟡 Medium | 3 days |
| | Analytics dashboard | ❌ Missing | 0% | 🔵 Low | 5 days |
| **Phase 7: Testing** | E2E testing | ❌ Missing | 0% | 🟡 Medium | 5 days |
| | Performance testing | ❌ Missing | 0% | 🟡 Medium | 2 days |
| | Documentation | ❌ Missing | 0% | 🟡 Medium | 3 days |

---

## 🎯 Recommended Implementation Priority

### 🔴 **CRITICAL (Start Immediately)**

#### Sprint 1: Bulk Roster Management (Week 1)
**Goal:** Enable Athletic Directors to import 50-500 players via CSV

**Tasks:**
1. Create CSV upload UI component with dropzone
2. Build CSV parser and validator (client-side or server-side)
3. Implement `POST /api/institutions/[slug]/sub-teams/[id]/import-roster` endpoint
4. Add import summary modal showing success/failed counts
5. Test with large CSV files (300+ rows)

**Deliverables:**
- ✅ Athletic Directors can upload CSV with player roster data
- ✅ System validates and imports players into `institution_sub_team_members`
- ✅ Errors are shown clearly with row numbers
- ✅ Import completes in <10 seconds for 300 players

---

#### Sprint 2: Budget Management Foundation (Week 2)
**Goal:** Create budget allocation system for Athletic Directors

**Decision Point:** Do we create `institution_programs` table or add budget to `institution_sub_teams`?

**Recommendation:** **Create `institution_programs` table** to match original plan.

**Tasks:**
1. Create `institution_programs` migration
2. Create `institution_budget_allocations` migration
3. Modify `institution_sub_teams` to reference `program_id` instead of directly to `institution_team_id`
4. Update existing sub-teams data to link to new programs
5. Create program management APIs:
   - `POST /api/institutions/[slug]/programs`
   - `GET /api/institutions/[slug]/programs`
   - `PATCH /api/institutions/[slug]/programs/[id]`
6. Add budget fields to program creation/editing

**Deliverables:**
- ✅ Programs table created with budget tracking
- ✅ Sub-teams linked to programs
- ✅ Budget can be allocated per program
- ✅ Existing data migrated successfully

---

#### Sprint 3: Finance Dashboard (Week 3)
**Goal:** Provide budget visibility and control

**Tasks:**
1. Create `/mi-equipo/[slug]/finance/page.tsx`
2. Implement `GET /api/institutions/[slug]/finance/overview` endpoint
3. Build budget overview section (total, allocated, spent, remaining)
4. Build budget by program table with progress bars
5. Create budget adjustment modal
6. Implement `PATCH /api/institutions/[slug]/finance/adjust-budgets` endpoint

**Deliverables:**
- ✅ Athletic Directors see institution-wide budget status
- ✅ Budget broken down by program
- ✅ Can adjust program budgets within total budget
- ✅ Real-time budget validation

---

### 🟠 **HIGH PRIORITY (Weeks 4-5)**

#### Sprint 4: Institution Order Creation (Week 4)
**Goal:** Allow Athletic Directors to create orders with budget allocation

**Tasks:**
1. Modify order creation wizard to detect institution type
2. Add program/sub-team selection steps
3. Auto-load players from sub-team roster (not user accounts)
4. Add size assignment for each player
5. Implement budget allocation during order creation
6. Create `POST /api/institutions/[slug]/orders` endpoint
7. Link orders to `institution_budget_allocations` table

**Deliverables:**
- ✅ Athletic Directors can create orders for sub-teams
- ✅ Order automatically allocates budget from program
- ✅ Budget validation prevents over-allocation
- ✅ Orders appear in unified orders table

---

#### Sprint 5: Communication System (Week 5)
**Goal:** Enable institution-wide announcements

**Tasks:**
1. Create `institution_announcements` and `institution_announcement_reads` tables
2. Build announcement creation modal
3. Implement audience targeting UI (all, program, sub-team)
4. Create `POST /api/institutions/[slug]/announcements` endpoint
5. Implement email integration (Resend or SendGrid)
6. Build in-app notification center
7. Add unread badge to dashboard

**Deliverables:**
- ✅ Athletic Directors can create announcements
- ✅ Announcements sent to correct audience (all, program, sub-team)
- ✅ Email notifications sent if enabled
- ✅ Unread count badge visible on dashboard

---

### 🟡 **MEDIUM PRIORITY (Weeks 6-7)**

#### Sprint 6: Program Detail Pages (Week 6)
**Goal:** Provide detailed view of each program

**Tasks:**
1. Create `/mi-equipo/[slug]/programs/[sportSlug]/page.tsx`
2. Show sub-teams within program
3. Show orders for program
4. Show members for program
5. Show budget tracker for program
6. Add program-level actions (add sub-team, create order)

**Deliverables:**
- ✅ Clicking on a program card navigates to program detail page
- ✅ All program data visible in one place
- ✅ Can manage sub-teams, orders, and members from program page

---

#### Sprint 7: Reporting & Exports (Week 7)
**Goal:** Provide CSV/PDF exports for compliance

**Tasks:**
1. Implement `GET /api/institutions/[slug]/reports/orders?format=csv`
2. Implement `GET /api/institutions/[slug]/reports/members?format=csv`
3. Implement `GET /api/institutions/[slug]/reports/finance?format=pdf`
4. Add "Export CSV" buttons to orders table
5. Add "Export Roster" button to members page
6. Add "Generate PDF" button to finance dashboard

**Deliverables:**
- ✅ Orders exportable to CSV
- ✅ Member roster exportable to CSV
- ✅ Financial report exportable to PDF
- ✅ Exports include all relevant data with filters applied

---

### 🔵 **LOW PRIORITY (Weeks 8-10)**

#### Sprint 8: Analytics Dashboard (Optional)
**Goal:** Provide visual insights

**Tasks:**
1. Add chart library (Recharts or Chart.js)
2. Create orders over time chart
3. Create spending by program chart
4. Create member growth chart
5. Add filters for date range

---

#### Sprint 9: Testing & Polish (Weeks 9-10)
**Goal:** Ensure production-ready quality

**Tasks:**
1. End-to-end testing with real data
2. Performance testing with 500+ members
3. RLS policy testing with different roles
4. Mobile responsiveness fixes
5. UI/UX refinements
6. User guide documentation
7. Video tutorials for Athletic Directors

---

## 💰 Estimated Total Development Time

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Sprint 1: Bulk CSV Import | 4 tasks | 5 days |
| Sprint 2: Budget Foundation | 6 tasks | 7 days |
| Sprint 3: Finance Dashboard | 6 tasks | 7 days |
| Sprint 4: Institution Orders | 7 tasks | 5 days |
| Sprint 5: Communication | 7 tasks | 7 days |
| Sprint 6: Program Detail Pages | 6 tasks | 4 days |
| Sprint 7: Reporting & Exports | 6 tasks | 5 days |
| Sprint 8: Analytics (Optional) | 5 tasks | 5 days |
| Sprint 9: Testing & Polish | 7 tasks | 10 days |
| **TOTAL** | **54 tasks** | **55 days (~11 weeks)** |

**With parallel development (2 developers):** ~6 weeks

---

## 📝 Summary & Recommendations

### Current State
- **40% Complete** - Foundation is solid, but critical features missing
- Database schema ✅ **DONE**
- Basic dashboard ✅ **DONE**
- **Bulk CSV import ❌ MISSING** (CRITICAL BLOCKER)
- **Budget management ❌ MISSING** (CRITICAL BLOCKER)
- **Institution orders ❌ MISSING** (CRITICAL BLOCKER)

### To Provide "Full Service" to Athletic Directors
You must implement **at minimum:**
1. ✅ **Bulk CSV Roster Import** (Sprint 1) - Non-negotiable, absolutely critical
2. ✅ **Budget Management System** (Sprints 2-3) - Essential for financial control
3. ✅ **Institution Order Creation** (Sprint 4) - Required for placing orders
4. ✅ **Communication System** (Sprint 5) - Important for operations
5. ✅ **Reporting & Exports** (Sprint 7) - Required for compliance

### Recommended Action Plan
1. **Start Sprint 1 (Bulk CSV Import) immediately** - This is the #1 blocker
2. **Weeks 2-3:** Implement budget management (foundation + dashboard)
3. **Week 4:** Implement institution order creation
4. **Week 5:** Implement communication system
5. **Weeks 6-7:** Add program detail pages and reporting

**After these 7 sprints, you will have a production-ready institution dashboard that provides full service to Athletic Directors.**

---

**Document Created:** October 15, 2025
**Author:** Claude Code (Anthropic)
**Status:** Comprehensive Gap Analysis - Ready for Development Prioritization
