# Phase 4 Implementation: Order Flow & Payments

## 🎯 Overview

Phase 4 completes the end-to-end customer journey by implementing:
1. **Order Creation Flow** - Catalog → Configuration → Checkout
2. **Mercado Pago Integration** - Split & bulk payment processing
3. **Pricing Engine** - Dynamic pricing with tiers, bundles, and discounts
4. **Notification System** - Email notifications for key events

---

## 📋 Prerequisites (Already Complete)

✅ Phase 1: Consumer dashboard, order tracking, design approval
✅ Phase 2: Team hub dashboard with roles and permissions
✅ Phase 3: Taxonomy (sports/bundles), roster upload, design requests

---

## 🚀 Phase 4 Deliverables

### 1. Database Migrations

#### `016_order_flow_enhancements.sql`
**Tables:**
- `order_items` - Individual items in an order (product_id, quantity, size, number, player_name, price_cents)
- `mercadopago_preferences` - MP preference tracking (preference_id, order_id, user_id, amount, status, mp_url)
- `mercadopago_payments` - Payment records (payment_id, preference_id, mp_status, paid_at, amount)
- `pricing_overrides` - Manual price adjustments (order_id, reason, discount_cents, applied_by)

**Functions:**
- `calculate_order_total(order_id)` - Calculate total with discounts
- `calculate_bundle_discount(items)` - Apply bundle savings
- `get_pricing_tier(product_id, quantity)` - Get tier price

**Views:**
- `orders_with_payment_status` - Orders joined with MP payment status

#### `017_notification_enhancements.sql`
**Enhancements to `notifications_log`:**
- Add `template_id` column
- Add `sent_at` timestamp
- Add `error_message` for failed sends
- Add indexes for performance

---

### 2. API Routes

#### Order Management
**`POST /api/orders/create`**
```typescript
// Body: { teamId, designRequestId, items: [...], shippingAddressId }
// Returns: { orderId, totalCents, requiresPayment }
```

**`GET /api/orders/[orderId]`**
```typescript
// Returns: Order with items, payment status, shipping info
```

**`PATCH /api/orders/[orderId]/items`**
```typescript
// Body: { items: [...] }
// Updates order items (before payment)
```

#### Pricing
**`POST /api/pricing/calculate`**
```typescript
// Body: { items: [{ productId, quantity, fabricId }] }
// Returns: { itemPrices, subtotal, bundleDiscount, total }
```

**`GET /api/pricing/tiers?productId=X`**
```typescript
// Returns: Pricing tiers for a product
```

#### Mercado Pago
**`POST /api/mercadopago/create-split-payment`**
```typescript
// Body: { orderId, userId, amount, description }
// Returns: { preferenceId, initPoint }
// Creates individual MP preference for a team member
```

**`POST /api/mercadopago/create-bulk-payment`**
```typescript
// Body: { orderId, amount, description }
// Returns: { preferenceId, initPoint }
// Creates single MP preference for manager to pay full order
```

**`POST /api/mercadopago/webhook`**
```typescript
// Handles MP IPN notifications
// Validates signature
// Updates payment status
// Triggers notifications
```

**`GET /api/mercadopago/payment-status?orderId=X`**
```typescript
// Returns: { status, paid, pending, failed, amounts }
```

#### Notifications
**`POST /api/notifications/send`**
```typescript
// Body: { event, userId, metadata }
// Triggers notification based on event type
```

---

### 3. UI Pages

#### Product Catalog
**`/dashboard/teams/[teamId]/catalog`**
- Display products grouped by bundle (B1-B6)
- Fabric selector for each product
- Quantity input
- Price preview with tier discounts
- "Add to Order" button
- Cart summary sidebar

#### Order Configuration
**`/dashboard/teams/[teamId]/order/new`**
- Step 1: Select bundle or products
- Step 2: Configure items (sizes, numbers, player names)
- Step 3: Review roster assignments
- Step 4: Price summary with discounts
- "Proceed to Checkout" button

