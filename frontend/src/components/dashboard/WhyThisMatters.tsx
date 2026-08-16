"use client";

import type { ProtectionFlag } from "@/lib/types";
import { SmartText } from "@/components/shared/SmartText";
import { HelpCircle } from "lucide-react";

const COPY: Record<string, string> = {
  no_life_cover:
    "Without life cover, the family would lose financial support if an earning spouse were no longer able to contribute. At age 38, term insurance premiums remain highly affordable.",
  room_rent_limit:
    "Exceeding the room rent limit triggers proportionate deduction on ALL charges — not just the room. A ₹5L bill could pay out only ₹3.1L.",
  copay_exposure:
    "A 20% co-payment means you share every admissible claim. On a ₹5L hospitalization, you owe ₹1,00,000 out-of-pocket in addition to room rent excess.",
  no_health_cover:
    "Without health insurance, medical emergencies must be funded entirely from personal savings or debt, risking long-term financial continuity.",
  si_below_benchmark:
    "Current sum insured sits below recommended benchmarks for city tier and age band, leaving potential high out-of-pocket exposure in tertiary care hospitalizations.",
  waiting_period_risk:
    "Pre-existing condition waiting period is currently active. Claims related to past medical conditions will not be admissible until this moratorium elapses.",
};

interface WhyThisMattersProps {
  flag: ProtectionFlag;
}

export function WhyThisMatters({ flag }: WhyThisMattersProps) {
  const text =
    COPY[flag.flag_type] ||
    "Exceeding limits or missing coverage can trigger out-of-pocket expenses during claims. Tap highlighted terms to see personalized calculations.";

  return (
    <div className="rounded-xl border border-stone-200/80 dark:border-zinc-700 bg-stone-100/70 dark:bg-zinc-800/50 p-3.5 text-xs text-stone-700 dark:text-zinc-300 space-y-1">
      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-zinc-100">
        <HelpCircle size={14} className="text-[#1a6b5a]" />
        <span>Why This Matters:</span>
      </div>
      <div className="text-stone-600 dark:text-zinc-400 leading-relaxed pl-5">
        <SmartText text={text} />
      </div>
    </div>
  );
}
