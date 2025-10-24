# Two-Phase Progress Tracker System - Technical Analysis

## Overview

The progress tracker is a **two-phase visual system** that guides teams through the complete journey from design creation to product delivery. It provides real-time feedback on what's completed, what needs attention, and what comes next.

---

## **PHASE 1: Order Placement (Pre-Payment)**

### Purpose
Guide teams through all required steps to place an order and complete payment.

### The Four Steps

| Step | Label | Completion Criteria | Data Source |
|------|-------|-------------------|-------------|
| **1** | **Diseño** | At least one design request exists with mockup images | `design_requests` table<br/>- Checks: `mockup_urls.length > 0` |
| **2** | **Jugadores** | Players exist AND all have confirmed their info | `player_info_submissions` table<br/>- Checks: `confirmed_by_player === true` for ALL players |
| **3** | **Dirección** | Shipping address has been set | `shipping_addresses` table<br/>- Checks: `count > 0` for team_id |
| **4** | **Pago** | All orders for the team are paid | `orders` table<br/>- Checks: `payment_status === 'paid'` for ALL orders |

### Completion Calculation
```javascript
completedSteps / 4 × 100 = percentage

Example:
- Design created ✓ (1/4)
- Players added ✓ (2/4)
- Address not set ✗ (2/4)
- Payment not done ✗ (2/4)
= 50% complete
```

### Manager Actions
When a step is **incomplete** and user is a **manager**, an action button appears:
- **Diseño**: "Crear" → Navigate to design request creation
- **Jugadores**: "Agregar" → Share design link or go to players page
- **Dirección**: "Configurar" → Navigate to settings page
- **Pago**: "Gestionar" → Navigate to payments page

### Key Logic Point
**Step 2 (Players)** has strict validation:
```typescript
const hasPlayers = allPlayers && allPlayers.length > 0;
const allPlayersConfirmed = hasPlayers &&
  allPlayers.every(p => p.confirmed_by_player === true);

const playersAdded = hasPlayers && allPlayersConfirmed;
```

This means if even ONE player hasn't confirmed their information, the step remains incomplete.

---

## **PHASE 2: Production Progress (Post-Payment)**

### Purpose
Show real-time production status as Deserve manufactures and ships the order.

### Visibility Trigger
**Only appears when Phase 1 is 100% complete** (payment_status === 'paid' for all orders)

### The Nine Manufacturing Stages

| Step | Label | Stage Value | Description |
|------|-------|-------------|-------------|
| **1** | Impresión | `printing` | Design printing on fabric |
| **2** | Corte | `cutting` | Fabric cutting |
| **3** | Costura | `sewing` | Sewing pieces together |
| **4** | Detección | `metal_detection` | Metal detector safety check |
| **5** | Planchado | `ironing` | Ironing/pressing |
| **6** | Calidad | `quality_control` | Quality inspection |
| **7** | Empaque | `packaging` | Packaging for shipment |
| **8** | Envío | `shipping` | In transit to customer |
| **9** | Entregado | `delivered` | Received by customer |

### Data Sources
```javascript
// Queries the most recent order for the team
const { data: orders } = await supabase
  .from('orders')
  .select('payment_status, status, current_stage')
  .eq('team_id', teamId);

// Uses two fields to determine progress:
// 1. current_stage (e.g., 'sewing', 'packaging')
// 2. status (e.g., 'shipped', 'delivered')
```

### Completion Calculation
```javascript
stages = [
  'printing', 'cutting', 'sewing', 'metal_detection',
  'ironing', 'quality_control', 'packaging',
  'shipping', 'delivered'
];

currentIndex = stages.indexOf(currentStage);
percentage = ((currentIndex + 1) / 9) × 100

Example:
- Current stage: 'sewing' (index 2)
- Percentage: (3 / 9) × 100 = 33%
```

### Status Priority Logic
The system checks `status` field first for final states:
1. If `status === 'delivered'` → Stage 9 complete (100%)
2. If `status === 'shipped'` → Stage 8 active (89%)
3. Otherwise → Use `current_stage` value to determine position

---

## **Visual Design & User Experience**

### Step Card States

**Complete** (Green)
- Background: `from-green-900/30 via-green-800/20`
- Border: `border-green-500/50`
- Icon: White checkmark ✓
- Text: `text-green-400`

