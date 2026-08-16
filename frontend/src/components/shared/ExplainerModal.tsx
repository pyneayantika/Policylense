"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useExplainer } from "@/context/ExplainerContext";
import { usePolicies } from "@/context/PolicyContext";
import { getConcept } from "@/lib/concepts";
import { formatCurrency } from "@/lib/utils";
import { X, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";

export function ExplainerModal() {
  const { conceptId, close, open } = useExplainer();
  const { factsByPolicy } = usePolicies();
  const [picked, setPicked] = useState<number | null>(null);

  const concept = conceptId ? getConcept(conceptId) : undefined;
  const facts = Object.values(factsByPolicy)[0];

  useEffect(() => {
    setPicked(null);
  }, [conceptId]);

  const personalized = useMemo(() => {
    if (!concept) return "";
    const copay = facts?.copay_percent ?? 20;
    const si = facts?.sum_insured ?? 500000;
    
    if (concept.id === "copay") {
      const share = Math.round(si * (copay / 100));
      return `Your HDFC Ergo policy includes a ${copay}% co-payment. On a ₹${Math.round(si).toLocaleString("en-IN")} admissible claim, Rajesh Sharma pays ${formatCurrency(share)} out of pocket, and the insurer covers up to ${formatCurrency(si - share)}.`;
    }
    if (concept.id === "sum_insured") {
      return `Your active policy sum insured is ${formatCurrency(si)}. This is the maximum annual ceiling. Any hospital charges exceeding ${formatCurrency(si)} must be paid directly by the family.`;
    }
    if (concept.id === "waiting_period") {
      const months = facts?.ped_waiting_months ?? 36;
      return `A Pre-Existing Disease (PED) waiting period of ${months} months applies. Hospitalizations related to pre-existing conditions will be excluded until this moratorium elapses.`;
    }
    if (concept.id === "room_rent_limit") {
      return `Your HDFC Ergo policy limits room rent to ₹5,000/day. Private hospital rooms in Mumbai average ₹8,000–12,000/day. Choosing a ₹10,000 room means exceeding the limit by 100%.`;
    }
    if (concept.id === "sub_limit") {
      return `Even with a ${formatCurrency(si)} sum insured, specific procedures like cataract or knee replacement carry internal sub-limits (e.g. ₹40,000 cap).`;
    }
    if (concept.id === "proportionate_deduction") {
      return `When you exceed the ₹5,000/day room rent limit, HDFC Ergo applies proportionate deduction to ALL associated charges — surgeon fees, ICU, medicines — reducing overall payout.`;
    }
    return concept.one_line;
  }, [concept, facts]);

  if (!concept) return null;

  const difficultyDots = concept.group === "Cost Sharing" ? "●●●●○" : concept.group === "Conditions" ? "●●●○○" : "●●○○○";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-xs p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-stone-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
        
        {/* Modal Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a6b5a] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {concept.group || "Insurance Concept"}
              </span>
              <span className="text-xs font-mono text-stone-500">Difficulty {difficultyDots}</span>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <span>💡 {concept.title}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Definition */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-900 leading-relaxed">
            {concept.one_line}
          </p>

          {/* 2. Common Misconception Callout */}
          {concept.misconception && (
            <div className="rounded-xl border border-amber-300/80 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-900">
                <AlertTriangle size={14} className="text-amber-600" />
                ⚠️ Common Misconception:
              </span>
              <p className="leading-relaxed pl-5">{concept.misconception}</p>
            </div>
          )}

          {/* 3. In Your Policy Section */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5 text-xs">
            <span className="font-mono font-bold text-[#1a6b5a] uppercase tracking-wider block">
              IN YOUR POLICY:
            </span>
            <p className="text-stone-800 leading-relaxed font-medium">
              {personalized}
            </p>
          </div>

          {/* 4. Impact Visualization / Shock Comparison */}
          {concept.visual && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-stone-600 block">
                Impact Visualization (Shock Comparison)
              </span>
              <div className="h-40 w-full">
                <ConceptVisual
                  kind={concept.visual}
                  copay={facts?.copay_percent ?? 20}
                  si={facts?.sum_insured ?? 500000}
                  room={facts?.room_rent_limit ?? 5000}
                />
              </div>
            </div>
          )}

          {/* 5. Quick Check Quiz */}
          {concept.check && (
            <div className="rounded-xl border border-stone-300 bg-stone-50/80 p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <HelpCircle size={16} className="text-[#1a6b5a]" />
                <span>Quick Check ✓</span>
              </div>
              <p className="text-xs font-medium text-stone-800">{concept.check.question}</p>

              <div className="space-y-2">
                {concept.check.options.map((opt, idx) => {
                  const selected = picked === idx;
                  let styleClass = "border-stone-200 bg-white text-stone-800 hover:border-stone-400";
                  if (selected && opt.correct) {
                    styleClass = "border-emerald-500 bg-emerald-100 text-[#1a6b5a] font-bold shadow-2xs";
                  } else if (selected && !opt.correct) {
                    styleClass = "border-red-400 bg-red-50 text-red-700 font-bold";
                  }

                  return (
                    <button
                      key={opt.text}
                      type="button"
                      onClick={() => setPicked(idx)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${styleClass}`}
                    >
                      <span>{opt.text}</span>
                      {selected && opt.correct && (
                        <CheckCircle2 size={16} className="text-[#1a6b5a] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="rounded-lg bg-emerald-100/80 p-3 text-xs text-[#1a6b5a] font-medium border border-emerald-300">
                  {concept.check.options[picked].correct
                    ? "Correct! When you exceed room rent limits, the insurer applies proportionate deduction to ALL charges — surgery, medicines, ICU, everything."
                    : "This term is often misunderstood! Tap Option B to see why proportionate deduction applies."}
                </div>
              )}
            </div>
          )}

          {/* 6. Related Concepts */}
          <div className="pt-2">
            <span className="text-[11px] font-mono font-bold text-stone-500 uppercase block mb-2">
              Related Concepts:
            </span>
            <div className="flex flex-wrap gap-2">
              {related(concept.id).map((relId) => {
                const rel = getConcept(relId);
                if (!rel) return null;
                return (
                  <button
                    key={relId}
                    type="button"
                    onClick={() => {
                      setPicked(null);
                      open(relId);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-800 hover:border-[#1a6b5a] hover:text-[#1a6b5a] transition-all shadow-2xs"
                  >
                    <span>{rel.title}</span>
                    <ArrowRight size={12} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action */}
        <div className="mt-6 border-t border-stone-200 pt-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-[#1a1a1a] px-6 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
          >
            Close Explainer
          </button>
        </div>
      </div>
    </div>
  );
}

function related(id: string): string[] {
  const map: Record<string, string[]> = {
    copay: ["sum_insured", "deductible"],
    sum_insured: ["copay", "sub_limit"],
    sub_limit: ["sum_insured", "room_rent_limit"],
    waiting_period: ["exclusion", "sum_insured"],
    room_rent_limit: ["proportionate_deduction", "sub_limit"],
    proportionate_deduction: ["room_rent_limit", "copay"],
  };
  return map[id] || ["copay", "sub_limit"];
}

function ConceptVisual({
  kind,
}: {
  kind: string;
  copay?: number;
  si?: number;
  room?: number;
}) {

  if (kind === "shock_comparison" || kind === "split_bar") {
    const data = [
      { name: "Expected Payout", value: 500000 },
      { name: "Actual Payout", value: 310000 },
    ];
    return (
      <div className="flex flex-col h-full justify-between pt-1">
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#444" }} />
            <YAxis hide />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between items-center px-4 py-1 text-xs font-bold bg-red-100 rounded-lg text-red-700 border border-red-200">
          <span>Expected: ₹5.0L → Actual: ₹3.1L</span>
          <span>₹1.9L Gap from pocket</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-around px-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-[#1a6b5a]">
      <div className="text-center">
        <span className="text-lg font-bold block text-[#1a6b5a]">₹5,00,000</span>
        <span className="text-[10px] text-stone-500">Policy Sum Insured</span>
      </div>
      <div className="text-center">
        <span className="text-lg font-bold block text-amber-700">₹5,000/day</span>
        <span className="text-[10px] text-stone-500">Room Rent Limit</span>
      </div>
    </div>
  );
}
