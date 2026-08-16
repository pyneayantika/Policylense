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
    <aside className="hidden w-56 shrink-0 border-r border-stone-300/70 bg-[#e8e5de]/50 p-4 md:block">
      <div className="mb-4 px-2">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500">
          Navigation
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-[#1a6b5a] text-white shadow-sm"
                  : "text-stone-700 hover:bg-stone-200/70 hover:text-stone-900"
              }`}
            >
              <Icon size={18} className={active ? "text-emerald-200" : "text-stone-500"} />
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
              className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Start Fresh
            </button>
          ) : (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-red-800">
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
                  className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 shadow-2xs">
        <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
          <ShieldAlert size={14} className="text-amber-600 shrink-0" />
          <span>Indicative Analysis</span>
        </div>
        <p className="text-[11px] text-amber-800/90 leading-snug">
          Insights cite policy clauses. Not financial or insurance sales advice.
        </p>
      </div>
    </aside>
  );
}
