# Mercado Pago Integration - Deserve App

## Overview

This document describes the Mercado Pago Checkout Pro integration for the Deserve app. The integration supports two payment flows:

1. **Split-Pay for Players**: Individual team members pay their share of a team uniform order
2. **Bulk Payment for Managers**: Team managers pay for one or multiple complete team orders at once

All payments are processed in Chilean Pesos (CLP) through Mercado Pago's secure checkout page.

## Architecture

### Database Schema

Three new tables have been added in migration `027_payment_contributions.sql`:

#### `payment_contributions`
Tracks individual player contributions (split payments):
- `id`: UUID primary key
- `order_id`: Reference to the order
- `user_id`: The player making the payment
- `team_id`: Reference to the team
- `amount_cents`: Payment amount in CLP cents
- `status`: 'pending', 'approved', 'rejected', 'cancelled', 'refunded'
- `mp_payment_id`: Mercado Pago payment ID (once completed)
- `mp_preference_id`: Mercado Pago preference ID
- `external_reference`: Unique reference for this payment
- `paid_at`: Timestamp when approved
- `raw_payment_data`: Full MP payment object (JSONB)

#### `bulk_payments`
Tracks manager bulk payments covering multiple orders:
- `id`: UUID primary key
- `user_id`: The manager making the payment
- `total_amount_cents`: Total amount in CLP cents
- `status`: 'pending', 'approved', 'rejected', 'cancelled', 'refunded'
- `mp_payment_id`: Mercado Pago payment ID
- `mp_preference_id`: Mercado Pago preference ID
- `external_reference`: Unique reference
- `paid_at`: Timestamp when approved
- `raw_payment_data`: Full MP payment object (JSONB)

#### `bulk_payment_orders`
Links bulk payments to the orders they cover:
- `bulk_payment_id`: Reference to bulk_payments
- `order_id`: Reference to orders

### API Routes

#### POST `/api/mercadopago/create-split-payment`
Creates a payment preference for a player's contribution.

**Request Body:**
```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "amountCents": 50000
}
```

**Response:**
```json
{
  "success": true,
  "contributionId": "uuid",
  "preferenceId": "mp-preference-id",
  "initPoint": "https://www.mercadopago.cl/checkout/...",
  "sandboxInitPoint": "https://sandbox.mercadopago.cl/checkout/..."
}
```

#### POST `/api/mercadopago/create-bulk-payment`
Creates a payment preference for a manager to pay multiple orders.

**Request Body:**
```json
{
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "bulkPaymentId": "uuid",
  "preferenceId": "mp-preference-id",
  "initPoint": "https://www.mercadopago.cl/checkout/...",
  "sandboxInitPoint": "https://sandbox.mercadopago.cl/checkout/...",
  "totalAmountCents": 250000,
  "orderCount": 3
}
```

#### POST `/api/mercadopago/webhook`
Receives payment notifications from Mercado Pago.

**Headers:**
- `x-signature`: HMAC signature for verification
- `x-request-id`: Request ID from Mercado Pago

**Body:**
```json
{
  "type": "payment",
  "action": "payment.updated",
  "data": {
    "id": 123456789
  }
}
```

### Payment Redirect Pages

- `/payment/success` - Shown when payment is approved
- `/payment/failure` - Shown when payment fails
- `/payment/pending` - Shown when payment is pending (e.g., bank transfer)

### UI Components

#### `<SplitPayButton />`
Button for individual player payments.

**Props:**
- `orderId: string` - Order UUID
- `userId: string` - User UUID
- `amountCents: number` - Amount to pay in CLP cents
- `disabled?: boolean` - Disable button
- `onPaymentInitiated?: () => void` - Callback when payment starts

**Example:**
```tsx
<SplitPayButton
  orderId="order-uuid"
  userId="user-uuid"
  amountCents={50000}
  onPaymentInitiated={() => console.log('Payment started')}
/>
```

#### `<BulkPayButton />`
Button for manager bulk payments.

**Props:**
- `orderIds: string[]` - Array of order UUIDs
- `userId: string` - Manager's user UUID
- `totalAmountCents: number` - Total amount in CLP cents
- `disabled?: boolean` - Disable button
- `onPaymentInitiated?: () => void` - Callback when payment starts

**Example:**
```tsx
<BulkPayButton
  orderIds={["order1-uuid", "order2-uuid"]}
  userId="manager-uuid"
  totalAmountCents={250000}
  onPaymentInitiated={() => console.log('Bulk payment started')}
/>
```

## Payment Flow

### Split Payment (Player)

1. **Initiate Payment**: Player clicks "Pay my share" button
2. **Create Preference**: Frontend calls `/api/mercadopago/create-split-payment`
3. **Database Record**: API creates `payment_contribution` with status 'pending'
4. **Redirect**: User is redirected to Mercado Pago checkout (`init_point`)
5. **Payment**: User completes payment on Mercado Pago
6. **Return**: User is redirected back to `/payment/success` (or `/payment/failure`)
7. **Webhook**: Mercado Pago sends notification to `/api/mercadopago/webhook`
8. **Update DB**: Webhook handler updates `payment_contribution` status to 'approved'
9. **Check Order**: System checks if order is fully paid by all contributors
10. **Mark Complete**: If fully paid, order status is updated to 'paid'

