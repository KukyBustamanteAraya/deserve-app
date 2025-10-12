# Team Pages Implementation Plan

## 📋 Overview

This plan implements the user workflows from the **Deserve User White Paper** and **TEAM_MANAGEMENT_ARCHITECTURE.md**, building incrementally to avoid CSS/build issues.

---

## ✅ Current State (Completed)

- [x] Unified team management page (`/dashboard/team`)
- [x] Team creation with type selection (single/organization)
- [x] Multi-sport selection for organizations
- [x] Basic team detail page (`/mi-equipo/[slug]`)
- [x] Team header with colors
- [x] Team settings & permissions system
- [x] Design approval card (approve/request changes)
- [x] Progress tracker with milestone checklist
- [x] Team selection modal in design flow
- [x] Mercado Pago payment integration (Phase 2 complete)

---

## 🎯 Implementation Phases

### **Phase 1: Core Team Dashboard Structure** ✅ COMPLETED

Build the foundation for team pages following the white paper dashboard structure.

#### 1.1: Team Settings & Permissions Foundation ✅ COMPLETED
**Goal**: Establish role-based access and team settings
**Files**:
- `src/app/mi-equipo/[slug]/settings/page.tsx` (already existed)
- `src/lib/permissions/teamPermissions.ts` (created)

**Tasks**:
- [x] Create team settings page route (already existed)
- [x] Implement role checking utility (owner/manager/member/viewer)
- [x] Build settings UI with tabs:
  - Basic Info (name, logo, sport)
  - Team Type (single/organization)
  - Access Control (who can join)
- [x] Save settings to `team_settings` table
- [x] Add permission checks to existing team pages

**Database**:
```sql
-- Already exists from migration, verify:
SELECT * FROM team_settings LIMIT 1;
```

**Testing Checklist**:
- [ ] Owner can edit all settings
- [ ] Manager can edit basic info only
- [ ] Member cannot access settings
- [ ] Settings persist after page reload

---

#### 1.2: Design Approval System (Owner-Only Mode) ✅ COMPLETED
**Goal**: Implement simplest approval mode first
**Files**:
- `src/components/team/DesignApprovalCard.tsx` (created)
- `src/app/mi-equipo/[slug]/page.tsx` (updated)

**Tasks**:
- [x] Build approval card component with:
  - Design mockup preview
  - Approve/Request Changes buttons
  - Comment section
- [x] Only show buttons to owners/managers
- [x] Update design_requests.status on approval
- [x] Show "Awaiting Approval" message to members
- [ ] Add approval notification (deferred to Phase 7)

**States**:
- `pending` → Admin uploads mockup → `ready`
- `ready` → Owner approves → `approved`
- `ready` → Owner rejects → `changes_requested`

**Testing Checklist**:
- [ ] Owner sees approval buttons
- [ ] Member sees "Awaiting approval" message
- [ ] Status updates correctly
- [ ] Can add comment when requesting changes

---

#### 1.3: Progress Tracker Component ✅ COMPLETED
**Goal**: Visual completion tracking
**Files**:
- `src/components/team/ProgressTracker.tsx`
- `src/components/team/CompletionBar.tsx`

**Tasks**:
- [x] Calculate team completion percentage:
  - Design approved: 25%
  - Player info collected: 25%
  - Payments complete: 25%
  - Order placed: 25%
- [x] Build progress bar component
- [x] Add stats cards (players, paid, pending)
- [x] Display on team dashboard

**UI Layout**:
```
┌─────────────────────────────────────┐
│ ⚡ Team Progress: 50% Complete      │
│ ████████████░░░░░░░░░░░░ 50%       │
└─────────────────────────────────────┘
┌──────────┬──────────┬──────────┐
│ 👥 12    │ ✅ 8     │ ⏳ 4     │
│ Players  │ Paid     │ Pending  │
└──────────┴──────────┴──────────┘
```

**Testing Checklist**:
- [ ] Progress updates when design approved
- [ ] Shows accurate player count
- [ ] Payment stats reflect reality

---

### **Phase 2: Player Info Collection** ✅ COMPLETED

Implement player data collection following the white paper's PlayerInfoPortal spec.

