# Team Page UI Planning Document

## Overview
This document outlines what should be displayed on the team page based on:
1. User role (Owner/Manager vs Player)
2. Team settings (approval mode, player info mode, access mode)
3. Design request status
4. Current workflow stage

---

## User Roles

### Owner/Manager
- Full control over team settings
- Can approve designs (depending on approval mode)
- Can manage player information
- Can create design requests
- Can invite members
- Can view all team data

### Player/Member
- Limited control based on team settings
- Can vote on designs (if voting enabled)
- Can submit own player info (if self-service enabled)
- Can view team designs and orders
- Read-only for most settings

---

## Page Sections by Role & Settings

### 1. DESIGN APPROVAL SECTION

#### Scenario A: Owner Only Mode
**Settings:**
```typescript
approval_mode: 'owner_only'
```

**Manager View:**
```
┌─────────────────────────────────────────┐
│ 🎨 Design Ready for Approval            │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ ✅ Approve Design    ❌ Request Changes  │
└─────────────────────────────────────────┘
```

**Player View:**
```
┌─────────────────────────────────────────┐
│ 🎨 Design In Review                     │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ ⏳ Waiting for manager approval...      │
└─────────────────────────────────────────┘
```

#### Scenario B: Any Member Mode
**Settings:**
```typescript
approval_mode: 'any_member'
```

**Both Manager & Player View:**
```
┌─────────────────────────────────────────┐
│ 🎨 Design Ready for Approval            │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ ✅ Approve Design    ❌ Request Changes  │
│                                         │
│ Note: First approval wins!              │
└─────────────────────────────────────────┘
```

#### Scenario C: Voting Mode (Single Design)
**Settings:**
```typescript
approval_mode: 'voting'
min_approvals_required: 5
designated_voters: [uuid1, uuid2, ...] // Optional
```

**Designated Voter View:**
```
┌─────────────────────────────────────────┐
│ 🗳️ Vote on Design                       │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ Progress: ████░░░░░ 3 of 5 approvals   │
│                                         │
│ Your vote:                              │
│ 👍 Approve  👎 Reject  ⊝ Abstain        │
│                                         │
│ 💬 Comment (optional):                  │
│ [text input]                            │
│                                         │
│ [Submit Vote]                           │
└─────────────────────────────────────────┘
```

**Non-Voter View:**
```
┌─────────────────────────────────────────┐
│ 🗳️ Voting in Progress                   │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ Progress: ████░░░░░ 3 of 5 approvals   │
│                                         │
│ ⏳ Waiting for team vote...             │
│                                         │
│ Approvals: 3  Rejections: 1  Abstain: 1│
└─────────────────────────────────────────┘
```

**After Voting (All Users):**
```
┌─────────────────────────────────────────┐
│ ✅ Design Approved by Vote              │
│                                         │
│ [Design Mockup Images]                  │
│                                         │
│ Final Tally: 5 approve, 2 reject        │
│                                         │
│ [View Votes & Comments]                 │
└─────────────────────────────────────────┘
```

#### Scenario D: Multi-Design Vote
**Settings:**
```typescript
approval_mode: 'multi_design_vote'
design_options: [
  { index: 0, mockup_urls: [...] },
  { index: 1, mockup_urls: [...] },
  { index: 2, mockup_urls: [...] }
]
```

**All Team Members View:**
```
┌─────────────────────────────────────────┐
│ 🗳️ Choose Your Favorite Design         │
│                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │ Option 1 │ │ Option 2 │ │ Option 3 ││
│ │[mockup]  │ │[mockup]  │ │[mockup]  ││
│ │          │ │          │ │          ││
│ │ 5 votes  │ │ 8 votes ⭐│ │ 2 votes  ││
│ │          │ │          │ │          ││
│ │[Vote]    │ │[Vote]    │ │[Vote]    ││
│ └──────────┘ └──────────┘ └──────────┘│
│                                         │
│ Your vote: Option 2 ✓                   │
│ [Change Vote]                           │
└─────────────────────────────────────────┘
```

---

### 2. PLAYER INFO COLLECTION SECTION

#### Scenario A: Self-Service Enabled
**Settings:**
```typescript
player_info_mode: 'self_service' or 'hybrid'
self_service_enabled: true
```

**Manager View:**
```
┌─────────────────────────────────────────┐
│ 👕 Player Information Collection        │
│                                         │
│ ✅ 12 of 15 players submitted info      │
│                                         │
│ [📋 View All Submissions]               │
│ [📤 Export to CSV]                      │
│                                         │
│ Share collection link:                  │
│ [https://app.com/collect/abc123] [Copy] │
│                                         │
│ Or notify team members:                 │
│ [📧 Send Reminder Email]                │
│                                         │
│ Missing submissions from:               │
│ • John Doe                              │
│ • Jane Smith                            │
│ • Mike Johnson                          │
│                                         │
│ [+ Manually Add Player Info]            │
└─────────────────────────────────────────┘
```

