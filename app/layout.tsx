import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DynamicFavicon from "./components/DynamicFavicon";
import OneSignalInit from "./components/OneSignalInit";
import GlobalLogger from "./components/GlobalLogger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "QREats",
  description: "Self-Order & Cashier System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QREats Kasir",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <DynamicFavicon />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Tangkap jika Supabase melempar error langsung ke halaman utama
              if (window.location.hash.includes('error_description') || window.location.hash.includes('type=recovery')) {
                window.location.replace('/update-password' + window.location.search + window.location.hash);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <GlobalLogger />
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}
