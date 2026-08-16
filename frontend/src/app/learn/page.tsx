"use client";

import { CONCEPTS, difficultyDots, type ConceptGroup } from "@/lib/concepts";
import { useExplainer } from "@/context/ExplainerContext";
import { BookOpen, ArrowRight } from "lucide-react";

const GROUPS: { name: ConceptGroup; accentClass: string; badgeBg: string; textClass: string }[] = [
  { name: "Coverage", accentClass: "border-l-4 border-emerald-500", badgeBg: "bg-emerald-100 text-[#1a6b5a]", textClass: "text-[#1a6b5a]" },
  { name: "Cost Sharing", accentClass: "border-l-4 border-amber-500", badgeBg: "bg-amber-100 text-amber-800", textClass: "text-amber-700" },
  { name: "Conditions", accentClass: "border-l-4 border-red-500", badgeBg: "bg-red-100 text-red-700", textClass: "text-red-700" },
  { name: "Process", accentClass: "border-l-4 border-blue-500", badgeBg: "bg-blue-100 text-blue-800", textClass: "text-blue-700" },
];

export default function LearnPage() {
  const { open } = useExplainer();

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 border-b border-stone-300/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1a6b5a] bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
            15 Concepts
          </span>
          <span className="text-xs text-stone-500 font-mono">• Contextual Comprehension Layer</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
          <BookOpen size={28} className="text-[#1a6b5a]" />
          Learn Insurance
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
          Understand every term in your policy, explained with YOUR numbers. Tap any concept for a personalized interactive explainer and quick quiz.
        </p>
      </div>

      {/* Concept Categories */}
      <div className="space-y-8">
        {GROUPS.map((g) => {
          const cards = CONCEPTS.filter((c) => c.group === g.name);
          return (
            <div key={g.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${g.textClass.replace("text-", "bg-")}`}></span>
                  {g.name} ({cards.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => open(c.id)}
                    className={`group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-2xs hover:shadow-md hover:border-stone-400 transition-all ${g.accentClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${g.badgeBg}`}>
                          {c.group}
                        </span>
                        <span className="text-xs font-mono text-amber-600 font-medium" title={`Difficulty ${c.difficulty}/5`}>
                          {difficultyDots(c.difficulty)}
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-900 text-base group-hover:text-[#1a6b5a] transition-colors leading-snug">
                        {c.title}
                      </h3>
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                        {c.one_line}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-[#1a6b5a] pt-3 border-t border-stone-100">
                      <span>Interactive Explainer</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