**Player View (Not Submitted):**
```
┌─────────────────────────────────────────┐
│ 👕 Submit Your Jersey Information       │
│                                         │
│ Please fill out your details:           │
│                                         │
│ Full Name: [___________________]        │
│ Jersey Number: [____]                   │
│ Size: [Select ▼]                        │
│   • Youth S, M, L, XL                   │
│   • Adult S, M, L, XL, 2XL, 3XL         │
│ Position: [___________________]         │
│ Notes: [___________________]            │
│                                         │
│ [Submit Information]                    │
└─────────────────────────────────────────┘
```

**Player View (Already Submitted):**
```
┌─────────────────────────────────────────┐
│ ✅ Your Jersey Information              │
│                                         │
│ Name: John Doe                          │
│ Number: 23                              │
│ Size: Adult L                           │
│ Position: Forward                       │
│                                         │
│ [Edit My Information]                   │
└─────────────────────────────────────────┘
```

#### Scenario B: Manager Only Mode
**Settings:**
```typescript
player_info_mode: 'manager_only'
self_service_enabled: false
```

**Manager View:**
```
┌─────────────────────────────────────────┐
│ 👕 Player Information Management        │
│                                         │
│ Total Players: 15                       │
│                                         │
│ [+ Add Player] [📤 Import CSV]          │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Name        Number  Size   Position ││
│ ├─────────────────────────────────────││
│ │ John Doe    23      L      Forward  ││
│ │ Jane Smith  10      M      Midfield ││
│ │ Mike Jones  7       XL     Defense  ││
│ │ ...                                 ││
│ └─────────────────────────────────────┘│
│                                         │
│ [📤 Export All] [🗑️ Bulk Delete]       │
└─────────────────────────────────────────┘
```

**Player View:**
```
┌─────────────────────────────────────────┐
│ 👕 Player Information                   │
│                                         │
│ Your manager will collect all player    │
│ information for the team.               │
│                                         │
│ Contact your manager if you need to     │
│ update your jersey details.             │
└─────────────────────────────────────────┘
```

#### Scenario C: Hybrid Mode
**Settings:**
```typescript
player_info_mode: 'hybrid'
self_service_enabled: true  // Manager can toggle
```

**Manager View (Self-Service ON):**
```
┌─────────────────────────────────────────┐
│ 👕 Player Information Collection        │
│                                         │
│ Collection Mode: Self-Service [Toggle]  │
│                                         │
│ ✅ 12 of 15 players submitted           │
│                                         │
│ [Share Link] [Send Reminders]           │
│ [View Submissions] [Add Manually]       │
└─────────────────────────────────────────┘
```

**Manager View (Self-Service OFF):**
```
┌─────────────────────────────────────────┐
│ 👕 Player Information Management        │
│                                         │
│ Collection Mode: Manager Only [Toggle]  │
│                                         │
│ [Spreadsheet View - Manager Entry]      │
└─────────────────────────────────────────┘
```

---

### 3. TEAM MEMBERS SECTION

#### Manager View
```
┌─────────────────────────────────────────┐
│ 👥 Team Members (15)                    │
│                                         │
│ [+ Invite Member]                       │
│                                         │
│ Owner:                                  │
│ • 👑 You (Owner)                        │
│                                         │
│ Managers:                               │
│ • John Doe (Manager)    [Remove] [...]  │
│ • Jane Smith (Manager)  [Remove] [...]  │
│                                         │
│ Members:                                │
│ • Mike Johnson          [Promote] [...] │
│ • Sarah Lee             [Promote] [...] │
│ • ... (show 5, expand for all)          │
│                                         │
│ [View All Members]                      │
└─────────────────────────────────────────┘
```

#### Player View
```
┌─────────────────────────────────────────┐
│ 👥 Team Members (15)                    │
│                                         │
│ Owner: John Doe                         │
│ Managers: 2                             │
│ Members: 12                             │
│                                         │
│ [View All Members]                      │
│                                         │
│ [Share Team Link] (if allowed)          │
└─────────────────────────────────────────┘
```

---

### 4. DESIGN REQUESTS HISTORY

