import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Topbar } from "@/components/Topbar";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MobileDrawer } from "@/components/MobileDrawer";
import { MainWrapper } from "@/components/MainWrapper";
import Providers from "@/components/Providers";
import { NetworkStatus } from "@/components/NetworkStatus";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
import { GlobalContextMenu } from "@/components/navigation/GlobalContextMenu";
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${geistSans.className} h-screen overflow-hidden bg-background text-foreground antialiased`}
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
          <Providers>
            <LanguageProvider>
              <GlobalContextMenu>
                <SidebarProvider>
                  <div className="h-screen w-full overflow-hidden bg-muted/50 p-2">
                    <div className="flex h-full w-full gap-2 overflow-hidden rounded-[28px] bg-muted/50">

                      <AppSidebar />

                      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border/70 bg-background shadow-sm">

                        <Topbar />

                        <MainWrapper>{children}</MainWrapper>

                      </div>
                    </div>
                  </div>
                </SidebarProvider>
                <MobileDrawer />
                <NetworkStatus />
                <OnboardingManager />
              </GlobalContextMenu>
            </LanguageProvider>
          </Providers>

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
