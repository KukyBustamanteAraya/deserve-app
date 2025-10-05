This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Development

For reliable local development, follow these steps:

1. **Use the correct Node.js version:**
   ```bash
   nvm use
   ```

2. **Clean and reinstall dependencies (if experiencing issues):**
   ```bash
   npm run clean
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The clean script will remove `.next`, `node_modules`, and `package-lock.json`, then reinstall all dependencies. This helps resolve common dependency conflicts and build cache issues.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for migrations and seed scripts)
- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., `http://localhost:3000` for dev, `https://yourapp.vercel.app` for production)

Find the Supabase values in your Supabase dashboard: **Project Settings → API**.

**⚠️ Important:** The `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side (seed scripts, migrations). Never expose it in client code.

## Supabase Auth Configuration

Configure your Supabase authentication settings in the Supabase dashboard:

### 1. URL Configuration
Navigate to **Authentication → URL Configuration** and set:

- **Site URL**: `http://localhost:3000` (for development)
- **Redirect URLs**: Add the following URLs:
  - `http://localhost:3000/auth/callback` (development)
  - `http://localhost:3001/auth/callback` (if using port 3001)
  - `https://yourapp.vercel.app/auth/callback` (production - replace with your domain)

### 2. Email Templates (Optional)
Navigate to **Authentication → Email Templates** to customize:
- **Magic Link** template for sign-in emails
- **Confirm signup** template if using email confirmation

### 3. Magic Link Authentication Flow
The app uses magic link authentication:
1. User enters email on `/login`
2. Supabase sends magic link to email
3. User clicks link → redirected to `/auth/callback`
4. Callback exchanges code for session → redirects to `/dashboard`

## Apply DB Migration (Supabase)

To set up the database schema:

- Open Supabase → SQL Editor
- Paste the contents of `supabase/migrations/phase1_profiles.sql`
- Run it on staging first, then production

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Tests

