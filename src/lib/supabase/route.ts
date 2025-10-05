// Route handler Supabase client - for API routes and callbacks
// CRITICAL: Must use the response object returned by this function to persist cookies
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}

// Carrier response pattern for API routes that need to preserve auth cookies
export function createSupabaseRouteClient(req: NextRequest) {
  // Create a carrier response that Supabase can mutate with Set-Cookie headers
  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          res.cookies.set(name, value, { ...options });
        },
        remove(name: string, options?: any) {
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  return { supabase, response: res };
}

// Helper to return JSON while preserving cookies from the carrier response
export function jsonWithCarriedCookies(
  carrier: NextResponse,
  body: unknown,
  init?: ResponseInit
) {
  const headers = new Headers(carrier.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new NextResponse(JSON.stringify(body), {
    ...init,
    headers,
  });
}