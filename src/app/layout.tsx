import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Logo Header */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-0">
            <div className="flex justify-center">
              <img 
                src="/deserve-logo.png" 
                alt="Deserve Logo" 
                className="h-20 w-auto"
              />
            </div>
          </div>
        </div>
        
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
