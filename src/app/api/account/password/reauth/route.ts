import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
// import { rateLimit } from "@/lib/security/rateLimit";
// import { assertSameSiteOrAllowed } from "@/lib/security/origin";

export async function POST(req: NextRequest) {
  // await assertSameSiteOrAllowed(req);
  // await rateLimit({ key: "pwd:reauth", limit: 3, windowMs: 60 * 60_000 });

  const { supabase, response } = createSupabaseRouteClient(req);

  // Get the current user using the existing session/cookies
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: response.headers }
    );
  }

  // Sends the OTP to email/phone if "Secure password change" is enabled.
  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400, headers: response.headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers: response.headers });
}