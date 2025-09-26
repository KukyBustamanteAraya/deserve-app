import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from '@/lib/security/rateLimit';
import { assertSameSiteOrAllowed } from '@/lib/security/origin';

export async function POST(request: NextRequest) {
  const check = assertSameSiteOrAllowed(request);
  if (!check.ok) return check.response;

  const { ok, resetInMs } = rateLimit(request, 'logout');
  if (!ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(resetInMs / 1000)) },
    });
  }

  const supabase = createSupabaseServerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect("http://localhost:3001/login");
}
