# 🏛️ Institution Team Page - UI-First Implementation Plan

**Strategy**: Build Visual Interface → Review → Connect Backend
**Date Created**: 2025-10-13
**Status**: In Progress - Session 1

---

## 📐 Overview

This plan follows a UI-first approach where we build the complete visual interface with mock data, review with stakeholders, then connect to the backend database. This allows for rapid iteration on design without backend constraints.

---

## 🎯 Core Modules (From institution_ad_whitepaper.md)

1. **Institution Dashboard** - Overview of all programs, teams, and stats
2. **Orders Manager** - Unified view of all orders across teams
3. **Program Detail** - Nested sport → team → coach structure
4. **Finance Tracker** - Budget tracking and invoice management
5. **Communication Center** - Announcements and approval workflows

---

## 📂 File Structure

```
src/
├── app/
│   └── mi-equipo/
│       └── [slug]/
│           ├── page.tsx (update institution view)
│           ├── orders/
│           │   └── page.tsx (new)
│           ├── programs/
│           │   └── page.tsx (new)
│           ├── finance/
│           │   └── page.tsx (new)
│           └── communications/
│               └── page.tsx (new)
│
├── components/
│   └── institution/
│       ├── InstitutionHeader.tsx
│       ├── InstitutionStatsCards.tsx
│       ├── QuickActionsBar.tsx
│       ├── ProgramsBySport.tsx
│       ├── ActivityFeed.tsx
│       ├── OrdersFilterBar.tsx
│       ├── OrdersTable.tsx
│       ├── OrderDetailModal.tsx
│       ├── ProgramCard.tsx
│       ├── TeamCard.tsx
│       ├── BudgetOverviewCard.tsx
│       ├── ProgramBudgetBreakdown.tsx
│       ├── InvoiceList.tsx
│       ├── AnnouncementComposer.tsx
│       ├── ApprovalQueue.tsx
│       └── AnnouncementHistory.tsx
│
└── lib/
    └── mockData/
        └── institutionData.ts (all mock data)
```

---

## 🚀 Implementation Sessions

### **Session 1: Enhanced Dashboard** ⏳ IN PROGRESS

**Goal**: Create comprehensive institution overview with mock data

**Tasks**:
1. ✅ Save implementation plan
2. ⏳ Create mock data file (`lib/mockData/institutionData.ts`)
3. ⏳ Build `<InstitutionStatsCards />` component
4. ⏳ Build `<QuickActionsBar />` component
5. ⏳ Build `<ProgramsBySport />` component with tabs
6. ⏳ Build `<ActivityFeed />` component
7. ⏳ Update `/mi-equipo/[slug]/page.tsx` institution section (lines 583-784)

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  [← Back]    🏛️ University Athletic Department    [⚙️]  │
│  Multi-Sport Organization                               │
│  15 Teams • 342 Athletes • 8 Sports                     │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬────────────┐
│ 💰 Budget    │ 📦 Orders    │ 🎨 Pending   │ 👥 Staff   │
│ $45K / $60K  │ 23 Active    │ 5 Approvals  │ 12 Coaches │
└──────────────┴──────────────┴──────────────┴────────────┘

┌─── Quick Actions ────────────────────────────────────────┐
│ [+ Create Team] [📋 View All Orders] [💰 Finance Report]│
└─────────────────────────────────────────────────────────┘

┌─── Programs by Sport (Tabs) ────────────────────────────┐
│ [⚽ Soccer (5)] [🏀 Basketball (3)] [🏐 Volleyball (4)] │
│                                                          │
│ ⚽ Soccer Program                                        │
│ ├─ Varsity Men          [👥 25] [🎨 Approved] [➜]      │
│ ├─ Varsity Women        [👥 22] [⏳ Pending]  [➜]      │
│ ├─ JV Men               [👥 18] [🎨 Approved] [➜]      │
│ └─ U-17 Boys            [👥 20] [⏳ Pending]  [➜]      │
└─────────────────────────────────────────────────────────┘

