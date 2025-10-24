# Team Hub System - Implementation Status

## ✅ COMPLETED (Phase 1)

### 1. Route Structure
Created directories for:
```
/teams/[team_slug]/dashboard
/teams/[team_slug]/design
/teams/[team_slug]/roster
/teams/[team_slug]/orders
/teams/[team_slug]/activity
```

### 2. Type Definitions (`/src/types/team-hub.ts`)
- ✅ `RoleType`: owner | sub_manager | assistant | member | admin
- ✅ `TeamWithDetails`: Complete team data including settings
- ✅ `TeamMember`: Member data with role
- ✅ `DesignRequest`: Full design request schema
- ✅ `DesignVote`: Vote tracking
- ✅ `PlayerInfo`: Roster data with gender, variant, kit_type
- ✅ `Order`: Order with variants (mens/womens, home/away)
- ✅ `OrderVariant`: Detailed variant structure
- ✅ `ActivityLogEntry`: Audit trail entries
- ✅ `TeamStats`: Dashboard statistics
- ✅ `UserPermissions`: Permission flags
- ✅ `Notification`: In-app notifications

### 3. Permissions System (`/src/lib/permissions.ts`)
- ✅ `calculatePermissions()`: Compute permissions based on role + settings
- ✅ `can()`: Check specific permission
- ✅ `getRoleDisplayName()`: Human-readable role names
- ✅ `getRoleBadgeColor()`: Color coding for roles

**Permission Matrix:**
| Permission | Owner | Sub-Manager | Member | Admin |
|------------|-------|-------------|--------|-------|
| Approve Design | ✅ | ❌ | ⚙️ | ✅ |
| Vote on Design | ✅ | ⚙️ | ⚙️ | ✅ |
| Edit Roster | ✅ | ✅ | ⚙️ | ✅ |
| Manage Payments | ✅ | ❌ | ❌ | ✅ |
| Manage Members | ✅ | ❌ | ❌ | ✅ |
| Send Reminders | ✅ | ✅ | ❌ | ✅ |
| Update Order Status | ❌ | ❌ | ❌ | ✅ |

⚙️ = Depends on team settings

### 4. Shared Layout (`/src/components/team-hub/TeamLayout.tsx`)
- ✅ Team header with colors and logo
- ✅ Navigation tabs (Dashboard, Design, Roster, Orders, Activity)
- ✅ Role badge display
- ✅ Admin assist mode indicator
- ✅ Responsive design

### 5. UI Components (`/src/components/team-hub/`)
- ✅ `Card`, `CardHeader`, `CardContent`: Consistent card layout
- ✅ `ProgressBar`: Animated progress indicators with colors

---

## 🚧 IN PROGRESS

### Data Hooks (Next Step)
Need to create custom hooks for data fetching:
```typescript
useTeamWithDetails(slug)      // Fetch team + settings
useTeamMembers(teamId)         // Fetch members with roles
useDesignRequests(teamId)      // Fetch design requests
usePlayerInfo(teamId)          // Fetch roster data
useOrders(teamId)              // Fetch orders
useActivityLog(teamId)         // Fetch activity log
useTeamStats(teamId)           // Fetch dashboard stats
```

---

## 📋 TODO (Remaining Phases)

### Phase 2: Page Implementations

#### 2.1 Dashboard Page (`/teams/[slug]/dashboard/page.tsx`)
**Manager View:**
- [ ] Team overview stats (player info %, payment %, stage)
- [ ] Current stage indicator (Design → Roster → Payment → Production → Shipping)
- [ ] Next step card ("What's next?")
- [ ] Quick actions (shortcuts to other sections)
- [ ] Activity summary (last 5 actions)

**Sub-Manager View:**
- [ ] Same as manager but limited actions
- [ ] Can send reminders

**Player View:**
- [ ] Progress summary
- [ ] Own submission status
- [ ] Design preview
- [ ] Order tracking

**Components Needed:**
- `NextStepCard`
- `StageIndicator`
- `QuickActions`
- `ActivitySummary`

#### 2.2 Design Page (`/teams/[slug]/design/page.tsx`)
**Approval Modes:**
- [ ] Owner Only: Approve/Reject buttons (owner only)
- [ ] Any Member: Approve/Reject buttons (all members)
- [ ] Voting: Vote interface with progress bar
- [ ] Multi-Design Vote: Side-by-side design options

