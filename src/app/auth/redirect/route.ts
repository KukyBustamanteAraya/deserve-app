import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/dashboard';

  const { supabase, response: carrier } = createSupabaseRouteClient(req);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  // Cookies are present -> safe to redirect to app page
  const redirect = NextResponse.redirect(new URL(next, url.origin), 302);
  // Preserve any mutated cookies from carrier
  for (const [k, v] of carrier.headers) redirect.headers.set(k, v);
  return redirect;
}
