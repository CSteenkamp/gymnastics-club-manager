import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { PWAInstallPrompt, PWAUpdatePrompt } from "@/components/pwa/PWAInstallPrompt";
import { BrandingProvider } from "@/contexts/BrandingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ceres Gymnastics Club Manager",
  description: "Comprehensive gymnastics club management system for Ceres Gymnastics Club. Manage members, fees, payments, and more.",
  keywords: ["gymnastics", "club management", "Ceres", "members", "payments", "fees"],
  authors: [{ name: "Ceres Gymnastics Club" }],
  creator: "Ceres Gymnastics Club",
  publisher: "Ceres Gymnastics Club",
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Ceres Gymnastics Club Manager",
    description: "Comprehensive gymnastics club management system",
    type: "website",
    locale: "en_ZA",
    siteName: "Ceres Gymnastics Club",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ceres Gymnastics Club Manager",
    description: "Comprehensive gymnastics club management system",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ceres Gym",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#7c3aed" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192x192.svg" />
        <link rel="shortcut icon" href="/icons/icon-192x192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Ceres Gym" />
        <meta name="apple-mobile-web-app-title" content="Ceres Gym" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-navbutton-color" content="#7c3aed" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <BrandingProvider>
          <PWAProvider>
            {children}
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
          </PWAProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