#### Checkout
**`/dashboard/teams/[teamId]/checkout`**
- Payment method selection (split vs bulk)
- Shipping address selection/creation
- Order summary with breakdown
- Terms & conditions
- "Confirm Order" button
- Split payment: Generate individual MP links
- Bulk payment: Single MP checkout button

#### Payment Status
**`/dashboard/teams/[teamId]/orders/[orderId]/payment`**
- Payment progress tracker
- List of team members with payment status
- Individual payment links
- Resend payment link functionality
- Bulk payment option for manager

---

### 4. Components

#### `ProductCard.tsx`
- Product image, name, description
- Fabric selector dropdown
- Quantity input
- Price display with tier indicator
- "Add to cart" button

#### `BundleCard.tsx`
- Bundle info (B1-B6)
- List of included products
- Total savings display
- "Select Bundle" button

#### `OrderItemConfigurator.tsx`
- Table view of order items
- Editable fields: size, number, player name
- Auto-populate from roster
- Validation (unique numbers, valid sizes)

#### `PricingBreakdown.tsx`
- Line items with individual prices
- Subtotal
- Bundle discount (if applicable)
- Quantity discount
- Tax (if applicable)
- Total

#### `PaymentMethodSelector.tsx`
- Split payment option with description
- Bulk payment option
- Visual comparison

#### `SplitPaymentTracker.tsx`
- Progress bar
- List of team members
- Payment status indicators
- Individual payment links
- Send reminder button

---

### 5. Mercado Pago Integration

#### Setup
```bash
npm install mercadopago
```

#### Environment Variables
```env
MERCADOPAGO_ACCESS_TOKEN=your_access_token
MERCADOPAGO_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=your_public_key
```

#### Implementation Details

**Split Payment Flow:**
1. Manager creates order
2. System generates one MP preference per team member
3. Each member receives payment link (email/WhatsApp)
4. Members pay individually ($10,000-50,000 CLP each)
5. Webhook updates payment_contributions table
6. When all paid → order status changes to 'paid'

**Bulk Payment Flow:**
1. Manager creates order
2. System generates single MP preference for full amount
3. Manager pays entire order ($500,000-2,000,000 CLP)
4. Webhook updates order status to 'paid'
5. Notification sent to all team members

**Webhook Security:**
- Validate MP signature using x-signature header
- Verify x-request-id to prevent replay attacks
- Log all webhook calls for debugging

**Redirect URLs:**
- Success: `/orders/[orderId]/payment/success`
- Failure: `/orders/[orderId]/payment/failure`
- Pending: `/orders/[orderId]/payment/pending`

---

### 6. Pricing Logic

#### Tier Pricing
```typescript
// Example: Jersey pricing
1-10 units: $45,000 CLP each
11-25 units: $40,000 CLP each
26-50 units: $35,000 CLP each
51+ units: $32,000 CLP each
```

#### Bundle Discounts
```typescript
B1 (Jersey + Shorts): Save $5,000 CLP per set
B2 (Full Kit): Save $10,000 CLP per set
B3-B6: Variable savings
```

#### Fabric Modifiers
```typescript
Deserve (standard): +$0
Premium: +$3,000 per item
Elite: +$5,000 per item
```

#### Calculation Order
1. Get base price from pricing_tiers based on quantity
2. Add fabric modifier
3. Calculate bundle discount (if applicable)
4. Apply manual overrides (if any)
5. Calculate tax (if applicable)
6. Return final total

---

### 7. Notification System

#### Events
- `order.created` → Notify manager
- `order.payment_pending` → Send payment links to team
- `payment.received` → Notify manager of progress
- `order.fully_paid` → Notify team & admin
- `design.ready` → Notify team for approval
- `order.in_production` → Notify team
- `order.shipped` → Notify team with tracking