**Components Needed:**
- `DesignApprovalCard` (enhance existing)
- `VotingInterface`
- `MultiDesignVoteCard`
- `DesignComments`
- `DesignHistoryList`

#### 2.3 Roster Page (`/teams/[slug]/roster/page.tsx`)
**Manager View:**
- [ ] Editable roster table (inline editing)
- [ ] CSV import/export
- [ ] Submission progress bar ("12/15 submitted")
- [ ] Send reminders button
- [ ] Add player manually
- [ ] Duplicate jersey number validation

**Sub-Manager View:**
- [ ] Same as manager (can edit)

**Player View (Self-Service Enabled):**
- [ ] Player info form (own data only)
- [ ] Confirmation summary after submission

**Player View (Manager Only):**
- [ ] Read-only message ("Manager collecting info")

**Components Needed:**
- `PlayerInfoTable`
- `PlayerInfoForm`
- `CSVUploadModal`
- `ReminderButton`
- `DuplicateWarning`

#### 2.4 Orders Page (`/teams/[slug]/orders/page.tsx`)
**Manager View:**
- [ ] Order setup form (variants, quantities, sizes)
- [ ] Payment mode selector (split/bulk)
- [ ] Payment status bar
- [ ] Order status tracker
- [ ] Tracking code display

**Player View:**
- [ ] Own payment status
- [ ] Order tracking
- [ ] Delivery estimate

**Admin View:**
- [ ] Update order status dropdown
- [ ] Add tracking code
- [ ] Mark stages (production, quality check, shipped, delivered)

**Components Needed:**
- `OrderSetupCard`
- `VariantSelector`
- `PaymentStatusBar`
- `OrderStatusCard`
- `OrderTrackingCard`

#### 2.5 Activity Page (`/teams/[slug]/activity/page.tsx`)
**All Roles:**
- [ ] Timeline view of all actions
- [ ] Role tags (who did what)
- [ ] Filter by action type
- [ ] Filter by user
- [ ] Export log (CSV/PDF)

**Admin:**
- [ ] Add manual entries

**Components Needed:**
- `ActivityTimeline`
- `RoleTag`
- `ActionFilter`
- `ExportButton`

### Phase 3: Database Views & Functions

#### 3.1 Create Supabase Views
```sql
-- teams_with_details view
CREATE VIEW teams_with_details AS
SELECT
  t.*,
  ts.approval_mode,
  ts.min_approvals_required,
  ts.player_info_mode,
  ts.self_service_enabled,
  ts.access_mode,
  ts.allow_member_invites
FROM teams t
LEFT JOIN team_settings ts ON ts.team_id = t.id;

-- team_members view (with user info)
CREATE VIEW team_members AS
SELECT
  tm.team_id,
  tm.user_id,
  tm.role_type,
  tm.joined_at,
  p.email,
  p.full_name,
  p.avatar_url
FROM team_memberships tm
JOIN profiles p ON p.id = tm.user_id;
```

#### 3.2 Create Helper Functions
```sql
-- get_team_stats(team_id)
-- Returns: player_info_submitted, player_info_total, payment_received, payment_total, current_stage

-- log_activity(team_id, user_id, action_type, description, metadata, is_public)
-- Inserts into notifications_log

-- check_duplicate_jersey_number(team_id, jersey_number, exclude_player_id)
-- Returns: TRUE if duplicate exists

-- notify_user(user_id, team_id, type, title, message, action_url)
-- Sends email + creates notification
```

### Phase 4: Admin Assist Mode

#### 4.1 Admin Context
- [ ] Create `AdminContext` provider
- [ ] `impersonateUser(userId)` - View as user
- [ ] `exitImpersonation()` - Return to admin view
- [ ] Audit trail for all admin actions

#### 4.2 Admin UI
- [ ] Admin toolbar (floating at top when in assist mode)
- [ ] "Exit Assist Mode" button
- [ ] Warning banner: "All changes are logged"

### Phase 5: Notifications

#### 5.1 Email Notifications
Trigger on:
- [ ] Design ready for approval
- [ ] Vote required
- [ ] Player info reminder
- [ ] All payments complete
- [ ] Order status update (shipped, delivered)

#### 5.2 In-App Notifications
- [ ] Notification bell icon in header
- [ ] Unread count badge
- [ ] Notification dropdown
- [ ] Mark as read
- [ ] Click to navigate to action URL

### Phase 6: Validation & Constraints

