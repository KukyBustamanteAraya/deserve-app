import type { Metadata, Viewport } from "next";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import "./globals.css";
import Providers from './providers';
import Header from '@/app/components/Header';
import SessionHydration from '@/app/components/SessionHydration';

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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        </Providers>
      </body>
    </html>
  );
}
