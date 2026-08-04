import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Topbar } from "@/components/Topbar";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MobileDrawer } from "@/components/MobileDrawer";
import { MainWrapper } from "@/components/MainWrapper";
import Providers from "@/components/Providers";
import { NetworkStatus } from "@/components/NetworkStatus";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
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
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/icons/notification-icon-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        url: "/icons/notification-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/icons/notification-icon-512.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "ScripticX | Learn Programming Interactively",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [absoluteUrl(siteConfig.socialImage)],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScripticX | Learn Programming Interactively",
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.socialImage)],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${geistSans.className} h-screen overflow-hidden bg-zinc-100 antialiased`}
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
        <Providers>
          <LanguageProvider>
            <SidebarProvider>
              <div className="h-screen w-full overflow-hidden p-2">
                <div className="flex h-full w-full gap-2 overflow-hidden rounded-[28px] bg-zinc-100">

                  <AppSidebar />

                  <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-zinc-200/70 bg-white shadow-sm">

                    <Topbar />

                    <MainWrapper>{children}</MainWrapper>

                  </div>

                </div>
              </div>
            </SidebarProvider>
            <MobileDrawer />
            <NetworkStatus />
            <OnboardingManager />
          </LanguageProvider>
        </Providers>

        <Toaster
          position="top-center"
          richColors={false}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border-zinc-200 bg-white text-zinc-900 shadow-lg",
              description: "text-zinc-500",
              actionButton: "bg-zinc-950 text-white",
              cancelButton: "bg-zinc-100 text-zinc-700",
              closeButton:
                "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-950",
            },
          }}
        />
      </body>
    </html>
  );
}
