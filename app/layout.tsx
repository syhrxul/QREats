import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DynamicFavicon from "./components/DynamicFavicon";
import OneSignalInit from "./components/OneSignalInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QREats",
  description: "Self-Order & Cashier System",
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
      </head>
      <body className="min-h-full flex flex-col">
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}
