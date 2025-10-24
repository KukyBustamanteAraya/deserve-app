# Current State Analysis & Implementation Roadmap
## Deserve App Team Management System

**Date:** October 9, 2025
**Purpose:** Comprehensive analysis of current architecture, user flows, and gap analysis for implementing role-based team pages

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Architecture](#current-system-architecture)
3. [User Journey Flows](#user-journey-flows)
4. [Database Schema Analysis](#database-schema-analysis)
5. [Existing Components Inventory](#existing-components-inventory)
6. [Gap Analysis](#gap-analysis)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Current State

The Deserve app has a **foundational team management system** in place with:
- ✅ **Database tables** for teams, team_settings, team_memberships, design_votes, player_info
- ✅ **Type definitions** for all team-related entities
- ✅ **Permissions system** for role-based access control
- ✅ **Basic team page** at `/mi-equipo/[slug]` showing design status and members
- ✅ **Design approval component** (single-mode only)

### Missing Pieces (70% Remaining)

- ❌ **Role-specific dashboards** - Current page is generic, not differentiated by role
- ❌ **Approval mode variants** - Only "owner approves" works, missing voting & multi-design
- ❌ **Player info collection UI** - No self-service forms or manager spreadsheet
- ❌ **Dynamic rendering logic** - No conditional display based on team_settings
- ❌ **Data hooks** - No SWR/API integration for real-time data
- ❌ **Notifications** - No in-app or email alerts
- ❌ **Admin assist mode** - No impersonation/override capability

---

## Current System Architecture

### 1. File Structure

```
src/
├── app/
│   ├── login/page.tsx                     ✅ Authentication
│   ├── catalog/page.tsx                   ✅ Product browsing
│   ├── personaliza/page.tsx               ✅ Team creation (Step 1: Role selection)
│   ├── mi-equipo/
│   │   ├── page.tsx                       ✅ Team list page
│   │   └── [slug]/
│   │       ├── page.tsx                   ⚠️  Generic team page (needs split)
│   │       ├── error.tsx                  ✅ Error boundary
│   │       └── settings/page.tsx          ✅ Team settings (admin only)
│   └── teams/[team_slug]/                 🚧 NEW STRUCTURE (scaffolded, not implemented)
│       ├── dashboard/page.tsx             ❌ TODO
│       ├── design/page.tsx                ❌ TODO
│       ├── roster/page.tsx                ❌ TODO
│       ├── orders/page.tsx                ❌ TODO
│       └── activity/page.tsx              ❌ TODO
│
├── components/
│   ├── design/
│   │   └── DesignApprovalCard.tsx         ⚠️  Basic approval (needs voting support)
│   ├── team-hub/                          🚧 NEW (partial)
│   │   ├── TeamLayout.tsx                 ✅ Shared layout component
│   │   ├── Card.tsx                       ✅ Basic card component
│   │   └── ProgressBar.tsx                ✅ Progress indicator
│   └── ui/
│       ├── Skeleton.tsx                   ✅ Loading states
│       ├── TeamDashboardSkeleton.tsx      ✅ Team loading skeleton
│       ├── OrderListSkeleton.tsx          ✅ Order loading skeleton
│       └── ProductCardSkeleton.tsx        ✅ Product loading skeleton
│
├── hooks/
│   ├── useBuilderState.ts                 ✅ Design customization state
│   └── team-hub/                          🚧 NEW (only 1 hook exists)
│       └── useTeamWithDetails.ts          ⚠️  Exists but incomplete
│
├── lib/
│   ├── supabase/                          ✅ Database client
│   ├── permissions.ts                     ✅ Role-based permissions
│   └── http/json.ts                       ✅ API helper
│
├── types/
│   ├── team-hub.ts                        ✅ Complete type definitions
│   └── team-settings.ts                   ✅ Settings types
│
└── api/
    ├── teams/[id]/members/route.ts        ✅ Get team members
    ├── design-requests/route.ts           ✅ Get/create design requests
    └── orders/route.ts                    ✅ Get user orders
```

### 2. Database Tables (Supabase)

#### Core Tables

| Table | Columns | Status | Notes |
|-------|---------|--------|-------|
| `teams` | id, slug, name, sport, colors, logo_url, owner_id, current_owner_id | ✅ Complete | Team basic info |
| `team_memberships` | team_id, user_id, role_type, created_at | ✅ Complete | User-team associations |
| `team_settings` | team_id, approval_mode, min_approvals_required, player_info_mode, self_service_enabled, access_mode, allow_member_invites | ✅ Complete | Team configuration |
| `design_requests` | id, team_id, team_slug, product_name, status, mockup_urls, voting_enabled, approval_votes_count, required_approvals | ✅ Complete | Design workflow |
| `design_votes` | id, design_request_id, user_id, vote, design_option_index, comment | ✅ Complete | Voting records |
| `player_info_submissions` | id, team_id, design_request_id, user_id, player_name, jersey_number, size, position, submitted_by_manager | ✅ Complete | Player roster data |
| `orders` | id, team_id, design_request_id, status, payment_status, payment_mode, total_amount_cents | ✅ Complete | Order tracking |
| `team_ownership_history` | id, team_id, previous_owner_id, new_owner_id, transferred_by, transfer_reason | ✅ Complete | Ownership audit trail |

#### Database Views (Needed but Missing)

| View | Purpose | Status |
|------|---------|--------|
| `teams_with_details` | Join teams + team_settings | ❌ Not created |
| `team_members_view` | Join team_memberships + profiles | ❌ Not created |
| `design_requests_with_votes` | Aggregate vote counts | ❌ Not created |
| `player_info_progress` | Calculate submission % | ❌ Not created |

---

## User Journey Flows

### Flow 1: New User → Team Creation

```
1. User lands on homepage (/)
   ↓
2. Clicks "Iniciar Sesión" → /login
   ↓
3. Authenticates via Supabase Auth
   ↓
4. Redirected to /catalog
   ↓
5. Browses products by sport
   ↓
6. Clicks on a product → /catalog/[slug]
   ↓
7. Clicks "Personalizar" → /personaliza
   ↓
8. Selects role: Player/Captain OR Manager/Coach
   ↓
9. Customizes team colors & uploads logo
   ↓
10. Enters team name
   ↓
11. Clicks "Continuar" → /personaliza/uniformes (WORK IN PROGRESS)
   ↓
12. [FUTURE] Creates design request
   ↓
13. [FUTURE] Creates team in database
   ↓
14. Redirected to /mi-equipo/[slug]
```

**Current Issues:**
- ⚠️  Step 11-13 incomplete - team creation not fully implemented
- ⚠️  No clear handoff from personalization to team dashboard
- ⚠️  User role selection (player vs manager) not persisted to database

### Flow 2: Existing Team Member → Dashboard

```
1. User logs in
   ↓
2. Navigates to /mi-equipo
   ↓
3. Sees list of their teams
   ↓
4. Clicks on a team → /mi-equipo/[slug]
   ↓
5. **CURRENT PAGE (GENERIC):**
   - Team banner with colors
   - Design status card (if design exists)
   - Team members list
   - Invite/share options
   - Payment test button
   ↓
6. **DESIRED PAGE (ROLE-SPECIFIC):**
   - IF OWNER/MANAGER: Full dashboard with controls
   - IF PLAYER: Limited view with player-specific actions
```

**Current Issues:**
- ❌ No differentiation between owner and player views
- ❌ No conditional rendering based on `team_settings.approval_mode`
- ❌ No player info collection interface
- ❌ No voting interface
- ❌ No order placement UI

### Flow 3: Design Approval (Current vs Desired)

#### **Current Flow (Limited)**

```
1. Team page loads
   ↓
2. IF design_request.status === 'ready' AND mockup_urls exist:
   ↓
3. Shows DesignApprovalCard component
   ↓
4. User sees:
   - Mockup images (grid view, click to enlarge)
   - "Aprobar Diseño" button (green)
   - "Solicitar Cambios" button (yellow)
   ↓
5. IF user clicks "Aprobar":
   - Inserts record into design_feedback table
   - feedback_type: 'approval'
   - approval_status NOT updated (missing logic)
   ↓
6. IF user clicks "Solicitar Cambios":
   - Shows feedback form
   - User selects categories (colors, logos, text, layout, other)
   - User writes detailed feedback
   - Inserts into design_feedback table
```

**Issues with Current Flow:**
- ❌ Anyone can approve (no role checking)
- ❌ No support for `approval_mode` settings
- ❌ No voting interface or vote counting
- ❌ No multi-design comparison
- ❌ Feedback goes to `design_feedback` table but doesn't update `design_requests.approval_status`

#### **Desired Flow (Role-Based)**

```
1. Team page loads
   ↓
2. Fetch team_settings.approval_mode
   ↓
3. ROUTE TO CORRECT INTERFACE:

   ┌─────────────────────────────────────┐
   │ approval_mode: 'owner_only'         │
   │ ✅ IF user is owner → Approve/Reject│
   │ ❌ IF user is member → Read-only    │
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ approval_mode: 'any_member'         │
   │ ✅ All members → Approve/Reject     │
   │ First approval wins                 │
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ approval_mode: 'voting'             │
   │ ✅ Show vote buttons (Approve/Reject)│
   │ ✅ Show progress bar (3/5 approvals)│
   │ ✅ Auto-approve when threshold met  │
   │ ✅ Optional: designated_voters only │
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ approval_mode: 'multi_design_vote'  │
   │ ✅ Show 2-3 design options side by  │
   │    side                             │
   │ ✅ Each user votes for ONE option   │
   │ ✅ Winning design selected           │
   └─────────────────────────────────────┘
```

---

## Database Schema Analysis

### Key Relationships

```sql
teams (1)
  ├─── (1) team_settings
  ├─── (*) team_memberships
  ├─── (*) design_requests
  ├─── (*) player_info_submissions
  └─── (*) orders

design_requests (1)
  ├─── (*) design_votes
  ├─── (*) player_info_submissions (optional link)
  └─── (*) orders

team_memberships
  ├─── user_id → auth.users
  └─── team_id → teams
```

### Current Schema Strengths

✅ **Well-designed foreign keys** - Proper CASCADE deletes
✅ **RLS policies** - Row-level security for multi-tenancy
✅ **Flexible approval modes** - Enum type supports all scenarios
✅ **Voting infrastructure** - Tables ready for voting UI
✅ **Player info flexibility** - Supports both self-service and manager entry

### Schema Gaps

❌ **No database views** - Queries require multiple joins
❌ **No computed columns** - Vote counts calculated in app layer
❌ **No triggers** - Auto-approval logic missing
❌ **No unique constraints** - Jersey numbers can duplicate
❌ **No notification system** - No `notifications` table

### Required Database Functions

```sql
-- 1. Get team stats (for dashboard)
CREATE FUNCTION get_team_stats(team_uuid UUID)
RETURNS JSON AS $$
  -- Returns: player_info_submitted, total_members, payment_%, current_stage
$$;

-- 2. Check if user can approve design
CREATE FUNCTION can_user_approve_design(design_id BIGINT, user_uuid UUID)
RETURNS BOOLEAN AS $$
  -- Checks: team_settings.approval_mode + user role + designated_voters
$$;

-- 3. Auto-approve when threshold met
CREATE TRIGGER check_approval_threshold
AFTER INSERT ON design_votes
FOR EACH ROW
EXECUTE FUNCTION auto_approve_if_threshold_met();

-- 4. Validate unique jersey numbers
CREATE TRIGGER check_duplicate_jersey
BEFORE INSERT OR UPDATE ON player_info_submissions
FOR EACH ROW
EXECUTE FUNCTION validate_unique_jersey_number();
```

---

## Existing Components Inventory

### ✅ Working Components

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `DesignApprovalCard` | `src/components/design/` | Show mockups, approve/reject | ⚠️  Basic only |
| `CustomizeBanner` | `src/components/customize/` | Team banner with colors/logo | ✅ Complete |
| `OrderStatusBadge` | `src/components/orders/` | Display order status | ✅ Complete |
| `Skeleton` | `src/components/ui/` | Loading state skeleton | ✅ Complete |
| `ErrorBoundary` | `src/components/ui/` | Error handling | ✅ Complete |
| `ProgressBar` | `src/components/team-hub/` | Progress indicator | ✅ Complete |

### ❌ Missing Components (from TEAM_PAGE_UI_PLAN.md)

**Design Section:**
- `VotingInterface` - Vote buttons + progress bar
- `MultiDesignVoteCard` - Side-by-side design comparison
- `DesignComments` - Show vote comments
- `DesignHistoryList` - Past revisions

**Player Info Section:**
- `PlayerInfoForm` - Self-service submission form
- `PlayerInfoTable` - Editable roster table (manager view)
- `CSVUploadModal` - Import roster from CSV
- `ShareableLinkGenerator` - Create collection links
- `ReminderButton` - Send reminders to non-submitters

**Dashboard Section:**
- `NextStepCard` - "What's next?" guidance
- `StageIndicator` - Design → Roster → Payment → Production
- `QuickActions` - Shortcut buttons
- `ActivitySummary` - Recent actions feed

**Orders Section:**
- `OrderSetupCard` - Configure variants/sizes/quantities
- `VariantSelector` - Mens/Womens/Unisex + Home/Away
- `PaymentStatusBar` - Payment progress (split or bulk)
- `OrderStatusCard` - Production/shipping status
- `OrderTrackingCard` - Tracking number + delivery estimate

**Activity Section:**
- `ActivityTimeline` - Chronological log
- `RoleTag` - User role badges
- `ActionFilter` - Filter by type/user
- `ExportButton` - Export log to CSV/PDF

---

## Gap Analysis

### Priority 1: Critical Missing Features (Block user flows)

| Feature | Current State | Desired State | Impact |
|---------|---------------|---------------|--------|
| **Role-specific dashboards** | Generic page for all | Separate manager/player views | 🔴 High - Users confused about capabilities |
| **Voting interface** | Not implemented | Vote buttons + progress + auto-approve | 🔴 High - Voting mode unusable |
| **Player info collection** | No UI | Self-service form + manager table | 🔴 High - Can't collect roster data |
| **Conditional rendering** | Hardcoded | Based on team_settings | 🔴 High - Settings ignored |

### Priority 2: Important Enhancements (Improve UX)

| Feature | Current State | Desired State | Impact |
|---------|---------------|---------------|--------|
| **Database views** | Manual joins | Optimized views | 🟡 Medium - Performance |
| **Real-time updates** | Page refresh needed | SWR auto-refresh | 🟡 Medium - Stale data |
| **Skeleton loaders** | Generic loading | Context-specific skeletons | 🟡 Medium - UX polish |
| **Error handling** | Basic error page | Granular error states | 🟡 Medium - Error recovery |

### Priority 3: Nice-to-Have (Future iterations)

| Feature | Current State | Desired State | Impact |
|---------|---------------|---------------|--------|
| **Admin assist mode** | Not implemented | Impersonate users | 🟢 Low - Admin convenience |
| **Notifications** | None | Email + in-app | 🟢 Low - Proactive alerts |
| **Activity log** | None | Audit trail + export | 🟢 Low - Transparency |
| **CSV import/export** | None | Bulk roster operations | 🟢 Low - Time-saving |

---

## Implementation Roadmap

### Phase 1: Foundation Fixes (Week 1)

**Goal:** Make existing team page functional for both roles

#### Tasks:

1. **Split team page by role** (4 hours)
   ```typescript
   // src/app/mi-equipo/[slug]/page.tsx
   export default function TeamPage({ params }: { params: { slug: string } }) {
     const { team, currentUserRole } = useTeamWithDetails(params.slug);

     if (currentUserRole === 'owner' || currentUserRole === 'sub_manager') {
       return <ManagerDashboard team={team} />;
     } else {
       return <PlayerDashboard team={team} />;
     }
   }
   ```

2. **Create useTeamWithDetails hook** (2 hours)
   - Fetch team + team_settings + user's role
   - Use SWR for caching
   - Return computed permissions

3. **Create ManagerDashboard component** (4 hours)
   - Team overview stats
   - Design approval section (conditional on approval_mode)
   - Player info management
   - Member list with controls
   - Quick actions

4. **Create PlayerDashboard component** (3 hours)
   - Current design (view-only or vote UI)
   - Player info form (if self_service_enabled)
   - Own orders
   - Team info (read-only)

**Deliverables:**
- ✅ Role-specific dashboards
- ✅ `useTeamWithDetails` hook
- ✅ Basic conditional rendering

---

### Phase 2: Approval Modes (Week 2)

**Goal:** Support all 4 approval modes

#### Tasks:

1. **Enhance DesignApprovalCard** (3 hours)
   - Add props: `approvalMode`, `userRole`, `teamSettings`
   - Conditional rendering:
     - `owner_only`: Show buttons only to owner
     - `any_member`: Show buttons to all
     - `voting`: Redirect to VotingInterface
     - `multi_design_vote`: Redirect to MultiDesignVoteCard

2. **Create VotingInterface component** (5 hours)
   - Vote buttons (Approve, Reject, Abstain)
   - Progress bar (X of Y approvals)
   - Optional comment textarea
   - Submit vote → insert into design_votes
   - Real-time vote count updates (SWR)
   - Auto-approval logic (when threshold met)

3. **Create MultiDesignVoteCard** (4 hours)
   - Display 2-3 design options side-by-side
   - Each option shows mockups + vote count
   - User can select ONE option
   - Highlight user's vote
   - Allow vote changes (if team settings allow)
   - Winner selected when majority reached

4. **Create database trigger** (2 hours)
   ```sql
   CREATE TRIGGER auto_approve_design
   AFTER INSERT ON design_votes
   FOR EACH ROW
   EXECUTE FUNCTION check_and_approve_design();
   ```

**Deliverables:**
- ✅ All 4 approval modes working
- ✅ Vote counting and auto-approval
- ✅ Multi-design comparison UI

---

### Phase 3: Player Info Collection (Week 3)

**Goal:** Complete roster collection workflow

#### Tasks:

1. **Create PlayerInfoForm component** (4 hours)
   - Fields: name, jersey_number, size, position, notes
   - Size selector (Youth S-XL, Adult S-3XL)
   - Real-time jersey number validation (check duplicates)
   - Submit → insert into player_info_submissions
   - Success confirmation message

2. **Create PlayerInfoTable component** (5 hours)
   - Editable table (inline editing)
   - Manager can add/edit/delete rows
   - Show submission status (self-submitted vs manager-entered)
   - Duplicate jersey number warnings
   - Progress indicator (12/15 submitted)

3. **Create ShareableLinkGenerator** (3 hours)
   - Generate unique token
   - Create shareable URL: `/collect/{token}`
   - Display QR code (for WhatsApp sharing)
   - Copy link button
   - Expiration date selector

4. **Create ReminderButton component** (2 hours)
   - List non-submitters
   - "Send Reminders" button
   - Trigger email/SMS via API
   - Show last reminder sent timestamp

5. **Create /collect/[token]/page.tsx** (4 hours)
   - Public page (no login required)
   - Token validation
   - PlayerInfoForm (embedded)
   - Thank you message after submission
   - Show team branding (colors, logo)

**Deliverables:**
- ✅ Self-service player info collection
- ✅ Manager roster management
- ✅ Shareable collection links
- ✅ Reminder system

---

### Phase 4: Database Optimizations (Week 4)

**Goal:** Improve query performance and data consistency

#### Tasks:

1. **Create database views** (3 hours)
   ```sql
   CREATE VIEW teams_with_details AS ...;
   CREATE VIEW team_members_view AS ...;
   CREATE VIEW design_requests_with_votes AS ...;
   CREATE VIEW player_info_progress AS ...;
   ```

2. **Create helper functions** (3 hours)
   ```sql
   CREATE FUNCTION get_team_stats(UUID) RETURNS JSON;
   CREATE FUNCTION can_user_approve_design(BIGINT, UUID) RETURNS BOOLEAN;
   CREATE FUNCTION check_duplicate_jersey(UUID, TEXT, UUID) RETURNS BOOLEAN;
   ```

3. **Add database constraints** (2 hours)
   ```sql
   -- Unique jersey number per team
   ALTER TABLE player_info_submissions
   ADD CONSTRAINT unique_team_jersey
   UNIQUE (team_id, jersey_number);
   ```

4. **Add indexes** (1 hour)
   ```sql
   CREATE INDEX idx_design_votes_request_user ON design_votes(design_request_id, user_id);
   CREATE INDEX idx_player_info_team ON player_info_submissions(team_id);
   ```

5. **Migrate existing data** (2 hours)
   - Populate team_settings for all teams
   - Set default approval_mode to 'owner_only'
   - Set default player_info_mode to 'hybrid'

**Deliverables:**
- ✅ Optimized database queries
- ✅ Data integrity constraints
- ✅ Helper functions for complex logic

---

### Phase 5: Polish & Testing (Week 5)

**Goal:** Production-ready quality

#### Tasks:

1. **Error handling** (3 hours)
   - Granular error boundaries for each section
   - Retry mechanisms
   - User-friendly error messages
   - Fallback UI

2. **Loading states** (2 hours)
   - Section-specific skeletons
   - Optimistic UI updates
   - Suspense boundaries

3. **Accessibility** (3 hours)
   - Keyboard navigation
   - ARIA labels
   - Screen reader testing
   - Focus management

4. **Mobile responsive** (4 hours)
   - Test all layouts on mobile
   - Touch-friendly buttons
   - Responsive tables → cards on mobile

5. **Integration testing** (4 hours)
   - Test all 4 approval modes
   - Test all 3 player info modes
   - Test role permissions
   - Test error scenarios

6. **Performance optimization** (3 hours)
   - Code splitting
   - Image optimization
   - Lazy loading
   - SWR cache tuning

**Deliverables:**
- ✅ Robust error handling
- ✅ Smooth loading states
- ✅ Accessible UI
- ✅ Mobile-friendly
- ✅ Performance optimized

---

## Summary

### Current Progress: 30%

✅ **Completed:**
- Database schema (teams, memberships, settings, votes, player info)
- Type definitions
- Permissions system
- Basic team page
- Basic design approval

### Remaining Work: 70%

**Critical Path (Weeks 1-3):**
1. Role-specific dashboards → 4 hours
2. Approval mode variants → 14 hours
3. Player info collection → 18 hours

**Total Estimated Time:** ~80 hours (10 days at 8 hrs/day)

**Dependencies:**
- Week 1 must complete first (foundation for all other work)
- Week 2 and Week 3 can run in parallel (different features)
- Week 4 can run in parallel with Week 3
- Week 5 must be last (testing and polish)

---

## Next Immediate Steps

**Today (Session 1):**
1. ✅ Complete this analysis document
2. Create `useTeamWithDetails` hook (with proper SWR)
3. Split current team page into ManagerDashboard + PlayerDashboard
4. Test role differentiation

**Tomorrow (Session 2):**
1. Enhance DesignApprovalCard with mode detection
2. Create VotingInterface component
3. Add vote submission API endpoint
4. Test voting flow end-to-end

**This Week:**
- Complete Phase 1 (Foundation Fixes)
- Start Phase 2 (Approval Modes)
- Target: 30% → 50% completion

---

## Questions for User

Before proceeding with implementation, please confirm:

1. **Priority:** Is the critical path (role dashboards → voting → player info) correct?
2. **Timeline:** Is the 10-day estimate (80 hours) acceptable?
3. **Approach:** Should we tackle Phases 1-2 first, or prioritize a specific feature?
4. **Existing Code:** The current `/mi-equipo/[slug]/page.tsx` - refactor in place or create new `/teams/[slug]` structure?
5. **Testing:** Do you want to see working demos after each phase, or all at once?

**Ready to begin implementation!** 🚀
