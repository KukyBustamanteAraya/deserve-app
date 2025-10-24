"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Server action to initiate Google OAuth sign-in flow
 *
 * This action:
 * 1. Creates a Supabase client
 * 2. Gets the origin from request headers
 * 3. Initiates OAuth flow with Google
 * 4. Redirects to Google's consent screen
 * 5. User will be redirected back to /auth/callback after Google authentication
 *
 * The callback route will handle:
 * - Session exchange
 * - Profile creation for new users
 * - Redirect to dashboard or profile setup
 */
export async function signInWithGoogleAction() {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("referer")?.split("?")[0] || "";

    logger.info("[GoogleAuth] Initiating Google OAuth flow", { origin });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      logger.error("[GoogleAuth] OAuth initiation error", error);
      throw error;
    }

    if (data.url) {
      logger.info("[GoogleAuth] Redirecting to Google consent screen");
      redirect(data.url);
    }
  } catch (error: any) {
    logger.error("[GoogleAuth] Unexpected error:", error);
    throw error;
  }
}
