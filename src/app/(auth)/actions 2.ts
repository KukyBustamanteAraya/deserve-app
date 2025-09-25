'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function sendMagicLink(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { ok: false, message: 'Email es requerido' };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Magic link error:', error);
    return { ok: false, message: 'Error al enviar el enlace' };
  }
}

export async function signOut() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { ok: false, message: 'Error al cerrar sesión' };
  } finally {
    redirect('/login');
  }
}