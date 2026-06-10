import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Topbar } from "@/components/Topbar";
import "./globals.css";
import { Toaster } from "sonner";
import { MobileDrawer } from "@/components/MobileDrawer";
import { MainWrapper } from "@/components/MainWrapper";
import Providers from "@/components/Providers";
import { NetworkStatus } from "@/components/NetworkStatus";
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
    default: "ScripticX | Învață programare interactiv",
    template: "%s | ScripticX",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: "Echipa ScripticX", url: siteConfig.url }],
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
    title: "ScripticX | Învață programare interactiv",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    locale: "ro_RO",
    alternateLocale: ["en_US"],
    type: "website",
    images: [absoluteUrl(siteConfig.socialImage)],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScripticX | Învață programare interactiv",
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
              alternateName: "Platforma ScripticX",
              url: siteConfig.url,
              description: siteConfig.description,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires a modern web browser",
              inLanguage: ["ro", "en"],
              image: absoluteUrl(siteConfig.socialImage),
              logo: absoluteUrl(siteConfig.logo),
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "RON",
              },
              featureList: [
                "Editor MiniScript+",
                "Execuție pas cu pas",
                "Evaluare automată",
                "Analiză de complexitate",
                "Vizualizare AST și flowchart",
                "Programare colaborativă în timp real",
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
          </LanguageProvider>
        </Providers>

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
