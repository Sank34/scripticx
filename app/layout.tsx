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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScripticX Platform | Learn Programming",
  description: "Welcome to ScripticX ! Begin your programming journey with us.",
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

                    <MainWrapper>{children}</MainWrapper>

                  </div>

                </div>
              </div>
              <MobileDrawer />
            </SidebarProvider>
        </LanguageProvider>
      </Providers>

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
