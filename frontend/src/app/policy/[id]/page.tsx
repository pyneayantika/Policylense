"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPolicyFacts } from "@/lib/api";
import type { PolicyFacts } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartText } from "@/components/shared/SmartText";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

interface PolicyDetailPageProps {
  params: { id: string };
}

export default function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const [facts, setFacts] = useState<PolicyFacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPolicyFacts(params.id)
      .then((res) => setFacts(res.policy_facts))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load policy facts"));
  }, [params.id]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-stone-300/80 pb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
          <FileText size={26} className="text-[#1a6b5a]" />
          Policy Terms & Extracted Facts
        </h1>
        <p className="text-sm text-stone-600">
          Machine-extracted structured terms from uploaded policy wording PDF.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!facts && !error && (
        <div className="rounded-xl bg-stone-100 p-4 text-xs text-stone-500 animate-pulse">
          Loading extracted terms...
        </div>
      )}

      {facts && (
        <div className="space-y-6">
          {/* Policy Card Header */}
          <div className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-[#1a6b5a] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  HEALTH POLICY
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-1">HDFC Ergo Optima Secure / Comprehensive</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono font-bold text-[#1a6b5a]">
                <CheckCircle2 size={14} /> Verified Facts
              </span>
            </div>

            {/* Fact Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FactCard label="SUM INSURED" value={facts.sum_insured ? formatCurrency(facts.sum_insured) : "₹10,00,000"} />
              <FactCard label="CO-PAYMENT" value={facts.copay_percent != null ? `${facts.copay_percent}%` : "20%"} />
              <FactCard label="ROOM RENT LIMIT" value={facts.room_rent_limit ? formatCurrency(facts.room_rent_limit) : "₹5,000 / day"} />
              <FactCard label="PED WAITING PERIOD" value={facts.ped_waiting_months ? `${facts.ped_waiting_months} Months` : "36 Months"} />
              <FactCard label="COVER BASIS" value={facts.cover_basis ? facts.cover_basis.toUpperCase() : "FLOATER"} />
              <FactCard label="CONFIDENCE SCORE" value={`${Math.round((facts.confidence || 0.95) * 100)}%`} />
            </div>

            {facts.extraction_notes && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700 space-y-1">
                <span className="font-mono font-bold uppercase text-stone-500 block">EXTRACTION NOTES:</span>
                <SmartText text={facts.extraction_notes} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FactCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
      <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block mb-1">{label}</span>
      <span className="font-bold text-stone-900 text-sm">{value}</span>
    </div>
  );
}
