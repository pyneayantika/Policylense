import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/context/Providers";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PolicyLens — Insurance Protection Visibility",
  description:
    "Family protection dashboard, gap flags, and what-if scenario simulations grounded in your policy clauses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-[#f0eee9] dark:bg-[#0f1419] text-[#1a1a1a] dark:text-zinc-200 font-sans antialiased min-h-screen flex flex-col transition-colors duration-300">
        <Providers>
          <Navbar />
          <div className="mx-auto flex w-full max-w-6xl flex-1 pb-16 md:pb-0">
            <Sidebar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8 min-h-[calc(100vh-8rem)]">
              {children}
            </main>
          </div>
          <footer className="border-t border-stone-300/60 dark:border-zinc-700 bg-[#e7e4dc] dark:bg-zinc-900 px-4 py-3 text-center text-xs text-stone-600 dark:text-zinc-400 hidden md:block">
            PolicyLens provides indicative protection analysis based on uploaded documents. This is protection visibility, not financial advice.
          </footer>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