#### Manager View
```
┌─────────────────────────────────────────┐
│ 📦 Design Requests & Orders             │
│                                         │
│ [+ Create New Design Request]           │
│                                         │
│ Active Requests:                        │
│ ┌─────────────────────────────────────┐│
│ │ 🎨 Basketball Jersey                ││
│ │ Status: Approved ✅                 ││
│ │ Created: Oct 5, 2025                ││
│ │ [View Details] [Place Order]        ││
│ └─────────────────────────────────────┘│
│                                         │
│ Past Orders:                            │
│ ┌─────────────────────────────────────┐│
│ │ 📦 Soccer Kit - Order #1234         ││
│ │ Status: Shipped 🚚                  ││
│ │ Track: [TNT123456]                  ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### Player View
```
┌─────────────────────────────────────────┐
│ 📦 Team Orders                          │
│                                         │
│ Current Design:                         │
│ ┌─────────────────────────────────────┐│
│ │ 🎨 Basketball Jersey                ││
│ │ Status: Approved ✅                 ││
│ │ [View Design]                       ││
│ └─────────────────────────────────────┘│
│                                         │
│ Your Orders:                            │
│ ┌─────────────────────────────────────┐│
│ │ 📦 Soccer Kit                       ││
│ │ Status: Shipped 🚚                  ││
│ │ Estimated Delivery: Oct 15          ││
│ │ [Track Package]                     ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## Complete Page Layouts

### MANAGER DASHBOARD LAYOUT

```
┌────────────────────────────────────────────────┐
│ [Team Banner with Colors]                      │
│ Team Name: "Warriors Basketball"               │
│                                                │
│ [⚙️ Team Settings]  [👥 15 Members]           │
└────────────────────────────────────────────────┘

┌─── Current Design Request ─────────────────────┐
│                                                │
│ [Design Approval Section - Based on Mode]      │
│                                                │
└────────────────────────────────────────────────┘

┌─── Player Information ─────────────────────────┐
│                                                │
│ [Player Info Collection - Based on Mode]       │
│                                                │
└────────────────────────────────────────────────┘

┌─── Payment & Orders ───────────────────────────┐
│                                                │
│ [Payment Options: Split / Bulk]                │
│ [Active Orders]                                │
│                                                │
└────────────────────────────────────────────────┘

┌─── Team Management ────────────────────────────┐
│                                                │
│ [Invite Members]                               │
│ [Share Team Link]                              │
│ [Member List with Role Management]             │
│                                                │
└────────────────────────────────────────────────┘
```

### PLAYER DASHBOARD LAYOUT

```
┌────────────────────────────────────────────────┐
│ [Team Banner with Colors]                      │
│ Team Name: "Warriors Basketball"               │
│                                                │
│ [👥 15 Members]                                │
└────────────────────────────────────────────────┘

┌─── Current Design ─────────────────────────────┐
│                                                │
│ [Design View/Vote - Based on Approval Mode]    │
│                                                │
└────────────────────────────────────────────────┘

┌─── Your Jersey Info ───────────────────────────┐
│                                                │
│ [Submit/Edit Info - If Self-Service Enabled]   │
│                                                │
└────────────────────────────────────────────────┘

┌─── Your Orders ────────────────────────────────┐
│                                                │
│ [Your Individual Orders]                       │
│ [Payment Status]                               │
│ [Tracking Info]                                │
│                                                │
└────────────────────────────────────────────────┘

┌─── Team Info ──────────────────────────────────┐
│                                                │
│ [Share Team Link - If Allowed]                 │
│ [View Members]                                 │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Workflow States & Transitions

### Design Approval Workflow

```
1. PENDING
   Manager: "Design request created, waiting for admin"
   Player: "Design being prepared"

2. RENDERING
   Manager: "Design is being rendered..."
   Player: "Design is being prepared..."

3. READY (Mockups Uploaded)
   Manager (Owner Only): [Approve/Reject buttons]
   Player (Owner Only): "Waiting for approval..."

   Manager (Any Member): [Approve/Reject buttons]
   Player (Any Member): [Approve/Reject buttons]

   Manager (Voting): [Vote buttons + Progress]
   Player (Voting): [Vote buttons + Progress]

4. APPROVED
   Manager: "Design approved! Ready to collect player info"
   Player: "Design approved! Submit your info"

5. CHANGES_REQUESTED
   Manager: "Waiting for admin revisions..."
   Player: "Design being revised..."

6. READY_FOR_ORDER
   Manager: [Place Order button] [View Player Info]
   Player: "Manager preparing order..."

7. ORDER_PLACED
   Manager: [Track Order] [Payment Status]
   Player: [Track Your Order] [Payment Status]
```

### Player Info Collection Workflow

```
1. NOT_STARTED
   Manager: [Enable Collection] [Choose Mode]
   Player: (Hidden until enabled)

2. COLLECTION_OPEN
   Manager (Self-Service): [Share Link] [View Progress]
   Player (Self-Service): [Submit Info Form]

   Manager (Manager Only): [Spreadsheet Entry]
   Player (Manager Only): "Manager collecting info"