#### 2.1: Player Info Management (Manager View)
**Goal**: Manager can add/edit player information
**Files**:
- `src/app/mi-equipo/[slug]/players/page.tsx`
- `src/components/team/PlayerInfoSpreadsheet.tsx`
- `src/components/team/PlayerCard.tsx`

**Tasks**:
- [ ] Create players page route
- [ ] Build spreadsheet-like interface:
  - Name, Number, Size, Position
  - Add/Edit/Delete rows
  - Bulk import from CSV
- [ ] Save to `player_info_submissions` table
- [ ] Show completion status per player
- [ ] Link to design_request

**Database**:
```sql
-- Verify table exists:
SELECT * FROM player_info_submissions LIMIT 1;
```

**UI Layout**:
```
┌────────────────────────────────────────────────────┐
│ Add Player  Import CSV  Export                     │
├────────────────────────────────────────────────────┤
│ Name          │ Number │ Size │ Position │ Status │
│ Juan Pérez    │   10   │  L   │ Delantero│   ✅   │
│ María García  │    7   │  M   │ Mediocampo│  ⏳   │
└────────────────────────────────────────────────────┘
```

**Testing Checklist**:
- [ ] Can add player manually
- [ ] Can import from CSV
- [ ] Data persists after refresh
- [ ] Shows completion status

---

#### 2.2: Self-Service Player Portal
**Goal**: Players fill their own info via shareable link
**Files**:
- `src/app/collect/[token]/page.tsx`
- `src/components/team/PlayerInfoForm.tsx`
- `src/components/team/ShareableLinkGenerator.tsx`

**Tasks**:
- [ ] Generate unique collection tokens
- [ ] Build public player info form (no auth required)
- [ ] Validate token and team association
- [ ] Save submissions with token reference
- [ ] Manager sees submissions in real-time
- [ ] Link expiration after X days

**Flow**:
1. Manager clicks "Generate Collection Link"
2. System creates token: `https://app.com/collect/abc123xyz`
3. Manager shares via WhatsApp/Email
4. Players fill form anonymously
5. Manager sees progress: "8 of 12 submitted"

**Testing Checklist**:
- [ ] Link generation works
- [ ] Form accessible without login
- [ ] Submissions appear in manager view
- [ ] Expired links show error

---

#### 2.3: Mini-Field Visualization
**Goal**: Visual lineup representation (white paper spec)
**Files**:
- `src/components/team/MiniFieldMap.tsx`
- `src/lib/sports/fieldLayouts.ts`

**Tasks**:
- [ ] Create sport-specific field SVGs:
  - Soccer field
  - Basketball court
  - Volleyball court
  - Baseball diamond
- [ ] Place player icons at positions
- [ ] Hover shows: name, number, size
- [ ] Click opens player detail modal
- [ ] Toggle: Design | Lineup | Split views

**UI Layout**:
```
[Toggle: Design | Lineup]
┌─────────────────────────┐
│    Soccer Field         │
│         GK              │
│    DF  DF  DF  DF       │
│    MF  MF  MF           │
│    FW  FW  FW           │
│  (hover: Juan #10, L)   │
└─────────────────────────┘
```

**Testing Checklist**:
- [ ] Correct field for each sport
- [ ] Players positioned correctly
- [ ] Hover tooltips work
- [ ] Modal opens on click

---

### **Phase 3: Unified Member Management & Payments** 🚀 IN PROGRESS

Build unified member management and enhance payment integration.

#### 3.0: Players → Team Members Integration ⭐ KEY FEATURE
**Goal**: Merge roster players and app users into single unified view
**Insight**: Current separation between "Players" (roster) and "Team Members" (app users) creates confusion

**Files**:
- `src/app/mi-equipo/[slug]/settings/page.tsx` (update)
- `src/components/team/UnifiedMemberList.tsx` (new)
- `src/components/team/PlayerInviteModal.tsx` (new)
- `src/app/api/teams/[id]/invite/route.ts` (new)

**Architecture**:
```
Unified Member View (in Settings):
├── Active Members (have app accounts)
│   ├── Full Name | Role | Status: "Active User"
│   └── Can manage team, approve designs, etc.
├── Roster Players (no app account yet)
│   ├── Player Name | Status: "Roster Only (Pending Invite)"
│   └── [Invite to App] button
└── Invitation Flow:
    ├── Generate invite token linked to player record
    ├── Send email/WhatsApp with invite link
    └── On signup → auto-link account to player + team membership
```

