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

  let stepText = "";
  if (pathname === "/") stepText = "Step 1 of 3";
  else if (pathname === "/upload") stepText = "Step 2 of 3";
  else if (pathname === "/dashboard") stepText = "Step 3 of 3";

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
    <header className="sticky top-0 z-30 border-b border-stone-200/60 dark:border-zinc-800 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white shadow-md shadow-emerald-900/20 group-hover:shadow-lg group-hover:shadow-emerald-900/25 group-hover:scale-105 transition-all duration-200">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-stone-900 dark:text-zinc-100 leading-tight">
                PolicyLens
              </span>
              <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 tracking-wide">
                Insurance Protection Intelligence
              </span>
            </div>
          </Link>

          {stepText && (
            <span className="hidden sm:inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              {stepText}
            </span>
          )}

          {family && (
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-medium text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {family.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 dark:hover:text-zinc-300 transition-all"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            title="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 dark:hover:text-zinc-300 transition-all"
          >
            <Bell size={18} />
          </button>

          <div className="flex items-center gap-2.5 border-l border-stone-200 dark:border-zinc-700 pl-3 ml-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-hero text-[11px] font-mono font-bold text-emerald-300 ring-2 ring-emerald-500/20">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-stone-700 dark:text-zinc-300 md:inline-block">
              {primaryMember?.name || "User"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