#### 6.1 Database Constraints
```sql
-- Unique jersey number per team
ALTER TABLE player_info
ADD CONSTRAINT unique_team_jersey
UNIQUE (team_id, jersey_number);
```

#### 6.2 Frontend Validation
- [ ] Jersey number uniqueness check (real-time)
- [ ] CSV upload validation (format, required fields)
- [ ] Order lock after payment complete
- [ ] Vote deadline enforcement

### Phase 7: Testing & Polish

- [ ] Test all role permissions
- [ ] Test all approval modes
- [ ] Test all player info modes
- [ ] Mobile responsive testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## 🗂️ FILE STRUCTURE

```
src/
├── app/
│   └── teams/
│       └── [team_slug]/
│           ├── dashboard/
│           │   └── page.tsx          ❌ TODO
│           ├── design/
│           │   └── page.tsx          ❌ TODO
│           ├── roster/
│           │   └── page.tsx          ❌ TODO
│           ├── orders/
│           │   └── page.tsx          ❌ TODO
│           └── activity/
│               └── page.tsx          ❌ TODO
├── components/
│   └── team-hub/
│       ├── TeamLayout.tsx            ✅ DONE
│       ├── Card.tsx                  ✅ DONE
│       ├── ProgressBar.tsx           ✅ DONE
│       ├── NextStepCard.tsx          ❌ TODO
│       ├── StageIndicator.tsx        ❌ TODO
│       ├── VotingInterface.tsx       ❌ TODO
│       ├── MultiDesignVoteCard.tsx   ❌ TODO
│       ├── PlayerInfoTable.tsx       ❌ TODO
│       ├── PlayerInfoForm.tsx        ❌ TODO
│       ├── CSVUploadModal.tsx        ❌ TODO
│       ├── OrderSetupCard.tsx        ❌ TODO
│       ├── OrderStatusCard.tsx       ❌ TODO
│       ├── ActivityTimeline.tsx      ❌ TODO
│       └── RoleTag.tsx               ❌ TODO
├── hooks/
│   └── team-hub/
│       ├── useTeamWithDetails.ts     ❌ TODO
│       ├── useTeamMembers.ts         ❌ TODO
│       ├── useDesignRequests.ts      ❌ TODO
│       ├── usePlayerInfo.ts          ❌ TODO
│       ├── useOrders.ts              ❌ TODO
│       ├── useActivityLog.ts         ❌ TODO
│       └── useTeamStats.ts           ❌ TODO
├── lib/
│   └── permissions.ts                ✅ DONE
└── types/
    └── team-hub.ts                   ✅ DONE
```

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Create data hooks** (Phase 2 prerequisite)
   - Start with `useTeamWithDetails`
   - Mock data structure for testing

2. **Build Dashboard page** (simplest, best starting point)
   - Manager view with stats
   - Reusable components (NextStepCard, StageIndicator)

3. **Create Supabase views**
   - `teams_with_details`
   - `team_members`

4. **Test permissions system**
   - Create test scenarios for each role
   - Verify conditional rendering

---

## 📊 PROGRESS SUMMARY

**Completed:** 20%
- ✅ Type definitions
- ✅ Permissions system
- ✅ Shared layout
- ✅ Base UI components

**In Progress:** 10%
- 🚧 Route structure (scaffolded, pages not implemented)

**Remaining:** 70%
- ❌ Data hooks
- ❌ Page implementations
- ❌ Database views/functions
- ❌ Admin assist mode
- ❌ Notifications
- ❌ Validation
- ❌ Testing

---

## 🚀 ESTIMATED TIMELINE

- **Phase 1 (Foundation)**: ✅ Complete
- **Phase 2 (Data Hooks)**: ~2-3 hours
- **Phase 3 (Page Implementations)**: ~10-12 hours
- **Phase 4 (Database Layer)**: ~3-4 hours
- **Phase 5 (Admin Mode)**: ~2-3 hours
- **Phase 6 (Notifications)**: ~2-3 hours
- **Phase 7 (Validation)**: ~2-3 hours
- **Phase 8 (Testing & Polish)**: ~4-5 hours

**Total:** ~25-35 hours of development

---

## 🔥 READY TO CONTINUE

The foundation is solid. Next session should focus on:
1. Creating the data hooks
2. Building the Dashboard page (end-to-end)
3. Testing role-based rendering

This will establish the pattern for all other pages.
