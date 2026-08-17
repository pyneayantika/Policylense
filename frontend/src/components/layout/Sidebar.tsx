"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import {
  LayoutDashboard,
  Upload,
  Sparkles,
  MessageCircle,
  BookOpen,
  Users,
  ShieldAlert,
  Trash2,
  Loader2,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Family Setup", icon: Users },
  { href: "/upload", label: "Upload Policies", icon: Upload },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scenarios", label: "Scenarios", icon: Sparkles },
  { href: "/chat", label: "Ask PolicyLens", icon: MessageCircle },
  { href: "/learn", label: "Learn Concepts", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { family, resetSession } = useFamily();
  const [resetting, setResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await resetSession();
      setShowConfirm(false);
      router.push("/");
    } finally {
      setResetting(false);
    }
  }

  return (
    <aside className="hidden w-56 shrink-0 border-r border-stone-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/60 backdrop-blur-sm p-4 md:block">
      <div className="mb-3 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-600">
          Navigation
        </p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "gradient-brand text-white shadow-md shadow-emerald-900/20"
                  : "text-stone-600 dark:text-zinc-400 hover:bg-stone-100/80 dark:hover:bg-zinc-800/80 hover:text-stone-900 dark:hover:text-zinc-200"
              }`}
            >
              <Icon
                size={17}
                className={active ? "text-emerald-200" : "text-stone-400 dark:text-zinc-600 group-hover:text-stone-500 dark:group-hover:text-zinc-400"}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {family && (
        <div className="mt-6">
          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
            >
              <Trash2 size={14} />
              Start Fresh
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/40 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-red-800 dark:text-red-300">
                Delete all data? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {resetting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {resetting ? "Clearing..." : "Yes, clear all"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={resetting}
                  className="flex-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-[11px] font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-amber-200/60 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400 mb-1">
          <ShieldAlert size={13} className="text-amber-500 dark:text-amber-500 shrink-0" />
          <span>Indicative Analysis</span>
        </div>
        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 leading-snug">
          Insights cite policy clauses. Not financial or insurance sales advice.
        </p>
      </div>
    </aside>
  );
}
