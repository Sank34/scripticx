import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Topbar } from "@/components/Topbar";
import "./globals.css"
import { Toaster } from "sonner";
import { MobileDrawer } from "@/components/MobileDrawer";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scripticx",
  description: "Learn programming in an interactive way!",
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
      <Providers>
          <LanguageProvider>
              <SidebarProvider>
              <div className="h-screen w-full overflow-hidden p-2">
                <div className="flex h-full w-full gap-2 overflow-hidden rounded-[28px] bg-zinc-100">

                  <AppSidebar />

                  <div className="flex h-full flex-1 flex-col overflow-hidden rounded-[24px] border border-zinc-200/70 bg-white shadow-sm min-h-0">

                    <Topbar />

                    <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-16 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
                        {children}
                      </div>
                    </main>

                  </div>

                </div>
              </div>
            </SidebarProvider>
        </LanguageProvider>
      </Providers>

        <MobileDrawer />

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}