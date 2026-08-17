"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { useTheme } from "@/context/ThemeContext";
import { Bell, Moon, ShieldCheck, Sun } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { family, members } = useFamily();
  const { theme, toggle } = useTheme();

  // Determine current step for onboarding flow
  let stepText = "";
  if (pathname === "/") stepText = "Step 1 of 3";
  else if (pathname === "/upload") stepText = "Step 2 of 3";
  else if (pathname === "/dashboard") stepText = "Step 3 of 3";

  // Primary earner or first member avatar
  const primaryMember = members[0];
  const initials = primaryMember
    ? primaryMember.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <header className="sticky top-0 z-30 border-b border-stone-300/80 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a6b5a] text-white font-bold text-base shadow-sm group-hover:bg-[#145447] transition-colors">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-stone-900 dark:text-zinc-100 leading-tight">
                PolicyLens
              </span>
              <span className="text-[10px] font-mono font-medium text-stone-500 dark:text-zinc-500 uppercase tracking-wider">
                Insurance Protection Intelligence
              </span>
            </div>
          </Link>

          {stepText && (
            <span className="hidden sm:inline-flex rounded-full bg-stone-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-600">
              {stepText}
            </span>
          )}

          {family && (
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1a6b5a]"></span>
              {family.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            title="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <Bell size={18} />
          </button>

          <div className="flex items-center gap-2 border-l border-stone-200 dark:border-zinc-700 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f2922] text-xs font-mono font-bold text-emerald-300 border border-emerald-800 shadow-sm">
              {initials}
            </div>
            <span className="hidden text-xs font-medium text-stone-700 dark:text-zinc-300 md:inline-block">
              {primaryMember?.name || "User"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
