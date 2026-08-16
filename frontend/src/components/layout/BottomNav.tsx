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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-stone-300 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs transition-colors ${
              active
                ? "text-[#1a6b5a] font-semibold"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            }`}
          >
            <Icon size={18} className={active ? "text-[#1a6b5a]" : "text-stone-400 dark:text-zinc-500"} />
            <span className="mt-1 text-[11px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
