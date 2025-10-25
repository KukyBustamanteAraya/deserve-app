import type { Metadata, Viewport } from "next";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Import globals.css directly - Next.js handles Tailwind via PostCSS
import './globals.css';
import Providers from './providers';
import ConditionalHeader from '@/app/components/ConditionalHeader';
import SessionHydration from '@/app/components/SessionHydration';
import ProgressBar from '@/components/ProgressBar';
// Import env to trigger validation on startup
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: "Deserve - Equipamiento Deportivo Personalizado",
  description: "Plataforma de equipamiento deportivo personalizado para equipos e instituciones en Chile",
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deserve",
  },
  icons: {
    icon: "/api/pwa-icons/192",
    apple: "/api/pwa-icons/192",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#000000",
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
      <body className="antialiased font-montserrat bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
        <Providers initialUser={initialUser}>
          <SessionHydration />
          <ConditionalHeader />
          <main className="pb-20">
            {children}
          </main>
          <ProgressBar />
        </Providers>
      </body>
    </html>
  );
}
