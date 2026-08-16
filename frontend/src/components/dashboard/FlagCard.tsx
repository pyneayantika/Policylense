"use client";

import Link from "next/link";
import type { ProtectionFlag } from "@/lib/types";
import { SmartText } from "@/components/shared/SmartText";
import { AlertCircle, AlertTriangle, Info, FileText, ArrowRight } from "lucide-react";

interface FlagCardProps {
  flag: ProtectionFlag;
  onSelectDetails?: () => void;
}

export function FlagCard({ flag, onSelectDetails }: FlagCardProps) {
  const isCritical = flag.severity === "critical" || flag.severity === "high";
  const isWarning = flag.severity === "warning" || flag.severity === "medium";

  let bgClass = "bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200";
  let badgeClass = "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
  let Icon = Info;

  if (isCritical) {
    bgClass = "bg-red-50/60 border-red-200 text-red-950 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200";
    badgeClass = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700";
    Icon = AlertCircle;
  } else if (isWarning) {
    bgClass = "bg-amber-50/60 border-amber-200 text-amber-950 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200";
    badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
    Icon = AlertTriangle;
  }

  const refs =
    typeof flag.evidence_clauses === "string"
      ? flag.evidence_clauses
      : Array.isArray(flag.evidence_clauses)
      ? flag.evidence_clauses.join(", ")
      : "";

  return (
    <div className={`rounded-2xl border p-5 shadow-2xs transition-all ${bgClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${badgeClass}`}>
            <Icon size={12} />
            {flag.severity}
          </span>
          {flag.member_name && (
            <span className="text-xs font-medium text-stone-500 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-700 px-2 py-0.5 rounded-md border border-stone-200 dark:border-zinc-600">
              For {flag.member_name}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100 leading-snug">
        {flag.title}
      </h3>

      {flag.description && (
        <div className="mt-2 text-sm text-stone-700 dark:text-zinc-300 leading-relaxed">
          <SmartText text={flag.description} />
        </div>
      )}

      {/* Evidence Clause */}
      {refs && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-stone-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-800 rounded-lg p-2 border border-stone-200/80 dark:border-zinc-600">
          <FileText size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
          <span className="font-semibold text-stone-700 dark:text-zinc-300">Evidence:</span>
          <span className="truncate">{refs}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-stone-200/60 dark:border-zinc-700">
        <button
          type="button"
          onClick={onSelectDetails}
          className="rounded-xl border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-stone-800 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
        >
          See Details
        </button>

        <Link
          href="/scenarios"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1a6b5a] hover:underline"
        >
          <span>Run Scenario</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