#### Email Templates
**Payment Request:**
```
Subject: Tu parte del pedido está lista - Deserve
Body:
¡Hola [NAME]!

Tu equipo "[TEAM_NAME]" tiene un pedido listo para ti.
Tu monto: $[AMOUNT] CLP

[PAGAR AHORA - BOTÓN]

Detalles del pedido:
- Jersey personalizado: $XX,XXX
- Shorts: $XX,XXX
...

¿Preguntas? Responde a este email.
```

**Order Confirmation:**
```
Subject: ¡Pedido confirmado! - [TEAM_NAME]
Body:
¡Excelente [NAME]!

Tu pedido #[ORDER_ID] está confirmado.
Total pagado: $[AMOUNT] CLP

Próximos pasos:
1. Enviaremos diseños para tu aprobación (3-5 días)
2. Producción comienza una vez aprobado (2-3 semanas)
3. Envío a tu dirección (1 semana)

Ver estado del pedido: [LINK]
```

---

### 8. Testing Checklist

#### Order Creation
- [ ] Can create order with bundle
- [ ] Can create order with individual items
- [ ] Roster players auto-populate in order
- [ ] Can edit sizes/numbers before checkout
- [ ] Price updates when quantity changes
- [ ] Bundle discount applies correctly

#### Split Payment
- [ ] MP preferences created for each team member
- [ ] Payment links are unique per member
- [ ] Webhook updates payment status correctly
- [ ] Progress tracker updates in real-time
- [ ] Order status changes when fully paid

#### Bulk Payment
- [ ] Single MP preference created
- [ ] Manager can pay full amount
- [ ] Webhook processes bulk payment
- [ ] Order status updates immediately

#### Pricing
- [ ] Tier pricing applies correctly
- [ ] Fabric modifiers add to price
- [ ] Bundle discounts calculate properly
- [ ] Manual overrides work

#### Notifications
- [ ] Email sent when payment link generated
- [ ] Email sent when payment received
- [ ] Email sent when order fully paid
- [ ] Email templates render correctly

---

## 🔧 Implementation Order

### Week 1: Database & Pricing
1. Create migration 016_order_flow_enhancements.sql
2. Implement pricing calculation functions
3. Build pricing API routes
4. Test pricing logic

### Week 2: Order Flow UI
1. Build product catalog page
2. Build order configuration page
3. Build checkout page
4. Test order creation flow

### Week 3: Mercado Pago
1. Set up MP SDK and credentials
2. Implement split payment API
3. Implement bulk payment API
4. Build webhook handler
5. Test payment flows (sandbox)

### Week 4: Notifications & Polish
1. Set up email service (Resend)
2. Create email templates
3. Implement notification API
4. Build payment status tracker component
5. End-to-end testing

---

## 🎯 Success Criteria

✅ User can browse product catalog
✅ User can create order with selected products
✅ Pricing calculates correctly with tiers and bundles
✅ Split payment generates individual MP links
✅ Bulk payment allows manager to pay full order
✅ Webhook processes payments and updates status
✅ Notifications sent at key events
✅ Payment progress visible in real-time
✅ Order status updates automatically

---

## 📊 Metrics to Track

- **Conversion Rate:** Design request → Order created
- **Payment Completion:** Split vs bulk payment success rate
- **Time to Payment:** How long until order fully paid
- **Cart Abandonment:** Orders created but not checked out
- **Average Order Value:** Revenue per order
- **Bundle Adoption:** % of orders using bundles

---

## 🚀 Ready to Build!

This phase completes the MVP and enables:
- ✅ Full order creation and configuration
- ✅ Payment processing with split and bulk options
- ✅ Real-time payment tracking
- ✅ Automated notifications
- ✅ Complete order lifecycle from design → payment → production

**Estimated Development Time:** 3-4 weeks
**Priority:** HIGH - Blocks revenue generation
**Dependencies:** Phase 1, 2, 3 complete ✅

Let's build! 🎉
