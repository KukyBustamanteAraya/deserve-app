# Mercado Pago Account Activation Required

## Issue
Error code: `CPT01-JPBBI4SIS7FM`
**All payment methods are being rejected** - both credit cards from different people in Chile.

## Root Cause
Your production Mercado Pago account (Application ID: 1692389554) needs to be **fully verified and activated** before it can accept real payments.

## What's Working
✅ API integration is correct
✅ Credentials are valid
✅ Preference creation succeeds
✅ Users can reach Mercado Pago checkout

## What's Blocked
❌ All real credit card payments are rejected
❌ CPT01 error appears at checkout

## Required Actions

### 1. Complete Business Verification
Go to https://www.mercadopago.cl/developers/panel/app/1692389554 and complete:

- **Business Information**
  - Legal business name (Deserve Chile or your registered business entity)
  - Tax ID (RUT)
  - Business address in Chile
  - Business phone number
  - Business type/category

- **Bank Account Information** (for receiving payments)
  - Chilean bank account details
  - Account holder verification

- **Identity Verification**
  - Upload business registration documents
  - Upload tax documents (Certificado de RUT)
  - Personal ID of business owner/legal representative

### 2. Request Production Approval
After completing all information:
1. Submit your application for review
2. Wait for Mercado Pago to verify your documents (typically 1-3 business days)
3. You'll receive email confirmation when approved

### 3. Verify Payment Methods
Once approved, ensure your application is configured for:
- **Credit cards** (Visa, Mastercard, American Express)
- **Debit cards**
- **Bank transfers** (optional)

### 4. Test After Approval
Once you receive approval email:
1. Try a real payment with a small amount (CLP $100)
2. Verify the payment appears in your Mercado Pago dashboard
3. Check that the webhook updates your database correctly

## Temporary Workaround
While waiting for approval, you can continue testing with **test credentials**:

```bash
# In Vercel environment variables:
MP_ACCESS_TOKEN=APP_USR-6304485383585576-100810-015378665a4f04ec6b32e62ae7333953-2911609666
MP_PUBLIC_KEY=APP_USR-47c649ad-cdb6-4cc3-a86b-54b37a4b85ed
```

Use Mercado Pago test cards: https://www.mercadopago.cl/developers/en/docs/checkout-pro/additional-content/test-cards

## Support Contact
If verification is taking too long, contact Mercado Pago support:
- Email: developers@mercadopago.com
- Support: https://www.mercadopago.cl/developers/panel/support
- Reference your Application ID: **1692389554**

## Expected Timeline
- Document submission: Immediate
- Verification review: 1-3 business days
- Account activation: Immediate after approval
- First payment test: Same day as activation

---

**Note:** This is a standard process for all new Mercado Pago production accounts. The CPT01 error is Mercado Pago's way of blocking payments until your business is verified for compliance and fraud prevention.
