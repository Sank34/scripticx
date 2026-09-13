import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/Providers";
import { EmailVerificationAccessGate } from "@/components/account/EmailVerificationAccessGate";
import { EntrySessionGate } from "@/components/auth/EntrySessionGate";
import { AppShell } from "@/components/AppShell";
import { absoluteUrl, siteConfig } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "ScripticX | Learn Programming Interactively",
    template: "%s | ScripticX",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: "ScripticX Team", url: siteConfig.url }],
  creator: "ScripticX",
  publisher: "ScripticX",
  category: "education",
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
    icon: [
      { url: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      {
        url: "/icons/app-icon-v2-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/favicon-v2.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "ScripticX | Learn Programming Interactively",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [absoluteUrl(`/api/social-image?title=${encodeURIComponent("ScripticX | Learn Programming Interactively")}&description=${encodeURIComponent(siteConfig.description)}&section=ScripticX&path=/`)],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScripticX | Learn Programming Interactively",
    description: siteConfig.description,
    images: [absoluteUrl(`/api/social-image?title=${encodeURIComponent("ScripticX | Learn Programming Interactively")}&description=${encodeURIComponent(siteConfig.description)}&section=ScripticX&path=/`)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${geistSans.className} h-svh overflow-hidden bg-background text-foreground antialiased md:h-dvh`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: siteConfig.name,
              alternateName: "ScripticX Learning Platform",
              url: siteConfig.url,
              description: siteConfig.description,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires a modern web browser",
              inLanguage: "en",
              image: absoluteUrl(siteConfig.socialImage),
              logo: absoluteUrl(siteConfig.logo),
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "RON",
              },
              featureList: [
                "MiniScript+ code editor",
                "Step-by-step execution",
                "Automatic code evaluation",
                "Complexity analysis",
                "AST and flowchart visualization",
                "Real-time collaborative programming",
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider>
          <AccessibilityProvider>
            <Providers>
              <LanguageProvider>
                <EmailVerificationAccessGate />
                <EntrySessionGate>
                  <AppShell>{children}</AppShell>
                </EntrySessionGate>
              </LanguageProvider>
            </Providers>
          </AccessibilityProvider>

          <Toaster
            position="top-center"
            richColors={false}
            closeButton
            toastOptions={{
              classNames: {
                toast: "border-border bg-popover text-popover-foreground shadow-lg",
                description: "text-muted-foreground",
                actionButton: "bg-primary text-primary-foreground",
                cancelButton: "bg-muted text-muted-foreground",
                closeButton:
                  "border-border bg-popover text-muted-foreground hover:text-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
