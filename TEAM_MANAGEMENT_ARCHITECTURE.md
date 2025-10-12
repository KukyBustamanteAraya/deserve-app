# Team Management System Architecture

## Overview
This document outlines the complete architecture for the team management system that supports both small collaborative teams and large institutional teams with varying levels of control.

---

## 1. Team Types & Use Cases

### Small Teams (Collaborative)
- **Example**: Recreational soccer team, youth basketball team, amateur league
- **Characteristics**:
  - 5-30 members
  - Players are active participants
  - Democratic decision-making
  - Players manage their own info
- **User Journey**:
  1. Player/Captain creates team
  2. Invites teammates
  3. Creates design request
  4. Team votes on designs
  5. Each player fills out their size/name/number
  6. Manager/Captain approves final order

### Large Institutions (Manager-Controlled)
- **Example**: University athletic department, sports academy, corporate teams
- **Characteristics**:
  - 50-500+ members across multiple teams
  - Centralized management
  - Manager makes all decisions
  - Players may not have accounts
- **User Journey**:
  1. Manager creates team
  2. Manager creates design request
  3. Manager approves design (no voting)
  4. Manager manually enters all player info OR shares link for players to self-serve
  5. Manager places bulk order

---

## 2. Database Schema Changes

### New Tables

#### `team_settings`
```sql
CREATE TABLE team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,

  -- Design Approval Settings
  approval_mode TEXT NOT NULL DEFAULT 'owner_only'
    CHECK (approval_mode IN ('owner_only', 'any_member', 'voting', 'multi_design_vote')),
  min_approvals_required INTEGER DEFAULT 1,
  voting_deadline TIMESTAMPTZ,
  designated_voters UUID[] DEFAULT ARRAY[]::UUID[],

  -- Player Info Collection Settings
  player_info_mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (player_info_mode IN ('self_service', 'manager_only', 'hybrid')),
  self_service_enabled BOOLEAN DEFAULT TRUE,
  info_collection_link TEXT UNIQUE,
  info_collection_expires_at TIMESTAMPTZ,

  -- Access Control Settings
  access_mode TEXT NOT NULL DEFAULT 'invite_only'
    CHECK (access_mode IN ('open', 'invite_only', 'private')),
  allow_member_invites BOOLEAN DEFAULT FALSE,

  -- Notification Settings
  notify_on_design_ready BOOLEAN DEFAULT TRUE,
  notify_on_vote_required BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `design_votes`
```sql
CREATE TABLE design_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_request_id UUID REFERENCES design_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  design_option_index INTEGER DEFAULT 0, -- For multi-design voting
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_request_id, user_id)
);
```

#### `player_info_submissions`
```sql
CREATE TABLE player_info_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  design_request_id UUID REFERENCES design_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Player Information
  player_name TEXT NOT NULL,
  jersey_number TEXT,
  size TEXT NOT NULL,
  position TEXT,
  additional_notes TEXT,

  -- Submission metadata
  submitted_by_manager BOOLEAN DEFAULT FALSE,
  submission_token TEXT, -- For anonymous submissions via link

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `team_ownership_history`
```sql
CREATE TABLE team_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  previous_owner_id UUID REFERENCES auth.users(id),
  new_owner_id UUID REFERENCES auth.users(id),
  transferred_by UUID REFERENCES auth.users(id),
  transfer_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables

#### `teams` - Add new columns
```sql
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS current_owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_institutional BOOLEAN DEFAULT FALSE;
```

#### `design_requests` - Add voting support
```sql
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS design_options JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS voting_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_votes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_votes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_approvals INTEGER DEFAULT 1;
```

---

## 3. Permission System

### User Roles (per team)
```typescript
enum TeamRole {
  OWNER = 'owner',           // Full control, can transfer ownership
  MANAGER = 'manager',       // Can manage settings, approve designs
  MEMBER = 'member',         // Can view, vote if enabled
  VIEWER = 'viewer'          // Read-only access
}
```

### Permission Matrix

| Action | Owner | Manager | Member | Viewer |
|--------|-------|---------|--------|--------|
| View team page | ✅ | ✅ | ✅ | ✅ |
| Edit team settings | ✅ | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ⚙️ | ❌ |
| Create design request | ✅ | ✅ | ⚙️ | ❌ |
| Approve design (owner_only) | ✅ | ✅ | ❌ | ❌ |
| Approve design (any_member) | ✅ | ✅ | ✅ | ❌ |
| Vote on design | ✅ | ✅ | ⚙️ | ❌ |
| Submit player info | ✅ | ✅ | ⚙️ | ⚙️ |
| Manage player info | ✅ | ✅ | ❌ | ❌ |

⚙️ = Depends on team settings

---

## 4. Feature Breakdown

### Feature 1: Design Approval Modes

#### Mode A: Owner Only (Default)
```typescript
approval_mode: 'owner_only'
```
- Only team owner/managers can approve
- Single approval needed
- Immediate approval

**UI Flow**:
1. Design becomes ready (status='ready')
2. Only owner/manager sees approval buttons
3. Members see "Awaiting manager approval" message
4. Owner clicks approve → Done

#### Mode B: Any Member
```typescript
approval_mode: 'any_member'
```
- Any team member can approve
- First approval wins
- Current default behavior

**UI Flow**:
1. Design becomes ready
2. All members see approval buttons
3. First person to approve → Done

#### Mode C: Voting (Single Design)
```typescript
approval_mode: 'voting'
min_approvals_required: 5
designated_voters: [uuid1, uuid2, ...]
voting_deadline: '2025-10-15T23:59:59Z'
```
- Requires X number of approvals
- Can designate specific voters
- Optional deadline

**UI Flow**:
1. Design becomes ready
2. Designated voters see "Vote: Approve / Reject" buttons
3. System tracks votes in `design_votes` table
4. Progress bar shows "3 of 5 approvals needed"
5. Once threshold reached → Approved
6. If deadline passes without enough votes → Notify manager

#### Mode D: Multi-Design Vote
```typescript
approval_mode: 'multi_design_vote'
design_options: [
  { index: 0, mockup_urls: [...] },
  { index: 1, mockup_urls: [...] },
  { index: 2, mockup_urls: [...] }
]
```
- Admin uploads multiple design options
- Team votes on which design to use
- Highest votes wins

**UI Flow**:
1. Admin uploads 3 different designs
2. Members see all 3 options side-by-side
3. Each member votes for their favorite
4. System counts votes per design option
5. Winning design is automatically selected

---

### Feature 2: Player Info Collection

#### Mode A: Manager Only
```typescript
player_info_mode: 'manager_only'
self_service_enabled: false
```
- Manager manually enters all player data
- Players don't need accounts
- Best for large institutions

**UI Flow**:
1. Manager goes to "Player Info" tab
2. Sees spreadsheet-like interface
3. Adds rows for each player
4. Fills: Name, Number, Size, Position
5. Can import from CSV
6. Save all at once

#### Mode B: Self-Service with Shareable Link
```typescript
player_info_mode: 'hybrid'
self_service_enabled: true
info_collection_link: 'https://app.com/collect/abc123xyz'
info_collection_expires_at: '2025-10-20T23:59:59Z'
```
- Manager generates unique shareable link
- Players fill out their own info
- No account required (uses token)

**UI Flow**:
1. Manager clicks "Generate Collection Link"
2. System creates unique token
3. Manager copies link, shares via WhatsApp/Email
4. Players click link → Land on info collection page
5. Fill out: Name, Number, Size, Position
6. Submit → Stored with token reference
7. Manager sees submissions in real-time
8. Manager can edit/approve submissions

#### Mode C: Notify Existing Team Members
```typescript
// When team members already have accounts
notify_members: true
```
- For teams where all members have accounts
- One-click notification to all members

**UI Flow**:
1. Manager clicks "Request Player Info from Team"
2. System sends email/notification to all team members
3. Members click link → Redirected to form (authenticated)
4. Fill out their info
5. Manager tracks completion: "8 of 12 members submitted"

---

### Feature 3: Team Ownership & Transfer

#### Ownership Creation
- First person to create team = Owner
- Owner ID stored in `teams.current_owner_id`
- Created by stored in `teams.created_by`

#### Transfer Process
```typescript
function transferOwnership(teamId, newOwnerId, reason) {
  // 1. Verify current user is owner
  // 2. Verify new owner is team member
  // 3. Update teams.current_owner_id
  // 4. Log in team_ownership_history
  // 5. Update team_memberships role
  // 6. Notify new owner
}
```

**UI Flow**:
1. Owner goes to Team Settings → "Transfer Ownership"
2. Selects member from dropdown
3. Confirms with password
4. New owner receives notification
5. Previous owner becomes manager (optional: remove entirely)

---

### Feature 4: Access Control

#### Invite-Only (Default)
```typescript
access_mode: 'invite_only'
allow_member_invites: false
```
- Only owner/manager can invite
- Members need invite to join
- No public discovery

**UI Flow**:
1. Manager clicks "Invite Member"
2. Enters email address
3. System sends invite email with token
4. Recipient clicks link → Creates account (if needed)
5. Automatically joins team

#### Private (Restricted)
```typescript
access_mode: 'private'
allow_member_invites: false
```
- Strictest mode
- Even team page URL requires auth
- No sharing outside organization

---

## 5. Component Architecture

### New Components

```
src/components/team/
├── TeamSettingsPage.tsx              # Main settings interface
├── ApprovalModeSelector.tsx          # Choose approval mode
├── VotingConfiguration.tsx           # Configure voting settings
├── PlayerInfoCollectionManager.tsx   # Manage player data collection
├── ShareableLinkGenerator.tsx        # Generate & display link
├── PlayerInfoForm.tsx                # Form for players to fill out
├── PlayerInfoSpreadsheet.tsx         # Manager bulk entry
├── OwnershipTransferModal.tsx        # Transfer ownership UI
├── DesignVotingCard.tsx              # Vote on single design
├── MultiDesignVotingCard.tsx         # Vote between multiple designs
└── TeamPermissionsManager.tsx        # Manage member roles
```

### Modified Components

```
src/app/mi-equipo/[slug]/page.tsx
- Add permission checks
- Conditional rendering based on approval mode
- Show voting UI when enabled

