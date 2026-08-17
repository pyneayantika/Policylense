"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  MessageCircle,
  BookOpen,
  Upload,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/scenarios", label: "Scenarios", icon: Sparkles },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-stone-200/60 dark:border-zinc-800 glass px-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-xs transition-all duration-200 ${
              active
                ? "text-[#1a6b5a] font-semibold"
                : "text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300"
            }`}
          >
            <div className={`p-1 rounded-lg ${active ? "bg-emerald-50 dark:bg-emerald-950/40" : ""}`}>
              <Icon size={18} className={active ? "text-[#1a6b5a]" : ""} />
            </div>
            <span className="mt-0.5 text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
