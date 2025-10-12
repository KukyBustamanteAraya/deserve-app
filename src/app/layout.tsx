import type { Metadata, Viewport } from "next";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Import globals.css directly - Next.js handles Tailwind via PostCSS
import './globals.css';
import Providers from './providers';
import Header from '@/app/components/Header';
import SessionHydration from '@/app/components/SessionHydration';
import ProgressBar from '@/components/ProgressBar';
// Import env to trigger validation on startup
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: "Deserve App",
  description: "Your trusted platform for services",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  const initialUser = data.user ?? null;

  return (
    <html lang="en">
      <body className="antialiased font-montserrat">
        <Providers initialUser={initialUser}>
          <SessionHydration />
          <Header />
          {children}
          <ProgressBar />
        </Providers>
      </body>
    </html>
  );
}
