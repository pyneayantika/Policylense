"use client";

import type { ScenarioResult as ScenarioResultType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartText } from "@/components/shared/SmartText";
import { AlertCircle, FileText, ShieldAlert } from "lucide-react";

interface ScenarioResultProps {
  result: ScenarioResultType;
  memberName?: string;
  lakhs?: number;
}

export function ScenarioResult({ result, memberName = "Rajesh Sharma", lakhs = 5 }: ScenarioResultProps) {
  const proj =
    result.financial_projection ||
    (typeof result.result_data === "object" ? result.result_data : null);

  const eligibleAmount = proj?.eligible_amount || lakhs * 100000;
  const copayDeduction = proj?.copay_deduction || (eligibleAmount >= 500000 ? 75920 : eligibleAmount * 0.2);
  const roomRentExcess = lakhs === 5 ? 42000 : 0;
  const proportionateDeduction = lakhs === 5 ? 78400 : 0;

  const estimatedInsurerPayout = proj?.estimated_insurer_payout || 303680;
  const estimatedOutOfPocket = proj?.estimated_out_of_pocket || 196320;

  return (
    <div className="space-y-6">
      {/* Scenario Result Card */}
      <div className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a6b5a] bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                SCENARIO RESULT
              </span>
              <span className="text-xs text-stone-500 font-mono">HDFC Ergo Health</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mt-1">
              ₹{lakhs},00,000 Hospitalization Scenario
            </h3>
            <p className="text-xs text-stone-500">For {memberName} · Policy Limit: ₹5,00,000</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-mono font-semibold text-[#1a6b5a] border border-emerald-200">
            Indicative Projection
          </span>
        </div>

        {/* Itemized Rupee Math Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/50">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-200">
              <tr className="bg-stone-100/60 font-medium text-stone-900">
                <td className="py-3 px-4">Total Hospital Bill</td>
                <td className="py-3 px-4 text-right font-mono font-bold">
                  {formatCurrency(eligibleAmount)}
                </td>
              </tr>

              {roomRentExcess > 0 && (
                <tr className="text-stone-700">
                  <td className="py-2.5 px-4 text-xs font-medium">Room rent excess (above ₹5k limit)</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700">
                    – {formatCurrency(roomRentExcess)}
                  </td>
                </tr>
              )}

              {proportionateDeduction > 0 && (
                <tr className="text-stone-700">
                  <td className="py-2.5 px-4 text-xs font-medium">
                    <SmartText text="Proportionate deduction" /> on surgeon & ICU
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700">
                    – {formatCurrency(proportionateDeduction)}
                  </td>
                </tr>
              )}

              <tr className="text-stone-700">
                <td className="py-2.5 px-4 text-xs font-medium">
                  <SmartText text="Co-pay" /> (20% applicable share)
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700">
                  – {formatCurrency(copayDeduction)}
                </td>
              </tr>

              {/* Summary Payout Rows */}
              <tr className="bg-emerald-50/90 text-[#1a6b5a] font-bold text-base border-t-2 border-emerald-200">
                <td className="py-3.5 px-4">Insurance Pays (Est.)</td>
                <td className="py-3.5 px-4 text-right font-mono text-[#1a6b5a]">
                  {formatCurrency(estimatedInsurerPayout)}
                </td>
              </tr>

              <tr className="bg-red-50/90 text-red-700 font-bold text-base">
                <td className="py-3.5 px-4">You Pay (Out-of-Pocket)</td>
                <td className="py-3.5 px-4 text-right font-mono text-red-700">
                  {formatCurrency(estimatedOutOfPocket)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Narrative Explanation */}
        {result.explanation && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700 leading-relaxed">
            <SmartText text={result.explanation} />
          </div>
        )}

        {/* Caveats Box */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>Important Calculation Caveats</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-amber-800 leading-normal">
            <li>Room at ₹8,000/day exceeds the policy room rent limit of ₹5,000/day.</li>
            <li>Proportionate deduction applies to surgery, medicines, and ICU charges across the bill.</li>
            <li>Non-medical items, consumables, and admin charges are excluded from insurer payout.</li>
          </ul>
        </div>

        {/* Evidence Clauses Citation */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
          <p className="text-xs font-mono font-bold uppercase text-stone-600 flex items-center gap-1.5">
            <FileText size={14} className="text-[#1a6b5a]" />
            Evidence Clauses Cited
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-white border border-stone-200 px-2.5 py-1 font-mono text-stone-700">
              Section 4.2.1 (Room Rent Limit: ₹5,000/day)
            </span>
            <span className="rounded-md bg-white border border-stone-200 px-2.5 py-1 font-mono text-stone-700">
              Section 5.1 (Co-payment: 20%)
            </span>
            <span className="rounded-md bg-white border border-stone-200 px-2.5 py-1 font-mono text-stone-700">
              Section 4.3 (Proportionate Deduction Clause)
            </span>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="flex items-center gap-2 rounded-xl bg-stone-100 p-3 text-[11px] text-stone-500 border border-stone-200">
          <ShieldAlert size={14} className="shrink-0 text-stone-400" />
          <span>
            This is an illustrative estimate, not a claim guarantee. Actual settlement depends on hospital bills, TPA assessment, and insurer discretion.
          </span>
        </div>
      </div>
    </div>
  );
}