**Tasks**:
- [ ] Update Settings page to show both `team_memberships` AND `player_info_submissions`
- [ ] Add status badges: "Active User" | "Roster Only" | "Invited (Pending)"
- [ ] Build invite token generation system (`team_invites` table)
- [ ] Create invite API route that sends email/generates link
- [ ] Handle invite acceptance: link `player_info_submissions` → `profiles` → `team_memberships`
- [ ] Add bulk invite functionality (invite all roster players at once)
- [ ] Track invite status and expiration

**Database**:
```sql
-- Create invites table
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_info_id UUID REFERENCES player_info_submissions(id),
  email TEXT,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'player',
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI Changes**:
```
Team Members & Roster (Settings Page)
┌─────────────────────────────────────────────────────────┐
│ Name             │ Role      │ Status          │ Actions│
│ Kuky Bustamante  │ Owner     │ ✅ Active User  │ ...    │
│ Juan Pérez (#10) │ Player    │ 📧 Invited      │ Resend │
│ María García (#7)│ -         │ 👤 Roster Only  │ Invite │
└─────────────────────────────────────────────────────────┘
[Invite All Roster Players]
```

**Testing Checklist**:
- [ ] Roster players appear in members list with "Roster Only" badge
- [ ] Can invite roster player via email
- [ ] Invite link directs to signup with pre-filled team
- [ ] On signup, player record links to new user account
- [ ] Player automatically joins team with correct role
- [ ] Can resend expired invites
- [ ] Bulk invite sends to all roster players

---

#### 3.1: Team Payment Dashboard
**Goal**: Track split payments per team
**Files**:
- `src/app/mi-equipo/[slug]/payments/page.tsx`
- `src/components/team/PaymentCard.tsx`
- `src/components/team/TeamBalance.tsx`

**Tasks**:
- [ ] Create payments page route
- [ ] Show payment status per player
- [ ] Display team balance summary
- [ ] Link to Mercado Pago payment flow
- [ ] Update UI after webhook confirmation

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Team Balance: $450 / $600 (75%)     │
│ ████████████████░░░░  $450          │
└─────────────────────────────────────┘
┌──────────────┬────────┬──────────┐
│ Player       │ Amount │ Status   │
│ Juan Pérez   │  $50   │ ✅ Paid  │
│ María García │  $50   │ ⏳ Pending│
└──────────────┴────────┴──────────┘
```

**Testing Checklist**:
- [ ] Shows accurate payment totals
- [ ] Updates after payment webhook
- [ ] Player can pay their share
- [ ] Manager sees all payments

---

#### 3.2: Bulk Payment (Manager)
**Goal**: Manager pays for entire team
**Files**:
- `src/components/team/BulkPaymentButton.tsx`

**Tasks**:
- [ ] Calculate total team amount
- [ ] Create bulk payment preference
- [ ] Link to existing `bulk_payments` table
- [ ] Mark all players as paid on success

**Testing Checklist**:
- [ ] Calculates correct total
- [ ] Payment processes successfully
- [ ] All players marked paid
- [ ] Order status updates

---

### **Phase 4: Order Tracking & Delivery** 🔜

#### 4.1: Order Timeline Tracker
**Goal**: Visual production and delivery progress
**Files**:
- `src/components/team/OrderTracker.tsx`
- `src/components/team/DeliveryTimeline.tsx`

**Tasks**:
- [ ] Build timeline component with stages:
  - ✅ Design Approved
  - ⏳ In Production
  - 📦 Shipped
  - 🎉 Delivered
- [ ] Show ETA for each stage
- [ ] Add photo upload for proof of delivery
- [ ] Notifications on status change

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Order Timeline                      │
│ ● Design Approved   Dec 1, 2025    │
│ ● In Production    (Est: Dec 15)   │
│ ○ Shipped          (Est: Dec 20)   │
│ ○ Delivered        (Est: Dec 25)   │
└─────────────────────────────────────┘
```

**Testing Checklist**:
- [ ] Shows current stage
- [ ] ETAs display correctly
- [ ] Photos upload successfully
- [ ] Notifications sent on update

---

#### 4.2: Photo Gallery (Proof of Work)
**Goal**: Showcase uniforms and team photos
**Files**:
- `src/components/team/PhotoGallery.tsx`

**Tasks**:
- [ ] Upload production photos (admin)
- [ ] Upload team photos (manager/players)
- [ ] Gallery grid layout
- [ ] Lightbox preview

**Testing Checklist**:
- [ ] Images upload correctly
- [ ] Gallery displays all photos
- [ ] Lightbox opens on click

---

### **Phase 5: Voting & Multi-Design** 🔜

Implement voting modes from TEAM_MANAGEMENT_ARCHITECTURE.md

#### 5.1: Simple Voting (Single Design)
**Goal**: Team votes to approve one design
**Files**:
- `src/components/team/DesignVotingCard.tsx`
- `src/app/api/design-requests/[id]/vote/route.ts`

**Tasks**:
- [ ] Add voting UI to design display
- [ ] Track votes in `design_votes` table
- [ ] Show progress: "3 of 5 approvals needed"
- [ ] Auto-approve when threshold reached
- [ ] Deadline handling

**Testing Checklist**:
- [ ] Can cast vote
- [ ] Cannot vote twice
- [ ] Progress bar updates
- [ ] Design approves at threshold

---

#### 5.2: Multi-Design Voting
**Goal**: Vote between multiple design options
**Files**:
- `src/components/team/MultiDesignVotingCard.tsx`

**Tasks**:
- [ ] Admin uploads multiple designs
- [ ] Side-by-side comparison view
- [ ] Vote for favorite
- [ ] Highest votes wins
- [ ] Show vote counts

**Testing Checklist**:
- [ ] All designs display
- [ ] Can vote for one
- [ ] Winning design selected
- [ ] Ties handled gracefully

---

### **Phase 6: Institution Dashboard** 🔜

Build multi-team oversight for Athletic Directors

#### 6.1: Institution Overview
**Goal**: See all programs and teams at once
**Files**:
- `src/app/dashboard/institution/page.tsx`
- `src/components/institution/InstitutionDashboard.tsx`

**Tasks**:
- [ ] Create institution entity
- [ ] Link multiple teams to institution
- [ ] Overview with key metrics:
  - Active orders
  - Teams by sport
  - Total budget
  - Pending approvals
- [ ] Quick access to team details

**Testing Checklist**:
- [ ] Shows all linked teams
- [ ] Metrics accurate
- [ ] Can navigate to teams

---

#### 6.2: Institution Orders Manager
**Goal**: Unified order management table
**Files**:
- `src/app/dashboard/institution/orders/page.tsx`
- `src/components/institution/OrdersTable.tsx`

**Tasks**:
- [ ] Build filterable table:
  - By sport, team, status
  - Sort by date, amount
- [ ] Bulk actions
- [ ] Export to CSV
- [ ] Invoice management

**Testing Checklist**:
- [ ] Filters work correctly
- [ ] Can export data
- [ ] Bulk actions process

---

### **Phase 7: Communication & Notifications** 🔜

#### 7.1: Notification System
**Goal**: Event-based alerts for all user types
**Files**:
- `src/components/NotificationBell.tsx`
- `src/lib/notifications/events.ts`

**Tasks**:
- [ ] Design approved → notify team
- [ ] Payment received → notify manager
- [ ] Player info submitted → notify manager
- [ ] Order status change → notify all
- [ ] In-app + email notifications

**Testing Checklist**:
- [ ] Notifications appear
- [ ] Emails sent correctly
- [ ] Can mark as read
- [ ] Links work

---

#### 7.2: Communication Center (Institution)
**Goal**: Internal messaging for large teams
**Files**:
- `src/app/dashboard/institution/messages/page.tsx`

**Tasks**:
- [ ] Message threads by team
- [ ] Announcements
- [ ] Read receipts
- [ ] File attachments

**Testing Checklist**:
- [ ] Can send message
- [ ] Recipients see message
- [ ] Files attach correctly

---

## 🎨 Shared Components Library

Build once, use everywhere:

| Component              | Used In                    | Priority |
|------------------------|----------------------------|----------|
| `OrderTracker`         | Team & Institution         | High     |
| `PaymentPortal`        | Team & Admin               | High     |
| `DesignMockup`         | Team Dashboard             | High     |
| `ProgressBar`          | All dashboards             | High     |
| `PlayerCard`           | Team & Lineup              | Medium   |
| `NotificationBell`     | Global header              | Medium   |
| `StatCard`             | All dashboards             | Medium   |
| `MiniFieldMap`         | Team Dashboard             | Low      |
| `PhotoGallery`         | Team & Delivery            | Low      |

---

## 📊 Database Schema Verification

Before each phase, verify tables exist:

```sql
-- Phase 1
SELECT * FROM team_settings LIMIT 1;
SELECT * FROM design_votes LIMIT 1;

-- Phase 2
SELECT * FROM player_info_submissions LIMIT 1;

-- Phase 3
SELECT * FROM payment_contributions LIMIT 1;
SELECT * FROM bulk_payments LIMIT 1;

-- Phase 6
SELECT * FROM institutions LIMIT 1; -- May need to create
```

---

## 🧪 Testing Strategy

### Per Phase:
1. **Unit Tests**: Individual components
2. **Integration Tests**: Full workflows
3. **Manual Testing**: Real user scenarios
4. **CSS Stability Check**: Ensure no broken styles

### Critical Paths to Test:
- [ ] Small team: Create → Design → Collect Info → Pay → Deliver
- [ ] Institution: Create Program → Manage Teams → Bulk Order → Track
- [ ] Player: Join team → Submit info → Pay share → View progress

---

## 🚀 Deployment Checklist

Before pushing to production:
- [ ] All migrations run successfully
- [ ] RLS policies configured
- [ ] Environment variables set
- [ ] Payment webhooks tested
- [ ] Notification emails working
- [ ] Mobile responsive
- [ ] Performance optimized (<3s load)

---

## 📝 Implementation Notes

### CSS Stability Protocol:
1. Build one feature at a time
2. Test after each change
3. If CSS breaks: `rm -rf .next && npm run css:build && npm run dev`
4. Commit working changes immediately

### Incremental Approach:
- Complete Phase 1 fully before starting Phase 2
- Test each sub-phase independently
- Use feature flags for partial releases

### Priority Order:
1. **Phase 1** - Foundation (settings, approval, progress)
2. **Phase 2** - Player info (core value delivery)
3. **Phase 3** - Payments (monetization)
4. **Phase 4** - Delivery tracking (completion)
5. **Phase 5** - Voting (nice-to-have)
6. **Phase 6** - Institution (expansion)
7. **Phase 7** - Communication (polish)

---

## 🎯 Success Metrics

### Phase 1 Success:
- ✅ Owner can approve design
- ✅ Progress bar shows accurate data
- ✅ Permissions enforced correctly

### Phase 2 Success:
- ✅ Manager can collect all player info
- ✅ Players can self-submit via link
- ✅ Mini-field shows lineup

### Phase 3 Success:
- ✅ Individual payments process
- ✅ Bulk payments work
- ✅ Payment status tracked accurately

### Full Launch Success:
- ✅ Small teams complete full workflow
- ✅ Institutions manage multiple teams
- ✅ <1% error rate on payments
- ✅ 90%+ user satisfaction

---

## 🏁 Current Status

**Phase**: Phase 1 ✅ COMPLETED
**Next Phase**: Phase 2 - Player Info Collection
**Blockers**: None

### Phase 1 Completion Summary:
✅ **1.1 Team Settings & Permissions** - Permission utility created, settings page already existed
✅ **1.2 Design Approval System** - Interactive approval card with owner/manager controls
✅ **1.3 Progress Tracker** - Visual completion tracking with stats cards and milestone checklist

### What's Working:
- Team managers can approve or request changes on designs
- Progress tracker shows overall team completion (0-100%)
- Stats cards display: total players, players paid, players pending
- Milestone checklist tracks: design approval, player info, payments, order status
- All components integrated into team detail page (`/mi-equipo/[slug]`)

---

**Ready to start Phase 2?** The next step is implementing player info collection with manager spreadsheet view and self-service portal.
