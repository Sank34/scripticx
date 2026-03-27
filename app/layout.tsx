import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import "./globals.css";
import { Toaster } from "sonner";
import MobileNav from "@/components/MobileNav";

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
      <body className={`${geistSans.className} min-h-screen`}>

        <SidebarProvider>
          <div className="flex min-h-screen w-full">

            <AppSidebar />

            <main className="flex-1 w-full pb-16 md:pb-0">
              {children}
            </main>

          </div>
        </SidebarProvider>

        <MobileNav />

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}