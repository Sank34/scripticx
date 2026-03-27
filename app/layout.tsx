import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import "./globals.css";
import { Toaster } from "sonner";

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
          <div className="flex h-screen w-full">

            {/* SIDEBAR */}
            <AppSidebar />

            {/* CONTENT */}
            <main className="flex-1 overflow-auto w-full">
              {children}
            </main>

          </div>
        </SidebarProvider>

        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}