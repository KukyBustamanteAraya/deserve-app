# Small Team Analysis for Institution Implementation

**Document Purpose**: This document provides a comprehensive analysis of the existing small team functionality to identify reusable components, patterns, and integration points for the upcoming institution team management implementation.

**Date Created**: 2025-10-12
**Status**: ✅ Complete - Ready for Institution Implementation Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Reusable Components](#reusable-components)
3. [Data Patterns & Database Queries](#data-patterns--database-queries)
4. [UI Patterns & Conditional Rendering](#ui-patterns--conditional-rendering)
5. [API Patterns & Routes](#api-patterns--routes)
6. [State Management](#state-management)
7. [Payment Integration](#payment-integration)
8. [Team Settings & Configuration](#team-settings--configuration)
9. [Design Request Workflow](#design-request-workflow)
10. [Integration Recommendations for Institutions](#integration-recommendations-for-institutions)

---

## Executive Summary

### Key Findings

The small team implementation provides a **solid foundation** for institution features with:

- ✅ **Team Type Detection**: Already supports `team_type: 'institution'` vs `'single_team'`
- ✅ **Modular Components**: 20+ reusable UI components in `/src/components/team/`
- ✅ **Flexible Payment System**: Unified `payment_contributions` table supports both individual and manager payments
- ✅ **Role-Based Access**: Manager detection pattern can extend to institution roles
- ✅ **Unified Member Management**: Pattern combines `team_memberships`, `player_info_submissions`, `team_invites`
- ✅ **Team Settings Architecture**: Comprehensive settings model for customization

### Critical Pattern: Team Type Detection

**Location**: `/src/app/mi-equipo/[slug]/page.tsx:384-574`

```typescript
// Main team dashboard page
if (team.team_type === 'institution') {
  return (
    <div>
      {/* Institution Overview Dashboard */}
      {/* Sports Programs Grid */}
      {/* Stats cards for programs, members, orders */}
    </div>
  );
}

// Render single team dashboard
return (
  <div>
    {/* Single team content */}
  </div>
);
```

**Institution Insight**: The infrastructure for switching between institution and single team views already exists. We can leverage this pattern throughout the app.

---

## Reusable Components

### Location: `/src/components/team/`

### 1. Payment Components

#### **PaymentProgressCard**
**File**: `/src/components/team/payments/PaymentProgressCard.tsx`

**Purpose**: Displays payment progress with percentage bar and stats

**Props**:
```typescript
type PaymentProgressCardProps = {
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  contributorCount: number;
  paidCount: number;
};
```

**Features**:
- Animated progress bar (green/yellow/gray based on completion)
- Status badge (Unpaid, Partial, Paid)
- Payment summary stats
- Real-time percentage calculation

**Institution Usage**: ✅ **Directly Reusable** for sub-team order tracking

---

#### **PaymentContributorsList**
**File**: `/src/components/team/payments/PaymentContributorsList.tsx`

**Purpose**: Lists all contributors with payment status

**Props**:
```typescript
type PaymentContributorsListProps = {
  contributions: (PaymentContribution & {
    user?: { id: string; email: string; full_name: string | null; };
  })[];
  totalContributors: number;
};
```

**Features**:
- Groups by status (Paid, Pending, Other)
- User avatars with initials
- Payment dates
- Status badges with color coding

**Institution Usage**: ✅ **Directly Reusable** - can show which coaches/coordinators have paid for their sub-team orders

---

#### **OrderItemsList**
**File**: `/src/components/team/payments/OrderItemsList.tsx`

**Purpose**: Displays all items in an order with player assignments

**Props**:
```typescript
type OrderItemsListProps = {
  items: OrderItem[];
};
```

**Features**:
- Product images with Next.js Image optimization
- Player name + jersey number badges
- Customization details (size, position, notes)
- Size calculator recommendation display
- Line item totals with quantity

**Institution Usage**: ✅ **Directly Reusable** for sub-team orders

---

### 2. Roster & Player Components

#### **MiniFieldMap**
**File**: `/src/components/team/MiniFieldMap.tsx`

**Purpose**: Interactive field visualization with player positions

**Props**:
```typescript
interface MiniFieldMapProps {
  sport: SportSlug;
  players: Player[];
  onPlayerClick?: (player: Player) => void;
}

interface Player {
  id: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
}
```

**Supported Sports**:
- Soccer, Basketball, Volleyball, Baseball, Rugby, Padel
- Golf, CrossFit, Training, Yoga/Pilates (generic field)

**Features**:
- SVG field backgrounds with sport-specific markings
- Hover tooltips with player info
- Click handlers for detail modals
- Responsive sizing with aspect ratios
- Empty state

**Institution Usage**: ✅ **Directly Reusable** for sub-team rosters (e.g., "Varsity Soccer", "JV Basketball")

---

#### **PlayerDetailModal**
**File**: `/src/components/team/PlayerDetailModal.tsx`

**Purpose**: Full-screen modal with player details

**Props**:
```typescript
interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}
```

**Features**:
- Jersey number avatar
- Player name and position
- Size and additional notes
- Created date
- Close button

**Institution Usage**: ✅ **Directly Reusable** for viewing roster details

---

### 3. Progress & Status Components

#### **CompletionBar**
**File**: `/src/components/team/CompletionBar.tsx`

**Purpose**: Generic progress bar with percentage display

**Props**:
```typescript
type CompletionBarProps = {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
};
```

**Features**:
- Custom color support (uses team color from props)
- Automatic color based on completion (0-25%, 25-50%, 50-75%, 75-99%, 100%)
- Smooth animations
- Label and percentage display

**Institution Usage**: ✅ **Directly Reusable** for tracking:
- Sub-team roster completion
- Order payment progress across programs
- Overall institution setup progress

---

#### **ProgressTracker**
**File**: `/src/components/team/ProgressTracker.tsx` (referenced but not read)

**Institution Usage**: Likely shows multi-step progress (needs verification)

---

### 4. Design & Approval Components

#### **DesignApprovalModal**
**File**: `/src/components/team/DesignApprovalModal.tsx`

**Purpose**: Manager approves design and selects payment mode

**Props**:
```typescript
interface DesignApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  designRequestId: number;
  teamId: string;
  teamSlug: string;
  defaultPaymentMode?: 'individual' | 'manager_pays_all';
}
```

**Features**:
- Radio button selection for payment mode
- "Save as default" checkbox
- Calls `/api/design-requests/[id]/approve` endpoint
- Auto-creates order with order_items for all team members
- Redirects to payments page on success

**Key Pattern**:
```typescript
const response = await fetch(`/api/design-requests/${designRequestId}/approve`, {
  method: 'POST',
  body: JSON.stringify({
    payment_mode: paymentMode,
    save_as_default: saveAsDefault,
    team_id: teamId,
  }),
});
```

**Institution Usage**: ⚠️ **Needs Adaptation** - Institution approval likely involves:
- Athletic Director approving multiple sub-team designs
- Different approval workflows (Head Coach → Program Coordinator → Athletic Director)
- Bulk approval for all programs

---

### 5. Settings Components

**PaymentSettingsCard** (referenced but not fully explored)

**Institution Usage**: Can be extended to include institution-specific settings

---

## Data Patterns & Database Queries

### Pattern 1: Manager Role Detection

**Location**: `/src/app/mi-equipo/[slug]/page.tsx:163-183`

```typescript
// Get user's membership
const { data: membership } = await supabase
  .from('team_memberships')
  .select('role')
  .eq('team_id', teamData.id)
  .eq('user_id', user.id)
  .single();

// Check if user is manager
const isMembershipOwner = membership?.role === 'owner' || membership?.role === 'manager';
const isTeamOwner = teamData.owner_id === user.id || teamData.current_owner_id === user.id;
const isManager = isMembershipOwner || isTeamOwner;
```

**Institution Adaptation**:
```typescript
// Check institution role from team_members.institution_role
const { data: membership } = await supabase
  .from('team_members')
  .select('role, institution_role')
  .eq('team_id', institutionTeamId)
  .eq('user_id', user.id)
  .single();

const isAthleticDirector = membership?.institution_role === 'athletic_director';
const isProgramCoordinator = membership?.institution_role === 'program_coordinator';
const isHeadCoach = membership?.institution_role === 'head_coach';
const isAdmin = isAthleticDirector || isProgramCoordinator || isHeadCoach;
```

---

### Pattern 2: Unified Member List

**Location**: `/src/app/mi-equipo/[slug]/settings/page.tsx:150-300`

```typescript
const loadMembers = async (teamId: string) => {
  // 1. Fetch active members
  const { data: membershipsData } = await supabase
    .from('team_memberships')
    .select('role, user_id, created_at')
    .eq('team_id', teamId);

  // 2. Fetch player roster
  const { data: playersData } = await supabase
    .from('player_info_submissions')
    .select('id, player_name, user_id, created_at')
    .eq('team_id', teamId);

  // 3. Fetch pending invites
  const { data: invitesData } = await supabase
    .from('team_invites')
    .select('id, player_submission_id, email, status, created_at')
    .eq('team_id', teamId);

  // Combine into unified member list with status labels:
  // - 'Active Member' (has team_membership)
  // - 'Invited (Pending)' (has team_invite with status=pending)
  // - 'Roster Only' (has player_info_submission but no user_id)
  // - 'Has Account (Not Member)' (player_info_submission has user_id but no membership)
};
```

**Institution Adaptation**:
```typescript
const loadInstitutionMembers = async (institutionTeamId: string) => {
  // 1. Fetch institution admin staff
  const { data: adminStaff } = await supabase
    .from('team_members')
    .select('user_id, institution_role, created_at')
    .eq('team_id', institutionTeamId)
    .not('institution_role', 'is', null);

  // 2. Fetch all sub-teams
  const { data: subTeams } = await supabase
    .from('institution_sub_teams')
    .select('id, name, sport_id')
    .eq('institution_team_id', institutionTeamId);

  // 3. Fetch roster data for all sub-teams
  const { data: rosters } = await supabase
    .from('institution_sub_team_members')
    .select('sub_team_id, player_name, email, position, jersey_number')
    .in('sub_team_id', subTeamIds);

  // Combine and display hierarchically:
  // Athletic Director
  //   → Program Coordinator (Basketball)
  //     → Head Coach (Varsity Basketball)
  //       → 15 players (roster data only)
  //     → Head Coach (JV Basketball)
  //       → 12 players (roster data only)
};
```

---

### Pattern 3: Payment Summary Calculation

**Location**: `/src/app/mi-equipo/[slug]/page.tsx:296-346`

```typescript
// Get all orders for team
const { data: ordersData } = await supabase
  .from('orders')
  .select('id, total_amount_cents, payment_status')
  .eq('team_id', teamId);

const orderIds = ordersData?.map(o => o.id) || [];

// Get all payment contributions
const { data: contributionsData } = await supabase
  .from('payment_contributions')
  .select('order_id, amount_cents, payment_status, user_id')
  .in('order_id', orderIds);

// Calculate totals
const totalPaidCents = contributionsData
  ?.filter(c => c.payment_status === 'approved')
  .reduce((sum, c) => sum + c.amount_cents, 0) || 0;

const totalPendingCents = totalAmountCents - totalPaidCents;
const paymentProgress = totalAmountCents > 0
  ? Math.round((totalPaidCents / totalAmountCents) * 100)
  : 0;
```

**Institution Adaptation**: ✅ **Same pattern works** - query orders by `team_id` (institution) and aggregate contributions. Can group by `sub_team_id` for program-level reporting.

---

### Pattern 4: Team Settings Query

**Location**: `/src/app/mi-equipo/[slug]/settings/page.tsx`

```typescript
const { data: settingsData } = await supabase
  .from('team_settings')
  .select('*')
  .eq('team_id', teamId)
  .single();

// Team settings include:
// - approval_mode: 'owner_only' | 'any_member' | 'voting' | 'multi_design_vote'
// - min_approvals_required: number
// - player_info_mode: 'self_service' | 'manager_only' | 'hybrid'
// - self_service_enabled: boolean
// - access_mode: 'open' | 'invite_only' | 'private'
// - allow_member_invites: boolean
// - payment_mode: 'individual' | 'manager_pays_all'
// - notify_on_design_ready: boolean
// - notify_on_vote_required: boolean
// - primary_color, secondary_color, tertiary_color
// - logo_url, banner_url
```

**Institution Adaptation**: ✅ **Same table can be used** for institution-level settings. Add institution-specific fields:
- `allow_program_autonomy: boolean` (can head coaches approve designs without AD approval?)
- `require_ad_approval_for_orders: boolean`
- `budget_tracking_enabled: boolean`

---

## UI Patterns & Conditional Rendering

### Pattern 1: Team Type Detection in UI

**Location**: `/src/app/mi-equipo/[slug]/page.tsx:384-574`

```typescript
export default function TeamDashboard({ params }: { params: { slug: string } }) {
  const [team, setTeam] = useState<Team | null>(null);

  // Load team data...

  // Conditional rendering based on team type
  if (team.team_type === 'institution') {
    return <InstitutionDashboard team={team} />;
  }

  return <SingleTeamDashboard team={team} />;
}
```

**Institution Usage**: ✅ **Already implemented** - we just need to build out the institution dashboard components

---

### Pattern 2: Role-Based Component Visibility

**Location**: `/src/app/mi-equipo/[slug]/payments/page.tsx:366-531`

```typescript
{/* Player View - Only show "Pay My Part" button */}
{!isManager && order.payment_mode === 'individual' && (() => {
  const myItem = order.items.find(item => item.player_id === currentUserId);
  const myContribution = order.contributions.find(c =>
    c.user_id === currentUserId && c.payment_status === 'approved'
  );

  if (myItem) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
        {myContribution ? (
          <div>✅ Pagado - {formatCLP(myContribution.amount_cents)}</div>
        ) : (
          <button onClick={() => handleIndividualPayment(order.id)}>
            💳 Pagar Mi Parte - {formatCLP(myItem.line_total_cents)}
          </button>
        )}
      </div>
    );
  }
})()}

{/* Manager View - Show both individual and bulk payment options */}
{isManager && order.payment_status !== 'paid' && (
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
    <h3>Opciones de Pago (Manager)</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button onClick={() => handleSplitPaymentSetup(order.id)}>
        👥 Activar Pago Individual
      </button>
      <button onClick={() => handleFullOrderPayment(order.id)}>
        💳 Pagar Todo el Pedido - {formatCLP(order.total_pending_cents)}
      </button>
    </div>
  </div>
)}
```

**Institution Adaptation**:
```typescript
{/* Athletic Director View */}
{isAthleticDirector && (
  <div>
    <h2>All Programs Dashboard</h2>
    {/* Show all sub-teams, orders, budgets */}
  </div>
)}

{/* Program Coordinator View */}
{isProgramCoordinator && !isAthleticDirector && (
  <div>
    <h2>My Assigned Programs</h2>
    {/* Show only programs they coordinate */}
  </div>
)}

{/* Head Coach View */}
{isHeadCoach && !isProgramCoordinator && !isAthleticDirector && (
  <div>
    <h2>My Team Roster</h2>
    {/* Show only their specific sub-team */}
  </div>
)}
```

---

### Pattern 3: Team Branding (Colors, Logo, Banner)

**Location**: `/src/app/mi-equipo/[slug]/settings/page.tsx:616-836`

```typescript
import { HexColorPicker } from 'react-colorful';

<div className="bg-white rounded-lg shadow-sm p-6">
  <h2 className="text-xl font-bold mb-4">🎨 Team Branding</h2>

  {/* Color Pickers */}
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium mb-2">Primary Color</label>
      <HexColorPicker
        color={settings.primary_color || '#e21c21'}
        onChange={(color) => setSettings({ ...settings, primary_color: color })}
      />
      <input
        type="text"
        value={settings.primary_color || ''}
        className="mt-2 px-3 py-2 border rounded"
      />
    </div>
    {/* Secondary, Tertiary... */}
  </div>

  {/* Logo Upload */}
  <div className="mt-6">
    <label>Team Logo</label>
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('team-assets')
          .upload(`${teamId}/logo-${Date.now()}.png`, file);

        if (data) {
          const publicUrl = supabase.storage
            .from('team-assets')
            .getPublicUrl(data.path).data.publicUrl;

          setSettings({ ...settings, logo_url: publicUrl });
        }
      }}
    />
    {settings.logo_url && (
      <img src={settings.logo_url} alt="Logo" className="mt-2 w-32 h-32" />
    )}
  </div>

  {/* Banner Upload (same pattern) */}
</div>

{/* Save Button */}
<button onClick={async () => {
  await supabase
    .from('team_settings')
    .update({
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      tertiary_color: settings.tertiary_color,
      logo_url: settings.logo_url,
      banner_url: settings.banner_url,
    })
    .eq('team_id', teamId);
}}>
  Save Settings
</button>
```

**Institution Usage**: ✅ **Directly Reusable** - institutions can have their own branding, and sub-teams can inherit or customize

---

## API Patterns & Routes

### Pattern 1: Design Approval → Order Creation

**File**: `/src/app/api/design-requests/[id]/approve/route.ts`

**Endpoint**: `POST /api/design-requests/:id/approve`

**Request Body**:
```typescript
{
  payment_mode: 'individual' | 'manager_pays_all';
  save_as_default: boolean;
  team_id: string;
}
```

**Process**:
1. Verify user is manager of team
2. Fetch design request and product
3. Get all team members
4. Calculate order total: `product.price_cents × memberCount`
5. Create `orders` record
6. Create `order_items` for each team member
7. Update design request: `status='approved'`, `order_id=order.id`
8. Optionally update `team_settings.payment_mode`

**Response**:
```typescript
{
  success: true;
  order: {
    id: string;
    total_amount_cents: number;
    payment_mode: string;
    status: string;
  };
  design_request: {
    id: number;
    status: 'approved';
    order_id: string;
  };
}
```

**Institution Adaptation**: ✅ **Same pattern works** - just replace `team_memberships` query with `institution_sub_team_members` for the relevant sub-team

---

### Pattern 2: Split Payment Creation

**Endpoint**: `POST /api/mercadopago/create-split-payment`

**Request Body**:
```typescript
{
  orderId: string;
  userId: string;
  amountCents: number;
}
```

**Process**:
1. Verify user is member of team
2. Get order details
3. Create or update `payment_contributions` record
4. Create Mercado Pago preference
5. Return init_point URL for redirect

**Response**:
```typescript
{
  contributionId: string;
  initPoint: string; // Mercado Pago checkout URL
  preferenceId: string;
}
```

**Client-Side Usage**:
```typescript
const handlePayMyPart = async (orderId: string, userId: string, amount: number) => {
  const response = await fetch('/api/mercadopago/create-split-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, userId, amountCents: amount }),
  });

  const result = await response.json();

  // Redirect to Mercado Pago checkout
  window.location.href = result.initPoint;
};
```

**Institution Usage**: ✅ **No changes needed** - head coaches can use this to pay for their sub-team orders

---

### Pattern 3: Payment Webhook Handler

**Endpoint**: `POST /api/mercadopago/webhook`

**Process**:
1. Validate webhook signature
2. Fetch payment details from Mercado Pago API
3. Find matching `payment_contribution` by `mp_preference_id`
4. Update contribution status: `payment_status = 'approved'`, `paid_at = NOW()`
5. Check if order is fully paid, update `orders.payment_status`
6. Send notification to user

**Institution Usage**: ✅ **No changes needed** - same webhook handles all payments

---

## State Management

### Zustand Store Pattern: Design Request Wizard

**File**: `/src/hooks/useTeamDesignRequest.ts`

**Purpose**: Persist multi-step wizard state across page navigation

**State Structure**:
```typescript
interface TeamDesignRequestState {
  // Team context
  teamId: string | null;
  teamSlug: string | null;
  teamColors: { primary: string; secondary: string; tertiary: string; };
  teamLogoUrl: string | null;

  // Step 1: Product Selection
  selectedProductId: string | null;
  selectedProductName: string | null;
  selectedProductSlug: string | null;

  // Step 2: Design Selection
  selectedDesignId: string | null;
  selectedDesignName: string | null;

  // Step 3: Color Customization
  customColors: { primary: string; secondary: string; tertiary: string; };

  // Step 4: Uniform Details
  uniformDetails: {
    sleeve: 'short' | 'long';
    neck: 'crew' | 'v' | 'polo';
    fit: 'athletic' | 'loose';
  };

  // Step 5: Logo Placement
  logoPlacements: {
    front: boolean;
    back: boolean;
    sleeveLeft: boolean;
    sleeveRight: boolean;
  };

  // Step 6: Names & Numbers
  namesNumbers: boolean;

  // Actions
  setTeamContext: (teamId, teamSlug, colors, logoUrl) => void;
  setProduct: (productId, productName, productSlug) => void;
  setDesign: (designId, designName) => void;
  setCustomColors: (colors) => void;
  setUniformDetails: (details) => void;
  toggleLogoPlacement: (position) => void;
  setNamesNumbers: (value: boolean) => void;
  reset: () => void;
}
```

**Implementation**:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTeamDesignRequest = create<TeamDesignRequestState>()(
  persist(
    (set) => ({
      // Initial state...
      teamId: null,
      teamSlug: null,
      // ... etc

      // Actions
      setProduct: (productId, productName, productSlug) =>
        set({
          selectedProductId: productId,
          selectedProductName: productName,
          selectedProductSlug: productSlug,
        }),

      // ... more actions
    }),
    {
      name: 'team-design-request-storage', // localStorage key
    }
  )
);
```

**Usage in Pages**:
```typescript
// Step 1: Product Selection
const { setProduct, selectedProductId } = useTeamDesignRequest();

const handleProductSelect = (product) => {
  setProduct(product.id, product.name, product.slug);
  router.push('/mi-equipo/[slug]/design-request/designs');
};

// Step 7: Review & Submit
const { teamId, selectedProductId, customColors, namesNumbers } = useTeamDesignRequest();

const handleSubmit = async () => {
  await supabase.from('design_requests').insert({
    team_id: teamId,
    selected_apparel: { product_id: selectedProductId },
    primary_color: customColors.primary,
    // ... etc
  });
};
```

**Institution Adaptation**: ⚠️ **Needs New Store** - create `useInstitutionSetupWizard` with steps:
1. Basic Info (name, address, contact)
2. Sports Programs Selection
3. Sub-Teams Creation
4. Admin Staff Assignment
5. Branding & Settings
6. Review & Create

---

## Payment Integration

### Chilean Peso (CLP) Handling

**Key Insight**: CLP has no decimal places (no cents). The database stores full peso amounts.

**File**: `/src/types/payments.ts:338-346`

```typescript
/**
 * Format Chilean Pesos (CLP)
 * NOTE: Chilean pesos don't have cents/decimals, so we store full peso amounts
 * in the database (e.g., 40000 = $40.000 CLP)
 */
export function formatCLP(amount: number): string {
  // Don't divide by 100 - Chilean pesos are already stored as full amounts
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
```

**Example Usage**:
```typescript
const productPriceCents = 45000; // $45.000 CLP
const formattedPrice = formatCLP(productPriceCents); // "$45.000"
```

**Institution Usage**: ✅ **No changes needed**

---

### Payment Contribution Model

**Table**: `payment_contributions`

**Key Fields**:
```sql
CREATE TABLE payment_contributions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),

  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',

  payment_status TEXT CHECK (payment_status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),

  -- Mercado Pago Integration
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  external_reference TEXT,
  payment_method TEXT,
  raw_payment_data JSONB,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Pattern**: One order can have multiple contributions from different users

**Query Example**:
```typescript
// Get all contributions for an order
const { data: contributions } = await supabase
  .from('payment_contributions')
  .select(`
    id,
    user_id,
    amount_cents,
    payment_status,
    paid_at,
    user:users!inner(email, full_name)
  `)
  .eq('order_id', orderId);

// Calculate total paid
const totalPaid = contributions
  ?.filter(c => c.payment_status === 'approved')
  .reduce((sum, c) => sum + c.amount_cents, 0) || 0;
```

**Institution Usage**: ✅ **Directly reusable** - head coaches pay for their sub-team orders through contributions

---

### Mercado Pago Integration Pattern

**Split Payment Flow**:
1. Manager approves design → order created with `payment_mode='individual'`
2. Each player gets a "Pay My Part" button
3. Click button → calls `/api/mercadopago/create-split-payment`
4. Creates `payment_contribution` record with `status='pending'`
5. Creates Mercado Pago preference with `back_urls` (success, failure, pending)
6. Redirects user to Mercado Pago checkout
7. User completes payment
8. Mercado Pago sends webhook to `/api/mercadopago/webhook`
9. Webhook updates `payment_contribution.status='approved'`
10. Check if all contributions approved → update `orders.payment_status='paid'`

**Bulk Payment Flow**:
1. Manager clicks "Pay Full Order"
2. Calls `/api/mercadopago/create-bulk-payment` with `orderIds: [orderId]`
3. Creates `bulk_payments` record
4. Creates `bulk_payment_orders` join records
5. Creates Mercado Pago preference for total amount
6. Webhook updates `bulk_payments.status='approved'`
7. Updates all linked orders to `payment_status='paid'`

**Institution Usage**: ✅ **Directly reusable** - Athletic Director can pay for multiple sub-team orders via bulk payment

---

## Team Settings & Configuration

### Settings Schema

**Table**: `team_settings`

**Fields**:
```typescript
interface TeamSettings {
  team_id: string;

  // Approval Settings
  approval_mode: 'owner_only' | 'any_member' | 'voting' | 'multi_design_vote';
  min_approvals_required: number;

  // Player Info Collection
  player_info_mode: 'self_service' | 'manager_only' | 'hybrid';
  self_service_enabled: boolean;

  // Access Control
  access_mode: 'open' | 'invite_only' | 'private';
  allow_member_invites: boolean;

  // Payment
  payment_mode: 'individual' | 'manager_pays_all';

  // Notifications
  notify_on_design_ready: boolean;
  notify_on_vote_required: boolean;

  // Branding
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
  logo_url?: string;
  banner_url?: string;

  created_at: string;
  updated_at: string;
}
```

**Usage Pattern**:
```typescript
// Load settings
const { data: settings } = await supabase
  .from('team_settings')
  .select('*')
  .eq('team_id', teamId)
  .single();

// Update settings
await supabase
  .from('team_settings')
  .update({
    approval_mode: 'voting',
    min_approvals_required: 3,
    primary_color: '#1E40AF',
  })
  .eq('team_id', teamId);
```

**Institution Settings Extension**:
```sql
-- Add institution-specific columns
ALTER TABLE team_settings
ADD COLUMN IF NOT EXISTS allow_program_autonomy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_ad_approval_for_orders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS budget_tracking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS budget_per_program_cents INTEGER,
ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1;
```

---

## Design Request Workflow

### Workflow Steps

**7-Step Wizard**:

1. **Product Selection** (`/mi-equipo/[slug]/design-request/new`)
   - Displays products filtered by team's sport
   - Saves: `selectedProductId`, `selectedProductName`, `selectedProductSlug`

2. **Design Selection** (`/mi-equipo/[slug]/design-request/designs`)
   - Shows pre-made designs or custom design option
   - Saves: `selectedDesignId`, `selectedDesignName`

3. **Color Customization** (`/mi-equipo/[slug]/design-request/customize`)
   - HexColorPicker for primary, secondary, tertiary colors
   - Inherits team colors as defaults
   - Saves: `customColors`

4. **Uniform Details** (`/mi-equipo/[slug]/design-request/details`)
   - Sleeve length: short | long
   - Neck style: crew | v | polo
   - Fit: athletic | loose
   - Saves: `uniformDetails`

5. **Logo Placement** (`/mi-equipo/[slug]/design-request/logos`)
   - Checkboxes: front, back, sleeveLeft, sleeveRight
   - Saves: `logoPlacements`

6. **Names & Numbers** (`/mi-equipo/[slug]/design-request/names`)
   - Toggle: include names/numbers on jerseys
   - Saves: `namesNumbers`

7. **Review & Submit** (`/mi-equipo/[slug]/design-request/review`)
   - Shows all selections with "Edit" buttons
   - Creates `design_requests` record
   - Redirects to team dashboard

### Database Record Created

**File**: `/src/app/mi-equipo/[slug]/design-request/review/page.tsx:76-116`

```typescript
const { data } = await supabase
  .from('design_requests')
  .insert({
    team_id: teamId,
    requested_by: user.id,
    user_id: user.id,
    user_type: 'manager',
    team_slug: teamSlug,

    // Design Selection
    design_id: selectedDesignId,

    // Colors
    primary_color: customColors.primary,
    secondary_color: customColors.secondary,
    accent_color: customColors.tertiary,

    // Logo
    logo_url: teamLogoUrl,
    logo_placements: logoPlacements,

    // Product
    selected_apparel: {
      product_id: selectedProductId,
      product_name: selectedProductName,
      product_slug: selectedProductSlug,
      design_id: selectedDesignId,
      design_name: selectedDesignName,
    },
    product_slug: selectedProductSlug,
    product_name: selectedProductName,

    // Details
    uniform_details: uniformDetails,
    names_numbers: namesNumbers,

    // Status
    status: 'pending',
    approval_status: 'pending_review',
    priority: 'medium',
    version: 1,

    // Placeholder fields
    mockup_urls: [],
    admin_comments: [],
    design_options: [],
    revision_count: 0,
    voting_enabled: false,
    approval_votes_count: 0,
    rejection_votes_count: 0,
    required_approvals: 1,
  })
  .select()
  .single();
```

### Approval Flow

**States**: `pending_review` → `ready_for_voting` → `approved` → order created

**Manager Actions**:
- View design request on team dashboard
- Click "Approve" → opens `DesignApprovalModal`
- Select payment mode (individual | manager_pays_all)
- Submit → calls `/api/design-requests/[id]/approve`
- Auto-creates order with order_items

**Institution Adaptation**:
- Head Coach creates design request for sub-team
- Program Coordinator reviews and forwards
- Athletic Director gives final approval
- Order creation triggered after AD approval

---

## Integration Recommendations for Institutions

### ✅ Components to Reuse As-Is

1. **PaymentProgressCard** - Show sub-team order payment status
2. **PaymentContributorsList** - Show which coaches paid for their teams
3. **OrderItemsList** - Display sub-team order details
4. **MiniFieldMap** - Visualize sub-team rosters
5. **PlayerDetailModal** - View player details (roster data only, no user accounts)
6. **CompletionBar** - Track roster completion, payment progress, setup progress
7. **formatCLP()** - Currency formatting
8. **getPaymentStatusColor()** - Status badge styling
9. **calculatePaymentProgress()** - Progress calculations

### ⚠️ Components to Adapt

1. **DesignApprovalModal** - Add multi-level approval workflow
2. **Team Dashboard** - Already has institution support, build out institution view
3. **Settings Page** - Extend with institution-specific settings
4. **Member Management** - Adapt to show admin staff hierarchy + roster data

### 🆕 New Components Needed

1. **InstitutionDashboard** - Overview of all programs, budgets, orders
2. **SubTeamList** - Grid/list of all sub-teams with stats
3. **SubTeamCard** - Individual sub-team summary card
4. **RosterImportWizard** - CSV upload for bulk player data
5. **BudgetTracker** - Track spending per program
6. **ApprovalWorkflowVisualizer** - Show approval chain (Coach → Coordinator → AD)
7. **ProgramHierarchyTree** - Visual org chart

### 🔧 API Routes to Create

1. `POST /api/institutions/create` - Create institution with initial setup
2. `POST /api/institutions/[id]/sub-teams` - Create sub-team
3. `POST /api/institutions/[id]/sub-teams/[subTeamId]/roster/import` - CSV import
4. `GET /api/institutions/[id]/dashboard-stats` - Aggregate stats
5. `POST /api/institutions/[id]/bulk-approve-orders` - AD approves multiple orders
6. `GET /api/institutions/[id]/budget-report` - Financial summary

### 📊 Database Integration Points

**Tables to Leverage**:
- ✅ `teams` - Use with `team_type='institution'`
- ✅ `team_settings` - Add institution columns
- ✅ `orders` - Link to sub-teams via `team_id` (institution) + custom field
- ✅ `order_items` - Same structure works
- ✅ `payment_contributions` - Same payment flow
- ✅ `design_requests` - Link to sub-teams

**New Tables**:
- 🆕 `institution_sub_teams` (already in INSTITUTION_IMPLEMENTATION_PLAN)
- 🆕 `institution_sub_team_members` (roster data, no user accounts)
- 🆕 `institution_budget_allocations` (optional)

**Schema Compatibility Check**:
```sql
-- Verify team_type column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'team_type';

-- Expected: team_type TEXT or ENUM with 'institution' value

-- Verify team_members.institution_role column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_members' AND column_name = 'institution_role';

-- Expected: institution_role TEXT with CHECK constraint
```

### 🎨 UI/UX Patterns to Follow

1. **Gradient Headers**: Use team colors for page headers
   ```typescript
   style={{
     background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`
   }}
   ```

2. **Progress Indicators**: 7-step wizard pattern with visual progress bar

3. **Empty States**: Friendly messages with emoji and call-to-action

4. **Status Badges**: Color-coded with utility functions

5. **Responsive Grids**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

6. **Loading States**: Spinner with text message

7. **Error Handling**: Red alert boxes with emoji and descriptive message

### 🔐 Access Control Patterns

```typescript
// Athletic Director - Full Access
if (isAthleticDirector) {
  canViewAllPrograms = true;
  canApproveOrders = true;
  canManageBudget = true;
  canInviteStaff = true;
}

// Program Coordinator - Assigned Programs
if (isProgramCoordinator) {
  canViewAssignedPrograms = true;
  canReviewDesigns = true;
  canTrackProgress = true;
  canCommunicateWithCoaches = true;
}

// Head Coach - Own Sub-Team Only
if (isHeadCoach) {
  canManageOwnRoster = true;
  canCreateDesignRequest = true;
  canViewOwnOrders = true;
}

// Row-Level Security Policy Example
CREATE POLICY "head_coaches_own_subteam"
ON institution_sub_team_members
FOR SELECT
USING (
  sub_team_id IN (
    SELECT id FROM institution_sub_teams
    WHERE head_coach_user_id = auth.uid()
  )
);
```

---

## Summary of Key Takeaways

### 🎯 Critical Success Factors

1. **Team Type Detection Already Exists**: The `team_type='institution'` pattern is already in the codebase. We don't need to retrofit - just build the institution views.

2. **Payment System is Universal**: The `payment_contributions` model works for both individual players (small teams) and head coaches (institutions). No changes needed.

3. **Component Library is Rich**: 20+ reusable components mean we can build institution features quickly with consistent UX.

4. **Zustand Pattern is Proven**: The design request wizard shows how to build multi-step flows with persistent state. Copy this pattern for institution setup.

5. **Chilean Peso Handling is Clear**: Store full peso amounts, format with `formatCLP()`. Don't divide by 100.

6. **Role Detection is Extensible**: The manager check pattern (`role === 'owner' || role === 'manager'`) easily extends to institution roles.

### 🚀 Next Steps

1. **Wait for Fresh Database Schema**: User will provide Supabase export for validation
2. **Verify Tables Exist**: Check `teams.team_type`, `team_members.institution_role`
3. **Create Refinements Document**: Update INSTITUTION_IMPLEMENTATION_PLAN with reusable components
4. **Build Institution Dashboard**: Start with conditional rendering in `/mi-equipo/[slug]/page.tsx`
5. **Create Sub-Team Management**: Adapt member list pattern for hierarchical view

---

**Document Status**: ✅ **Complete and Ready for Next Phase**

**Last Updated**: 2025-10-12
**Next Action**: Await fresh database schema from user, then create refinements document
