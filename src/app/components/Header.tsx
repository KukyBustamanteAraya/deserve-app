import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},   // SSR read-only
        remove: () => {},// SSR read-only
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  const serverUser = error ? null : (data.user ?? null);

  return <HeaderClient />;
}