┌─── Recent Activity ──────────────────────────────────────┐
│ • Varsity Soccer ordered 25 jerseys           (2h ago)  │
│ • Women's Basketball design needs approval    (5h ago)  │
│ • JV Volleyball roster complete                (1d ago) │
│ [View All Activity →]                                    │
└─────────────────────────────────────────────────────────┘
```

**Outcome**: Complete institution dashboard with mock data visible

---

### **Session 2: Orders Manager** 📋 PENDING

**Goal**: Build unified orders view across all teams

**New Route**: `/mi-equipo/[slug]/orders/page.tsx`

**Tasks**:
1. Create orders page route
2. Build `<OrdersFilterBar />` component
3. Build `<OrdersTable />` component
4. Build `<OrderDetailModal />` component
5. Add mock orders data
6. Add navigation link from dashboard

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  📦 Orders Manager - All Teams                          │
└─────────────────────────────────────────────────────────┘

┌─── Filters ──────────────────────────────────────────────┐
│ Sport: [All ▾] Status: [All ▾] Date: [Last 30 days ▾]  │
│ Search: [___________] [🔍]              [Export CSV ⬇️] │
└─────────────────────────────────────────────────────────┘

┌─── Orders Table ─────────────────────────────────────────┐
│ Order #  │ Team          │ Items │ Total    │ Status    │
├──────────┼───────────────┼───────┼──────────┼───────────┤
│ #1234    │ Varsity Soccer│ 25    │ $3,250   │ ✅ Paid   │
│ #1235    │ JV Basketball │ 18    │ $2,340   │ ⏳ Pending│
│ #1236    │ Women's Volley│ 22    │ $2,860   │ 🚚 Shipped│
└─────────────────────────────────────────────────────────┘

[Bulk Actions: ☐ Select All] [Approve Selected] [Export]
```

**Outcome**: Click "View All Orders" button → see orders manager page

---

### **Session 3: Programs & Finance** 🏆💰 PENDING

**Goal**: Build program structure and budget tracking

**New Routes**:
- `/mi-equipo/[slug]/programs/page.tsx`
- `/mi-equipo/[slug]/finance/page.tsx`

**Tasks - Programs**:
1. Create programs page route
2. Build `<ProgramCard />` component
3. Build `<TeamCard />` component (nested)
4. Add program navigation

**Tasks - Finance**:
1. Create finance page route
2. Build `<BudgetOverviewCard />` component
3. Build `<ProgramBudgetBreakdown />` component
4. Build `<InvoiceList />` component
5. Add finance navigation

**Outcome**: Full navigation between Dashboard → Programs → Finance

---

### **Session 4: Communications** 📢 PENDING

**Goal**: Build announcement and approval center

**New Route**: `/mi-equipo/[slug]/communications/page.tsx`

**Tasks**:
1. Create communications page route
2. Build `<AnnouncementComposer />` component
3. Build `<ApprovalQueue />` component
4. Build `<AnnouncementHistory />` component
5. Add communications navigation

**Outcome**: Complete institution UI ready for backend integration

---

## 🗄️ Mock Data Structure

