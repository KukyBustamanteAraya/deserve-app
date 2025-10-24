# Mercado Pago Production Setup - Deserve Chile

## Application Details
- **Integration Type:** Marketplace
- **Payment Type:** Pagos online
- **Product:** Checkout Pro
- **Country:** Chile (CLP)

## Required Environment Variables

Add these to Vercel (Settings → Environment Variables):

```bash
MP_ACCESS_TOKEN=APP_USR-7197451174328366-100809-eeb77bfe66d3d64124ac6d62204b191d-1692389554
MP_PUBLIC_KEY=APP_USR-14b75d04-6ee5-41fa-878e-583fbfc5d65a
MP_WEBHOOK_SECRET=deserve-webhook-secret-2024
NEXT_PUBLIC_SITE_URL=https://deserve-app.vercel.app
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Webhook Configuration

**Webhook URL:** `https://deserve-app.vercel.app/api/mercadopago/webhook`

Configure this in your Mercado Pago dashboard:
1. Go to https://www.mercadopago.cl/developers/panel/webhooks
2. Add new webhook with the URL above
3. Select events: `payment`
4. Copy the webhook secret and set as `MP_WEBHOOK_SECRET`

## Payment Flow

1. User creates design request → Order created in database
2. User clicks "Pagar" → API creates Mercado Pago preference
3. User redirected to Checkout Pro
4. After payment → Webhook notifies our app
5. Order status updated to "paid"

## API Routes

- **Create Payment:** `/api/mercadopago/create-payment`
- **Webhook Handler:** `/api/mercadopago/webhook`
- **Success Page:** `/payment/success`
- **Failure Page:** `/payment/failure`
- **Pending Page:** `/payment/pending`

## Currency & Amounts

- All amounts stored in cents (e.g., 50000 = CLP $500)
- Currency: CLP (Chilean Peso)
- Mercado Pago SDK automatically handles conversion

## Testing

Test the flow:
1. Create new design request
2. Click payment button
3. Should redirect to Mercado Pago Checkout Pro
4. Complete payment
5. Verify webhook receives notification
6. Check order status updated in database

## Production Checklist

- [x] Production credentials configured in Vercel
- [x] Webhook URL pointing to production
- [x] Currency set to CLP
- [x] SDK using new MercadoPagoConfig API
- [x] Service role key for database access
- [ ] Test end-to-end payment flow
- [ ] Verify webhook signature validation
- [ ] Test success/failure/pending redirects
