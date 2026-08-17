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
      {/* Dashboard Hero Header */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold">
                <ShieldCheck size={12} />
                Protection Dashboard
              </span>
              {family?.name && (
                <span className="text-xs text-emerald-200/70">· {family.name}</span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Family Coverage Overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/scenarios"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 px-4 py-2.5 text-xs font-semibold transition-all"
            >
              <Sparkles size={14} />
              <span>Run What-If Scenario</span>
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-[#1a6b5a] transition-all"
            >
              <MessageSquare size={14} />
              <span>Ask PolicyLens</span>
            </Link>
          </div>
        </div>
      </div>

      {isLoading && !summary && (
        <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 animate-pulse">
          Refreshing protection intelligence & rules engine evaluation...
        </div>
      )}

      {!isLoading && !hasPolicies && (
        <div className="card-elevated p-12 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-zinc-800 mx-auto">
            <Upload size={32} className="text-stone-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 dark:text-zinc-200">No policies analyzed yet</h3>
          <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Upload your health and life insurance PDFs to see your family&apos;s protection score,
            coverage gaps, and personalized insights.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 hover:shadow-lg transition-all"
          >
            <Upload size={16} />
            Upload Policies
          </Link>
        </div>
      )}

      {hasPolicies && (
        <>
          {/* Score Ring & Breakdown */}
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

          {/* Member Cards */}
          {displayMembers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <ShieldCheck size={15} className="text-[#1a6b5a]" />
                  </div>
                  Family Coverage Status
                </h2>
                <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-medium">
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

          {/* Flags */}
          {displayFlags.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-zinc-800 pb-3">
                <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <AlertTriangle size={15} className="text-amber-600" />
                  </div>
                  Protection Flags ({displayFlags.length})
                </h2>
                <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-500">
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

      {/* CTA Banner */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Simulate Real Medical Scenarios</h3>
            <p className="text-sm text-emerald-100/70 mt-1">
              See exactly how co-pay and room rent sub-limits affect your out-of-pocket on a hospital bill.
            </p>
          </div>
          <Link
            href="/scenarios"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white hover:bg-emerald-50 px-6 py-3 text-sm font-semibold text-[#1a6b5a] transition-all shadow-md"
          >
            <span>Launch Simulator</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
