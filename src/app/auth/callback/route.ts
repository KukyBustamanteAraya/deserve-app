import { createRouteHandlerClient } from '@/lib/supabase/route'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[auth/callback] Code:', code ? 'present' : 'missing')

  // CRITICAL: Create response FIRST, pass to supabase client, return SAME response
  const response = NextResponse.redirect(`${origin}${next}`)

  if (!code) {
    console.log('[auth/callback] No code - redirecting to error')
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Create supabase client that will mutate response cookies
  const supabase = createRouteHandlerClient(request, response)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  console.log('[auth/callback] Success - session established, cookies set')
  console.log('[auth/callback] User:', data?.user?.email)
  console.log('[auth/callback] Redirecting to:', next)

  // Return the SAME response that had cookies set by exchangeCodeForSession
  return response
}