```typescript
// lib/mockData/institutionData.ts

export const mockInstitution = {
  id: 'inst-1',
  name: 'Lincoln High Athletics',
  logo_url: null, // Will use from database
  stats: {
    totalTeams: 15,
    totalAthletes: 342,
    totalSports: 8,
    budgetUsed: 45000,
    budgetTotal: 60000,
    activeOrders: 23,
    pendingApprovals: 5,
    staffCount: 12,
  },
  programs: [
    {
      sport: 'Soccer',
      sportSlug: 'futbol',
      emoji: '⚽',
      teams: [
        {
          id: 'team-1',
          name: 'Varsity Men',
          slug: 'varsity-men-soccer',
          members: 25,
          status: 'approved',
          coach: 'John Smith',
          designStatus: 'approved',
        },
        {
          id: 'team-2',
          name: 'Varsity Women',
          slug: 'varsity-women-soccer',
          members: 22,
          status: 'pending',
          coach: 'Sarah Johnson',
          designStatus: 'pending',
        },
      ]
    },
    {
      sport: 'Basketball',
      sportSlug: 'basquetbol',
      emoji: '🏀',
      teams: [
        {
          id: 'team-3',
          name: 'Varsity Men',
          slug: 'varsity-men-basketball',
          members: 15,
          status: 'approved',
          coach: 'Mike Davis',
          designStatus: 'approved',
        },
      ]
    },
  ],
  recentActivity: [
    {
      id: 'act-1',
      action: 'Varsity Soccer ordered 25 jerseys',
      timestamp: '2h ago',
      teamSlug: 'varsity-soccer',
      type: 'order',
    },
    {
      id: 'act-2',
      action: "Women's Basketball design needs approval",
      timestamp: '5h ago',
      teamSlug: 'womens-basketball',
      type: 'approval',
    },
  ],
  orders: [
    {
      id: 'order-1',
      orderNumber: '#1234',
      teamName: 'Varsity Soccer',
      teamSlug: 'varsity-soccer',
      sport: 'Soccer',
      items: 25,
      totalCents: 325000,
      status: 'paid',
      date: '2025-10-12',
    },
  ],
  budgets: [
    {
      sport: 'Soccer',
      budgetTotal: 20000,
      budgetUsed: 15000,
      percentage: 75,
    },
    {
      sport: 'Basketball',
      budgetTotal: 18000,
      budgetUsed: 12000,
      percentage: 67,
    },
  ],
};
```

---

## 🔌 Backend Integration (Future - After UI Review)

### Database Tables Needed:

**New Tables**:
```sql
-- Institution budgets
CREATE TABLE institution_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES teams(id),
  sport_id BIGINT REFERENCES sports(id),
  budget_total_cents INTEGER NOT NULL,
  budget_used_cents INTEGER DEFAULT 0,
  fiscal_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach assignments
CREATE TABLE coach_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  coach_user_id UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id)
);

-- Institution announcements
CREATE TABLE institution_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES teams(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_teams UUID[] DEFAULT ARRAY[]::UUID[],
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Existing Tables to Query**:
- `teams` (filter by `institution_name`)
- `team_memberships` (count staff)
- `design_requests` (pending approvals)
- `orders` (all orders across teams)
- `player_info_submissions` (total athletes)

---

## ✅ Review Checklist (After Each Session)

- [ ] UI matches design mockup
- [ ] All mock data displays correctly
- [ ] Navigation works between pages
- [ ] Responsive on mobile/tablet/desktop
- [ ] Dark theme consistency maintained
- [ ] Loading states exist (even if instant with mock data)
- [ ] Error states handled gracefully
- [ ] Stakeholder approval received

---

## 🚦 Current Status

**Session 1**: ⏳ IN PROGRESS
**Next Step**: Create mock data file and start building components

**Notes**:
- Using existing dark theme styling from `/mi-equipo/[slug]/page.tsx`
- Maintaining gradient backgrounds and glassmorphism effects
- All components will use mock data initially
- Backend integration deferred until UI approved

---

## 📝 Open Questions

1. **Navigation Style**: Tabs at top or sidebar for institution pages?
   - **Decision**: TBD after seeing dashboard

2. **Color Scheme**: Keep dark theme or lighter for institution?
   - **Decision**: Keep dark theme (consistent with current app)

3. **Budget System**: Need new `institution_budgets` table?
   - **Decision**: TBD after finance tracker review

4. **Role Hierarchy**: Use existing `team_memberships.role_type` or new table?
   - **Decision**: TBD - evaluate during backend integration

---

## 🎯 Success Criteria

After Session 4 completion:
- ✅ Athletic Director can see all teams at a glance
- ✅ Can navigate between dashboard/orders/programs/finance/communications
- ✅ All mock interactions work (filters, tabs, modals)
- ✅ UI ready for stakeholder review
- ✅ Clear path to backend integration identified

---

**Last Updated**: 2025-10-13
**Implementation Lead**: Claude Code
**Stakeholder**: User
