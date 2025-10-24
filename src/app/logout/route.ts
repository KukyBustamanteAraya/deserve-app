import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBaseURL } from "@/lib/url";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") || "/login?logout=1";
  const next = rawNext.startsWith("/") ? rawNext : "/login?logout=1";

  const sb = await createSupabaseServerClient();
  // Best-effort sign-out; ignore error to avoid trapping the user
  await sb.auth.signOut();

  // Always redirect to same-origin relative URL
  return NextResponse.redirect(new URL(next, getBaseURL()));
}
