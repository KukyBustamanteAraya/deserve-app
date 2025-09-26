import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMyProfile } from '@/lib/db/profiles'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') ?? 'email') as 'email'
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'
  const debug = process.env.DEBUG_AUTH_LOGS === '1'

  if (debug) {
    console.log('Auth callback - Code:', code ? 'present' : 'missing')
    console.log('Auth callback - Token hash:', token_hash ? 'present' : 'missing')
    console.log('Auth callback - Type:', type)
    console.log('Auth callback - Origin:', origin)
  }

  // Handle new magic link flow with token_hash
  if (token_hash) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })

      if (debug) {
        console.log('Auth callback - VerifyOtp result:', {
          success: !error,
          error: error?.message,
          hasUser: !!data?.user
        })
      }

      if (!error && data?.user) {
        // Check if user has set password before (first-time user flow)
        // Use profiles table instead of user metadata for more reliable state
        const { user, profile, error: profileError } = await getMyProfile()
        let hasPassword = profile?.has_password === true

        if (profileError) {
          if (debug) console.error('[auth/callback] Failed to load profile:', profileError)
          // If we can't load profile, fall back to metadata check
          const { data: { user: authUser } } = await supabase.auth.getUser()
          hasPassword = authUser?.user_metadata?.password_set === true
        }

        // preserve any ?next=... but keep it same-origin relative
        const rawNext = searchParams.get('next') || '/dashboard'
        const safeNext = rawNext.startsWith('/') ? rawNext : '/dashboard'

        const target = hasPassword
          ? safeNext
          : `/onboarding/set-password?next=${encodeURIComponent(safeNext)}`

        if (debug) console.log('[auth/callback] redirect target:', target, 'hasPassword:', hasPassword)

        return NextResponse.redirect(new URL(target, origin))
      } else {
        if (debug) console.log('Auth callback - VerifyOtp failed:', error?.message)
        // Use friendly error message instead of raw error
        const friendlyMessage = encodeURIComponent('Link expired or already used. Request a new link.')
        const nextParam = next && next.startsWith('/') ? `&next=${encodeURIComponent(next)}` : ''
        return NextResponse.redirect(new URL(`/login?error=${friendlyMessage}${nextParam}`, origin))
      }
    } catch (err) {
      if (debug) console.error('Auth callback - Exception during token verification:', err)
      const friendlyMessage = encodeURIComponent('Link expired or already used. Request a new link.')
      const nextParam = next && next.startsWith('/') ? `&next=${encodeURIComponent(next)}` : ''
      return NextResponse.redirect(new URL(`/login?error=${friendlyMessage}${nextParam}`, origin))
    }
  }

  // Handle old code flow for backwards compatibility
  if (code) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (debug) {
        console.log('Auth callback - Exchange result:', {
          success: !error,
          error: error?.message,
          hasSession: !!data?.session,
          hasUser: !!data?.user
        })
      }

      if (!error && data?.session) {
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (debug) console.log('Auth callback - Redirecting to:', `${origin}${next}`)

        // Create the redirect response
        const redirectUrl = isLocalEnv
          ? `${origin}${next}`
          : forwardedHost
            ? `https://${forwardedHost}${next}`
            : `${origin}${next}`

        const response = NextResponse.redirect(redirectUrl)

        // Ensure cookies are properly set by refreshing the session
        await supabase.auth.refreshSession()

        return response
      } else {
        if (debug) console.log('Auth callback - Exchange failed:', error?.message)
      }
    } catch (err) {
      if (debug) console.error('Auth callback - Exception during code exchange:', err)
    }
  } else {
    if (debug) console.log('Auth callback - No code or token_hash parameter found')
  }

  // return the user to an error page with instructions
  if (debug) console.log('Auth callback - Redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
