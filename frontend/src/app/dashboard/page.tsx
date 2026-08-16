"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { useProtection } from "@/context/ProtectionContext";
import { ProtectionScoreRing } from "@/components/dashboard/ProtectionScoreRing";
import { MemberCard } from "@/components/dashboard/MemberCard";
import { FlagCard } from "@/components/dashboard/FlagCard";
import { WhyThisMatters } from "@/components/dashboard/WhyThisMatters";
import { ScoreBreakdown } from "@/components/dashboard/ScoreBreakdown";
import { Sparkles, MessageSquare, AlertTriangle, ShieldCheck, ArrowRight, Upload } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { family, isSetupComplete, loading } = useFamily();
  const { summary, score, flags, isLoading, refresh } = useProtection();

  useEffect(() => {
    if (!loading && !isSetupComplete && !family) {
      router.replace("/");
    }
  }, [loading, isSetupComplete, family, router]);

  useEffect(() => {
    if (family) refresh(family.id);
  }, [family, refresh]);

  const displayFlags = flags;
  const displayMembers = summary?.members || [];
  const hasPolicies = displayMembers.length > 0 || displayFlags.length > 0;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Dashboard Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-300/80 dark:border-zinc-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1a6b5a] bg-emerald-100/80 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
              Protection Dashboard
            </span>
            <span className="text-xs font-medium text-stone-500 dark:text-zinc-400">
              {family?.name ? `· ${family.name}` : ""}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-zinc-100 mt-1">
            Family Coverage Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a6b5a] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#145447] transition-all"
          >
            <Sparkles size={14} />
            <span>Run What-If Scenario</span>
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-zinc-200 shadow-2xs hover:bg-stone-50 dark:hover:bg-zinc-700 transition-all"
          >
            <MessageSquare size={14} />
            <span>Ask PolicyLens</span>
          </Link>
        </div>
      </div>

      {isLoading && !summary && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-xs font-medium text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
          Refreshing protection intelligence & rules engine evaluation...
        </div>
      )}

      {!isLoading && !hasPolicies && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800 p-10 text-center space-y-4">
          <Upload size={40} className="mx-auto text-stone-400 dark:text-zinc-500" />
          <h3 className="text-lg font-bold text-stone-700 dark:text-zinc-200">No policies analyzed yet</h3>
          <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-md mx-auto">
            Upload your health and life insurance PDFs to see your family&apos;s protection score,
            coverage gaps, and personalized insights.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a6b5a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#145447] transition-all"
          >
            <Upload size={16} />
            Upload Policies
          </Link>
        </div>
      )}

      {hasPolicies && (
        <>
          {/* Row 1: Donut Score Ring & Score Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ProtectionScoreRing
              score={score ?? 0}
              familyName={family?.name}
              summary={summary}
            />
            <div className="lg:col-span-2">
              <ScoreBreakdown breakdown={summary?.score_breakdown || {}} />
            </div>
          </div>

          {/* Row 2: Family Member Coverage Cards */}
          {displayMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#1a6b5a]" />
                  Family Coverage Status
                </h2>
                <span className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
                  {displayMembers.length} Member{displayMembers.length !== 1 ? "s" : ""} Monitored
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayMembers.map((m) => (
                  <MemberCard key={m.member_id} member={m} />
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Coverage Flags & Why This Matters */}
          {displayFlags.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-700 pb-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  Protection Flags ({displayFlags.length})
                </h2>
                <span className="text-xs font-mono text-stone-500 dark:text-zinc-400">
                  Clause Evidence Grounded
                </span>
              </div>

              <div className="space-y-5">
                {displayFlags.map((flag) => (
                  <div key={flag.id} className="space-y-2">
                    <FlagCard flag={flag} />
                    <WhyThisMatters flag={flag} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Hero Bottom Navigation Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-stone-900 dark:bg-zinc-800 dark:border dark:border-zinc-700 p-6 text-white shadow-md">
        <div>
          <h3 className="text-lg font-bold">Simulate Real Medical Scenarios</h3>
          <p className="text-xs text-stone-300 dark:text-zinc-400 mt-1">
            See exactly how co-pay and room rent sub-limits affect your out-of-pocket on a hospital bill.
          </p>
        </div>
        <Link
          href="/scenarios"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1a6b5a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#145447] transition-all"
        >
          <span>Launch Simulator</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