### Bulk Payment (Manager)

1. **Select Orders**: Manager selects multiple unpaid orders
2. **Create Preference**: Frontend calls `/api/mercadopago/create-bulk-payment`
3. **Database Records**: API creates `bulk_payment` and links to orders via `bulk_payment_orders`
4. **Redirect**: User is redirected to Mercado Pago checkout
5. **Payment**: Manager completes payment for all orders at once
6. **Return**: User is redirected back to `/payment/success`
7. **Webhook**: Mercado Pago sends notification to `/api/mercadopago/webhook`
8. **Update DB**: Webhook handler:
   - Updates `bulk_payment` status to 'approved'
   - Marks all linked orders as 'paid'
9. **Team Rosters**: All team members in the paid orders are marked as paid

## Security

### Webhook Signature Validation

All webhooks are validated using HMAC-SHA256 signature:

```typescript
// Message format: id:<payment_id>;request-id:<request_id>;ts:<timestamp>;
const signature = createHmac('sha256', MP_WEBHOOK_SECRET)
  .update(message)
  .digest('hex');
```

The signature is sent in the `x-signature` header as: `ts=<timestamp>,v1=<signature>`

### Environment Variables

Required environment variables:

```env
MP_ACCESS_TOKEN=APP_USR-...
MP_PUBLIC_KEY=APP_USR-...
MP_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_SITE_URL=https://yourapp.com
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Row Level Security

- `payment_contributions`: Users can only see/create their own contributions
- `bulk_payments`: Users can only see/create their own bulk payments
- `bulk_payment_orders`: Readable if user owns the bulk payment
- Webhook handler uses service role key to bypass RLS for updates

## Testing

### Apply Database Migration

1. Go to Supabase Dashboard > SQL Editor
2. Run the migration: `supabase/migrations/027_payment_contributions.sql`
3. Verify tables were created successfully

### Testing with Mercado Pago Sandbox

1. **Get Test Credentials**
   - Log into Mercado Pago dashboard
   - Go to Developers > Test credentials
   - Copy test access token and public key
   - Update `.env.local` with test credentials

2. **Use Test Cards**
   - Approved: `5031 7557 3453 0604` (MASTERCARD) - CVV: 123
   - Rejected: `5031 4332 1540 6351` (MASTERCARD) - CVV: 123
   - Any future expiry date and any name

3. **Test Webhook Locally**
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Update `.env.local`: `NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io`
   - Configure webhook URL in Mercado Pago: `https://abc123.ngrok.io/api/mercadopago/webhook`

4. **Test Split Payment**
   ```tsx
   // In your team page or order page
   import { SplitPayButton } from '@/components/payment/SplitPayButton';

   <SplitPayButton
     orderId="your-order-uuid"
     userId="your-user-uuid"
     amountCents={50000}  // CLP $500
   />
   ```

5. **Test Bulk Payment**
   ```tsx
   // In admin or manager dashboard
   import { BulkPayButton } from '@/components/payment/BulkPayButton';

   <BulkPayButton
     orderIds={["order1-uuid", "order2-uuid"]}
     userId="manager-uuid"
     totalAmountCents={250000}  // CLP $2,500
   />
   ```

### Webhook Testing Checklist

- [ ] Test payment approved notification
- [ ] Test payment rejected notification
- [ ] Test payment pending notification
- [ ] Verify signature validation works
- [ ] Verify payment records are updated correctly
- [ ] Verify orders are marked as paid when fully funded
- [ ] Test idempotency (webhook sent multiple times)

### Production Checklist

- [ ] Switch to production credentials
- [ ] Update `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Configure webhook URL in Mercado Pago production app
- [ ] Test with small real payment
- [ ] Set up monitoring/logging for payments
- [ ] Document refund process if needed
- [ ] Add email notifications for payment confirmations

## Troubleshooting

### Payment not updating after webhook

- Check webhook logs in Mercado Pago dashboard
- Verify `x-signature` validation is passing
- Check Supabase logs for errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Redirect not working

- Verify `NEXT_PUBLIC_SITE_URL` is correct
- Check that `/payment/*` pages exist
- Ensure no middleware is blocking the routes

### Order not marking as paid

- Check if all contributions sum to order total
- Verify `is_order_fully_paid_by_contributions()` function
- Check for pending contributions that should be approved

## Support

For Mercado Pago API issues, refer to:
- [Mercado Pago Developer Docs](https://www.mercadopago.com.co/developers)
- [Checkout Pro Integration Guide](https://www.mercadopago.com.co/developers/en/docs/checkout-pro/landing)
- [Webhooks Documentation](https://www.mercadopago.com.co/developers/en/docs/your-integrations/notifications/webhooks)
