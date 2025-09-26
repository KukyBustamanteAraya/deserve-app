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
- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., `http://localhost:3000` for dev, `https://yourapp.vercel.app` for production)

Find the Supabase values in your Supabase dashboard: **Project Settings → API**.

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
