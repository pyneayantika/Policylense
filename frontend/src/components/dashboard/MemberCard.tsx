"use client";

import type { MemberProtectionStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface MemberCardProps {
  member: MemberProtectionStatus;
}

export function MemberCard({ member }: MemberCardProps) {
  const health = member.health_cover?.sum_insured;
  const life = member.life_cover?.sum_assured;

  // Initials
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Status dot color mapping
  let dotColor = "bg-emerald-500 ring-emerald-200";
  let statusLabel = "Adequate";
  if (member.protection_status === "gap_detected" || member.relationship === "spouse" && !life) {
    dotColor = "bg-red-500 ring-red-200";
    statusLabel = "Critical Gap";
  } else if (member.protection_status === "moderate" || member.relationship === "self") {
    dotColor = "bg-amber-500 ring-amber-200";
    statusLabel = "Attention Needed";
  }

  // Format currency helper
  function displayAmount(amt: number | null | undefined, fallback: string) {
    if (!amt) return fallback;
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)}Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(0)}L`;
    return formatCurrency(amt);
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-2xs hover:shadow-sm hover:border-stone-300 dark:hover:border-zinc-600 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f2922] font-mono font-bold text-emerald-300 text-xs border border-emerald-900 shadow-2xs">
            {initials}
          </div>
          <div>
            <h4 className="font-bold text-stone-900 dark:text-zinc-100 text-sm leading-tight">{member.name}</h4>
            <span className="text-[11px] capitalize text-stone-500 dark:text-zinc-400 font-medium">
              {member.relationship}
            </span>
          </div>
        </div>

        {/* Status Dot */}
        <span
          className={`h-3 w-3 rounded-full ${dotColor} ring-4`}
          title={statusLabel}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-zinc-700 text-xs">
        <div className="rounded-lg bg-stone-50 dark:bg-zinc-700/50 p-2 border border-stone-200/60 dark:border-zinc-600">
          <span className="text-[10px] font-mono font-semibold uppercase text-stone-400 dark:text-zinc-500 block">HEALTH</span>
          <span className="font-bold text-stone-900 dark:text-zinc-100">
            {health ? displayAmount(health, "₹10L") : "₹10L"}
          </span>
        </div>

        <div className="rounded-lg bg-stone-50 dark:bg-zinc-700/50 p-2 border border-stone-200/60 dark:border-zinc-600">
          <span className="text-[10px] font-mono font-semibold uppercase text-stone-400 dark:text-zinc-500 block">LIFE</span>
          <span
            className={`font-bold ${
              member.relationship === "spouse" && !life
                ? "text-red-600"
                : member.relationship === "child"
                ? "text-stone-400 dark:text-zinc-500 font-normal"
                : "text-stone-900 dark:text-zinc-100"
            }`}
          >
            {member.relationship === "child"
              ? "N/A"
              : life
              ? displayAmount(life, "₹1Cr")
              : member.relationship === "spouse"
              ? "None"
              : "₹1Cr"}
          </span>
        </div>
      </div>
    </div>
  );
}
