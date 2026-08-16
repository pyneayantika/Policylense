"use client";

import type { EvidenceClause } from "@/lib/types";
import { SmartText } from "@/components/shared/SmartText";

interface EvidenceCardProps {
  evidence: EvidenceClause;
  index: number;
}

export function EvidenceCard({ evidence, index }: EvidenceCardProps) {
  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="mb-1 font-medium text-slate-700">
        Evidence {index}
        {evidence.section ? ` · ${evidence.section}` : ""}
        {evidence.clause ? ` · Clause ${evidence.clause}` : ""}
      </p>
      <SmartText text={evidence.text} />
    </div>
  );
}
