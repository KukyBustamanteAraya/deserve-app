'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getOrigin } from '@/lib/origin';
import { logger } from '@/lib/logger';

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
        emailRedirectTo: `${getOrigin()}/auth/callback`,
      },
    });

    if (error) {
      logger.error('Magic link error:', error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    logger.error('Magic link error:', error);
    return { ok: false, message: 'Error al enviar el enlace' };
  }
}

export async function signOut() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Sign out error:', error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    logger.error('Sign out error:', error);
    return { ok: false, message: 'Error al cerrar sesión' };
  } finally {
    redirect('/login');
  }
}