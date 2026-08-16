"use client";

interface ScoreBreakdownProps {
  breakdown: Record<string, number>;
}

const LABELS: Record<string, string> = {
  health_coverage_exists: "Health Cover Existence",
  life_coverage_exists: "Life Cover for Earners",
  sum_insured_adequacy: "Sum Insured Adequacy",
  low_copay_exposure: "Low Co-Pay Exposure",
  no_active_waiting_periods: "Waiting Period Status",
  low_sublimit_risk: "Sub-Limit Protection",
  claim_readiness: "Claim Readiness",
};

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  // Provide default mock breakdown if empty for demo presentation
  const data = Object.keys(breakdown).length > 0 ? breakdown : {
    health_coverage_exists: 85,
    life_coverage_exists: 40,
    sum_insured_adequacy: 60,
    low_copay_exposure: 50,
    no_active_waiting_periods: 70,
    low_sublimit_risk: 45,
  };

  const entries = Object.entries(data);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="text-sm font-bold text-stone-900">Score Dimension Breakdown</h3>
        <span className="text-xs font-mono text-stone-500">6 Indicators</span>
      </div>

      <ul className="space-y-3">
        {entries.map(([key, value]) => {
          const clamped = Math.max(0, Math.min(100, Math.round(value)));
          let barColor = "bg-[#1a6b5a]";
          if (clamped < 50) barColor = "bg-red-500";
          else if (clamped < 70) barColor = "bg-amber-500";

          return (
            <li key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-stone-700">
                <span>{LABELS[key] || key.replace(/_/g, " ")}</span>
                <span className="font-mono font-bold">{clamped} / 100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