**Active** (Gray with blue action button)
- Background: `from-gray-800/50 via-black/40`
- Border: `border-gray-700`
- Icon: Step number (1-9)
- Text: `text-gray-400`
- **Action Button**: Blue gradient button below card

**Locked/Incomplete** (Dimmed Gray)
- Background: Same as Active but with `opacity-60`
- Border: `border-gray-700`
- Icon: Step number (grayed out)
- Text: `text-gray-500`

### Progress Bar Colors
- **Phase 1**: Blue (`bg-blue-600`)
- **Phase 2**: Purple (`bg-purple-600`)

---

## **Business Logic & Requirements**

### Sequential Dependencies
Though not strictly enforced in the UI (all steps show action buttons when manager), the **business logic requires**:

1. **Design must exist** before players can be added meaningfully
2. **Players must be confirmed** before payment is accurate (quantity affects price)
3. **Address must be set** before shipping can occur
4. **Payment must complete** before production begins

### Player Confirmation Requirement
This is the **strictest validation** in Phase 1:

```typescript
// ❌ FAILS if ANY player unconfirmed
playersAdded = allPlayers.every(p => p.confirmed_by_player === true)

// Example scenarios:
// - 10 players, 9 confirmed → Step INCOMPLETE
// - 10 players, 10 confirmed → Step COMPLETE ✓
```

**Why this matters**:
- Ensures accurate order quantities
- Prevents incomplete player data from reaching production
- Forces team coordination before payment

---

## **Real-Time Updates**

### Refresh Mechanism
The tracker loads data on component mount and when `teamId` changes:

```typescript
useEffect(() => {
  loadProgress(); // Runs on mount and teamId change
}, [teamId]);
```

**Current Limitation**: Does not auto-refresh when data changes. Users must manually refresh the page to see updates.

### Potential Enhancement
Could add:
- Supabase real-time subscriptions to `orders`, `design_requests`, `player_info_submissions` tables
- WebSocket connection for live production stage updates
- Polling every 30 seconds when production is active

---

## **Database Schema Dependencies**

### Tables Referenced

1. **`design_requests`**
   - Fields: `mockup_urls`, `status`, `team_id`
   - Purpose: Track design creation completion

2. **`player_info_submissions`**
   - Fields: `confirmed_by_player`, `team_id`
   - Purpose: Track player data collection

3. **`shipping_addresses`**
   - Fields: `team_id`
   - Purpose: Verify address configuration

4. **`orders`**
   - Fields: `payment_status`, `status`, `current_stage`, `team_id`
   - Purpose: Track payment and production progress

---

## **Edge Cases & Error Handling**

### Empty States

| Scenario | Behavior |
|----------|----------|
| No design requests | Step 1 incomplete, shows "Crear" button for managers |
| No players | Step 2 incomplete, shows "Agregar" button for managers |
| No shipping address | Step 3 incomplete, shows "Configurar" button |
| Database query fails | Silent failure with `console.log`, shows step as incomplete |

### Multiple Orders
- **Payment check**: ALL orders must be paid for Phase 1 to complete
- **Production display**: Shows status of the **first order** (most recent)
  - **Potential Bug**: If there are multiple orders, only first order's production status is shown

### Loading State
Shows animated skeleton UI while queries execute:
- Gray pulsing rectangles
- Matches final layout structure
- No user interaction possible during load

---

## **Key Metrics & Purpose**

### For Team Managers
**Visibility into**:
- What's blocking order completion
- Which players haven't confirmed info
- Clear next actions via buttons
- Production transparency post-payment

### For Team Members
**Understanding of**:
- Team's overall progress
- When their action is needed (player confirmation)
- Expected timeline (seeing production stages)
- Delivery status in real-time

### For Business
**Data insights**:
- Where teams get stuck (common incomplete steps)
- Average time between phases
- Drop-off rates at payment step
- Production bottlenecks (which stage takes longest)

---

## **Summary**

The Two-Phase Progress Tracker is a **customer-facing project management tool** that:

1. **Guides** teams through 4 pre-payment steps with actionable CTAs
2. **Validates** all requirements are met before production
3. **Visualizes** 9 manufacturing stages post-payment
4. **Reduces** support inquiries by proactively showing status
5. **Builds** trust through transparency

**Critical Success Factor**: Step 2 (Players) ensures data quality by requiring 100% confirmation rate before allowing payment completion.
