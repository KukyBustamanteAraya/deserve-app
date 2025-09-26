import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Auth callback - Code:', code ? 'present' : 'missing')
  console.log('Auth callback - Origin:', origin)

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('Auth callback - Exchange result:', {
      success: !error,
      error: error?.message,
      hasSession: !!data?.session,
      hasUser: !!data?.user
    })

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      console.log('Auth callback - Redirecting to:', `${origin}${next}`)

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  } else {
    console.log('Auth callback - No code parameter found')
  }

  // return the user to an error page with instructions
  console.log('Auth callback - Redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