src/components/design/DesignApprovalCard.tsx
- Support voting mode
- Show vote counts
- Disable if user already voted
```

---

## 6. API Endpoints

### Team Settings
- `POST /api/teams/[id]/settings` - Update team settings
- `GET /api/teams/[id]/settings` - Get team settings
- `POST /api/teams/[id]/transfer-ownership` - Transfer ownership

### Voting
- `POST /api/design-requests/[id]/vote` - Submit vote
- `GET /api/design-requests/[id]/votes` - Get vote counts
- `DELETE /api/design-requests/[id]/vote` - Change vote

### Player Info
- `POST /api/teams/[id]/generate-collection-link` - Generate shareable link
- `POST /api/collect/[token]` - Submit player info (public)
- `GET /api/teams/[id]/player-info` - Get all submissions
- `PUT /api/teams/[id]/player-info/[id]` - Update submission

### Permissions
- `POST /api/teams/[id]/members/[userId]/role` - Update member role
- `GET /api/teams/[id]/permissions` - Get user permissions for team

---

## 7. Implementation Phases

### Phase 1: Foundation (Migration + Settings)
1. Create database migration with all new tables
2. Build team settings page UI
3. Add permission checking middleware
4. Test basic settings CRUD

### Phase 2: Approval Modes
1. Implement voting mode (single design)
2. Add vote tracking and UI
3. Implement multi-design voting
4. Add approval mode switching

### Phase 3: Player Info Collection
1. Build manager spreadsheet interface
2. Implement shareable link generation
3. Create public player info form
4. Add notification system for team members

### Phase 4: Ownership & Access Control
1. Implement ownership transfer
2. Add role management
3. Implement access control checks
4. Add audit logging

### Phase 5: Polish & Testing
1. Add comprehensive error handling
2. Write integration tests
3. Add analytics tracking
4. Documentation

---

## 8. Migration Strategy

### Existing Teams
- All existing teams default to:
  - `approval_mode: 'any_member'` (current behavior)
  - `player_info_mode: 'hybrid'`
  - `access_mode: 'invite_only'`
  - `current_owner_id: owner_id` (from teams table)

### Backwards Compatibility
- DesignApprovalCard still works as-is
- New features opt-in via settings
- No breaking changes to existing workflows

---

## 9. User Stories

### Story 1: Small Team with Voting
**As a** team captain
**I want** my team to vote on designs
**So that** everyone feels included in the decision

**Steps**:
1. Captain creates team and design request
2. Captain goes to Team Settings → Approval Mode → "Voting"
3. Sets "5 approvals required"
4. Designates 12 team members as voters
5. Admin uploads design mockup
6. Captain shares team page link with team
7. Members vote (8 approve, 2 reject, 2 abstain)
8. Design auto-approves when 5th approval received
9. Captain places order

### Story 2: Large Institution Manager
**As a** university athletic director
**I want** to manage multiple teams without player accounts
**So that** I can streamline bulk ordering

**Steps**:
1. Director creates team "Varsity Basketball"
2. Team Settings → Approval Mode → "Owner Only"
3. Team Settings → Player Info → "Manager Only"
4. Creates design request
5. Admin uploads mockup
6. Director approves immediately
7. Director goes to Player Info tab
8. Manually enters 15 players (name, number, size)
9. Places bulk order for all 15 players

### Story 3: Hybrid Team (Link Sharing)
**As a** youth soccer coach
**I want** players to fill out their own jersey info
**So that** I don't have to collect it manually

**Steps**:
1. Coach creates team and design request
2. Admin uploads approved design
3. Coach goes to Player Info → "Generate Link"
4. Coach copies link and shares in WhatsApp group
5. Players (without accounts) click link
6. Each player fills out: Name, Number, Size
7. Coach sees real-time submissions: "14 of 18 players submitted"
8. Coach fills out remaining 4 players manually
9. Coach places order with all collected info

---

## 10. Security Considerations

### Access Control
- Row-level security on all team-related tables
- Permission checks on every API endpoint
- Token validation for shareable links
- Rate limiting on vote submissions

### Data Privacy
- Player info encrypted at rest
- Shareable links expire after use/time
- Audit logging for ownership transfers
- GDPR compliance for player data

### Anti-Abuse
- Prevent vote manipulation (one vote per user)
- Require authentication for ownership transfer
- Validate team membership before actions
- Log all administrative actions

---

## Summary

This architecture provides:
✅ Flexible approval modes (owner, any member, voting, multi-design)
✅ Hybrid player info collection (self-service + manager entry)
✅ Ownership transfer and role management
✅ Granular access control
✅ Backwards compatibility
✅ Scalable from small teams to large institutions

Ready to begin implementation with Phase 1: Database migration and team settings foundation.
