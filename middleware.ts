// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Keep session fresh for every request (docs pattern)
  await supabase.auth.getUser();

  return res;
}

/**
 * Exclude static assets and public auth endpoints.
 * Protect app routes like /dashboard (server-side guard still recommended).
 */
export const config = {
  matcher: [
    // Refresh session broadly, but skip the obvious static stuff:
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|assets/).*)',
    // NOTE: We do not block /auth/* — it's needed for confirm links
  ],
};