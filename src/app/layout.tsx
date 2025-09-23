import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
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
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        {/* Logo Header */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-0">
            <div className="flex justify-between items-center px-4">
              <div className="flex-1"></div>
              <div className="flex justify-center">
                <img 
                  src="/deserve-logo.png" 
                  alt="Deserve Logo" 
                  className="h-20 w-auto"
                />
              </div>
              <div className="flex-1 flex justify-end">
                <button className="bg-[#e21c21] text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2">
                  Iniciar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {children}
      </body>
    </html>
  );
}
