# Testing Guide for Deserve App

## Prerequisites

1. Ensure you have `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Make sure Supabase project is configured with:
   - Email authentication enabled
   - Site URL set to `http://localhost:3001` (or 3000)
   - Redirect URLs include `http://localhost:3001/auth/callback`

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to:
   - `http://localhost:3001` (if port 3001 is available)
   - `http://localhost:3000` (if port 3001 is not available)

## Testing Authentication Flow

### 1. Login Process
1. Visit the home page
2. Click "Go to Login" button
3. Enter a valid email address
4. Click "Send magic link"
5. Check your email for the magic link
6. Click the magic link in your email
7. You should be redirected to `/dashboard`

### 2. Dashboard Access
1. After successful login, you should see:
   - "Welcome, {your-email}" message
   - "Sign out" button in the top right
   - "Create Team" button
   - "(Teams list coming soon…)" placeholder

### 3. Logout Process
1. On the dashboard, click "Sign out"
2. You should be redirected back to `/login`
3. Try accessing `/dashboard` directly - you should be redirected to `/login`

### 4. Team Creation (Placeholder)
1. From the dashboard, click "Create Team"
2. You should see a form to create a new team
3. Enter a team name and click "Create Team"
4. You should see a success message (this is a placeholder - no DB yet)
5. Click "Back to Dashboard" to return

## Expected Behavior

- ✅ Magic link authentication works
- ✅ Protected routes redirect to login when not authenticated
- ✅ Dashboard shows user email and logout functionality
- ✅ Team creation form works (placeholder implementation)
- ✅ All navigation between pages works correctly

## Troubleshooting

- If magic link doesn't work, check your Supabase email settings
- If you get CORS errors, verify your Supabase site URL configuration
- If port 3001 is not available, the app will likely run on port 3000
- Check browser console for any JavaScript errors