3. PARTIAL_COLLECTION
   Manager: "12 of 15 submitted" [Send Reminders]
   Player (Submitted): "Info submitted ✓"
   Player (Not Submitted): [Submit Form] + Reminder

4. COLLECTION_COMPLETE
   Manager: [Review All] [Export] [Place Order]
   Player: "Info submitted ✓"

5. ORDER_READY
   Manager: [Place Split Payment] or [Bulk Payment]
   Player: [Pay Your Share] or "Included in team order"
```

---

## Conditional Features Matrix

| Feature | Owner/Manager | Member | Settings Required |
|---------|---------------|---------|-------------------|
| View Designs | ✅ | ✅ | None |
| Approve Design | ✅ | ⚙️ | approval_mode = 'any_member' |
| Vote on Design | ✅ | ⚙️ | approval_mode = 'voting' |
| Submit Player Info | ✅ | ⚙️ | self_service_enabled = true |
| View All Player Info | ✅ | ❌ | None |
| Manage Members | ✅ | ❌ | None |
| Invite Members | ✅ | ⚙️ | allow_member_invites = true |
| Create Design Request | ✅ | ❌ | None |
| Place Order | ✅ | ❌ | None |
| Access Settings | ✅ | ❌ | None |

✅ = Always available
❌ = Never available
⚙️ = Depends on settings

---

## Key User Flows

### Flow 1: Small Team with Voting
1. Manager creates team, invites 12 players
2. Manager sets approval_mode = 'voting', min_approvals = 7
3. Manager creates design request
4. Admin uploads mockup
5. **All 12 players see vote buttons**
6. Players vote (9 approve, 2 reject, 1 abstain)
7. **Design auto-approves when 7th approval received**
8. Manager enables self_service player info
9. Manager shares WhatsApp link
10. Players submit their jersey info
11. Manager reviews submissions, places order

### Flow 2: Large Institution (Manager Only)
1. Manager creates team "Varsity Basketball"
2. Manager sets approval_mode = 'owner_only'
3. Manager sets player_info_mode = 'manager_only'
4. Manager creates design request
5. Admin uploads mockup
6. **Manager approves immediately** (no voting)
7. **Manager manually enters 15 players in spreadsheet**
8. Manager places bulk payment for all
9. Players receive notification but no action needed

### Flow 3: Hybrid Team
1. Coach creates team
2. Coach sets approval_mode = 'any_member'
3. Coach sets player_info_mode = 'hybrid', self_service = true
4. Coach creates design request
5. Admin uploads mockup
6. **Any team member can approve** (first wins)
7. Captain approves design
8. **Coach shares collection link via WhatsApp**
9. 10 players submit info via link
10. Coach manually enters remaining 5
11. Coach places order

---

## Next Steps for Implementation

### Phase 1: Design Approval UI (Based on Mode)
- [ ] Update DesignApprovalCard to support voting mode
- [ ] Create VotingInterface component
- [ ] Create MultiDesignVoteCard component
- [ ] Add approval mode logic to team page

### Phase 2: Player Info Collection UI
- [ ] Create PlayerInfoForm component (player self-service)
- [ ] Create PlayerInfoSpreadsheet component (manager entry)
- [ ] Create ShareableLinkGenerator component
- [ ] Add player info section to team page

### Phase 3: Dynamic Dashboard Rendering
- [ ] Create conditional rendering logic based on:
  - User role (manager vs player)
  - Team settings (approval_mode, player_info_mode)
  - Current workflow state (pending, ready, approved, etc.)
- [ ] Update ManagerDashboard component
- [ ] Update PlayerDashboard component

### Phase 4: Integration
- [ ] Connect all components to team_settings
- [ ] Add real-time updates for votes/submissions
- [ ] Add notifications
- [ ] Testing across all scenarios

---

## Questions to Resolve

1. **Voting Deadline**: Should we auto-reject if deadline passes without enough votes, or just notify manager?

2. **Vote Changes**: Can users change their vote, or is it final?

3. **Player Info Updates**: Can players edit their info after submission, or must they ask manager?

4. **Multi-Design Voting**: Should we allow ties, or require a runoff vote?

5. **Shareable Link Expiration**: How long should collection links remain active?

6. **Payment Split vs Bulk**: Does approval mode affect payment mode, or are they independent?

---

## Summary

This plan provides:
✅ Complete UI layouts for Manager vs Player views
✅ Conditional rendering based on team settings
✅ All approval modes (owner_only, any_member, voting, multi_design)
✅ All player info modes (self_service, manager_only, hybrid)
✅ Complete workflow states from creation to order
✅ User flows for different team types
✅ Implementation phases

Ready to begin implementation!
