// src/lib/auth/admin-guard.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient()

  // 1) Make sure we have a logged-in user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2) Read role from your profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 3) Only allow admins through
  if (profile?.role !== 'admin') {
    redirect('/dashboard?error=admin_required')
  }

  return { user }
}
