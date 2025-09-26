import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from '@/app/components/AuthProvider';
import Header from '@/app/components/Header';

export const metadata: Metadata = {
  title: "Deserve App",
  description: "Your trusted platform for services",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-montserrat">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