This project uses [Vitest](https://vitest.dev/) for testing. Tests are split into two categories:

### Unit Tests

Unit tests run without requiring a live server and are executed in CI on every push/PR.

**Run unit tests:**
```bash
npm test
# or explicitly
npm run test:unit
```

**Watch mode:**
```bash
npm run test:watch
```

**Coverage:**
```bash
npm run test:cov
```

### Integration Tests

Integration tests require a live development server running on port 3000. These tests are tagged with `[integration]` in their describe blocks and are **not** run in CI.

**To run integration tests locally:**

1. Start the development server in one terminal:
   ```bash
   npm run dev
   ```

2. Run integration tests in another terminal:
   ```bash
   npm run test:int
   ```

**Note:** Integration tests will fail with `ECONNREFUSED` errors if the dev server is not running.

### Re-enabling Integration Tests in CI (Future)

To enable integration tests in CI, you'll need to:

1. Set up a test database or use Supabase staging
2. Start the Next.js dev server in the background during CI
3. Wait for server to be ready (e.g., wait-on port 3000)
4. Run `npm run test:int`
5. Tear down the server after tests complete

---

## API Endpoints

### Fabrics API

**GET /api/fabrics**

Returns all available fabrics with pricing modifiers.

```bash
curl http://localhost:3000/api/fabrics
```

**Response:**
```json
{
  "fabrics": [
    {
      "id": "uuid-here",
      "name": "Deserve",
      "composition": "100% polyester",
      "gsm": 150,
      "price_modifier_cents": 0,
      "description": "Standard lightweight fabric",
      "use_case": "All sports",
      "sort_order": 1
    },
    {
      "id": "uuid-here",
      "name": "Premium",
      "composition": "100% polyester",
      "gsm": 140,
      "price_modifier_cents": 3000,
      "description": "Softer, lighter pro feel",
      "use_case": "All sports",
      "sort_order": 2
    }
  ]
}
```

### Pricing Calculator

**GET /api/pricing/calculate**

Calculate dynamic pricing based on quantity and fabric selection.

**Query Parameters:**
- `product_id` (BIGINT, required) - Product ID
- `quantity` (number, required) - Quantity (1-10000)
- `fabric_id` (UUID, required) - Fabric ID

**Example:**
```bash
# Get a product ID (BIGINT)
PRODUCT_ID=1

# Get a fabric ID from /api/fabrics (UUID)
FABRIC_ID="uuid-from-fabrics-api"

curl "http://localhost:3000/api/pricing/calculate?product_id=${PRODUCT_ID}&quantity=25&fabric_id=${FABRIC_ID}"
```

**Response:**
```json
{
  "base_price_cents": 35000,
  "fabric_modifier_cents": 3000,
  "unit_price_cents": 38000,
  "total_price_cents": 950000,
  "savings_cents": 50000,
  "retail_price_cents": 40000,
  "tier": {
    "min_quantity": 16,
    "max_quantity": null,
    "price_per_unit_cents": 35000
  },
  "currency": "CLP"
}
```

### Design Candidates API

**GET /api/design-candidates**

List design candidates for a team.

**Query Parameters:**
- `team_id` (BIGINT, required) - Team ID

```bash
curl "http://localhost:3000/api/design-candidates?team_id=1"
```

**POST /api/design-candidates**

Create a new design candidate (team captain only).

```bash
curl -X POST http://localhost:3000/api/design-candidates \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "team_id": 1,
    "design_url": "https://storage.supabase.co/design.png"
  }'
```

**Response (201):**
```json
{
  "id": 1,
  "team_id": 1,
  "design_url": "https://storage.supabase.co/design.png",
  "uploaded_by": "uuid-here",
  "votes_yes": 0,
  "votes_no": 0,
  "is_winner": false,
  "created_at": "2025-10-04T..."
}
```

### Design Votes API

**GET /api/design-votes**

Get votes for a design candidate.

**Query Parameters:**
- `candidate_id` (BIGINT, required) - Design candidate ID

```bash
curl "http://localhost:3000/api/design-votes?candidate_id=1"
```

**Response:**
```json
{
  "votes": [
    {
      "id": 1,
      "candidate_id": 1,
      "user_id": "uuid",
      "vote": true,
      "created_at": "2025-10-04T..."
    }
  ],
  "summary": {
    "yes": 5,
    "no": 2,
    "total": 7
  }
}
```

**POST /api/design-votes**

Cast a vote on a design candidate (team members only, one vote per user).

```bash
curl -X POST http://localhost:3000/api/design-votes \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "candidate_id": 1,
    "vote": true
  }'
```

**Response (201):**
```json
{
  "id": 1,
  "candidate_id": 1,
  "user_id": "uuid",
  "vote": true,
  "created_at": "2025-10-04T..."
}
```

**Error (409) - Already Voted:**
```json
{
  "error": "You have already voted on this design"
}
```

---

## Database Seeding

### Pricing Data

Run the pricing seed script to populate products, bundles, and fabrics:

```bash
# Ensure environment variables are set
export NEXT_PUBLIC_SUPABASE_URL="https://tirhnanxmjsasvhfphbq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed script
node scripts/seed-pricing.ts
```

**Expected Output:**
```
🚀 Starting pricing seed...

📦 Creating single items...
✅ Created Socks (id)
✅ Created Shorts (id)
✅ Created Jersey (id)
✅ Created Pants (id)

🎁 Creating bundles...
✅ Created Jersey + Shorts (saves $5k)
✅ Created Full Kit (saves $5k)
...

✨ Pricing seed complete!
```

---

## Important Schema Notes

### ID Types Reference

| Table | ID Column | Type | Notes |
|-------|-----------|------|-------|
| **orders** | `id` | `UUID` | Primary key |
| **products** | `id` | `BIGINT` | Auto-increment |
| **teams** | `id` | `BIGINT` | Auto-increment |
| **profiles** | `id` | `UUID` | References auth.users(id) |
| **fabrics** | `id` | `UUID` | Primary key |

### Foreign Key Types

| Table | Foreign Key | Type | References |
|-------|-------------|------|------------|
| notifications_log | `order_id` | `UUID` | orders.id |
| manufacturer_order_assignments | `order_id` | `UUID` | orders.id |
| pricing_tiers | `product_id` | `BIGINT` | products.id |
| design_candidates | `team_id` | `BIGINT` | teams.id |
| design_votes | `user_id` | `UUID` | profiles.id |

**⚠️ Critical:** When working with order IDs in TypeScript/JavaScript, always use `string` type (UUID), never `number`.
