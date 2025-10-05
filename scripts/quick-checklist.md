# 10-Minute Smoke QA Checklist

Run `npm run dev`, then manually test:

## Auth
- [ ] Magic link → redirects to /dashboard, session persists on refresh
- [ ] Logout → /login, cannot access /catalog, /cart, /orders

## Catalog
- [ ] /catalog loads sports tabs and products
- [ ] Switch sport → grid updates without full reload
- [ ] Product page shows images, price, SEO title

## Cart & Orders
- [ ] Add product → /cart shows item, totals update with quantity ±
- [ ] Checkout → redirects to /orders/[id] with price snapshot
- [ ] /orders lists the new order; detail matches snapshot

## Teams & Profile
- [ ] /dashboard/team: create team → invite code visible
- [ ] Join via code from a second account → members list updates
- [ ] /dashboard/account: update display name → persists after reload

## RLS Sanity
- [ ] Open incognito (logged out) → API calls return 401 (catalog/cart/orders/teams)

## Performance
- [ ] Dashboard loads without "clientModules" errors
- [ ] Magic link auth redirect works correctly (no Claude response content)
- [ ] Page transitions are smooth with optimized webpack config