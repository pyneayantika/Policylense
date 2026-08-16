"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ProtectionSummary } from "@/lib/types";

interface ProtectionScoreRingProps {
  score: number;
  familyName?: string;
  summary?: ProtectionSummary | null;
}

function formatLakhs(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(value % 10000000 === 0 ? 0 : 1)} Crore`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)} Lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function ProtectionScoreRing({ score, familyName, summary }: ProtectionScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const data = [
    { name: "score", value: clamped },
    { name: "rest", value: 100 - clamped },
  ];

  let strokeColor = "#f59e0b";
  let statusText = "Needs Attention";
  let statusBg = "bg-amber-400/20 text-amber-300 border-amber-500/40";

  if (clamped >= 75) {
    strokeColor = "#22c55e";
    statusText = "Strong Protection";
    statusBg = "bg-emerald-400/20 text-emerald-300 border-emerald-500/40";
  } else if (clamped < 50) {
    strokeColor = "#ef4444";
    statusText = "Critical Gaps Found";
    statusBg = "bg-red-400/20 text-red-300 border-red-500/40";
  }

  const policyCount = summary?.members?.length || 0;
  const flagCount = summary?.flags?.length || 0;

  const bestHealthSI = summary?.members
    ?.map((m) => m.health_cover?.sum_insured)
    .filter((v): v is number => v != null && v > 0)
    .reduce((a, b) => Math.max(a, b), 0) || null;

  const bestLifeSA = summary?.members
    ?.map((m) => m.life_cover?.sum_assured)
    .filter((v): v is number => v != null && v > 0)
    .reduce((a, b) => Math.max(a, b), 0) || null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2922] via-[#153e34] to-[#1a4a3a] p-6 text-white shadow-md border border-emerald-900/60">
      <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
            PROTECTION SCORE
          </span>
          <h3 className="text-lg font-bold text-white leading-snug">
            {familyName || "Your Family"}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold border ${statusBg}`}>
          <AlertTriangle size={12} />
          {statusText}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={44}
                outerRadius={60}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                <Cell fill={strokeColor} />
                <Cell fill="#1a3b32" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold font-mono tracking-tight" style={{ color: strokeColor }}>
              {clamped}
            </span>
            <span className="text-[10px] font-mono text-emerald-300/80 uppercase">out of 100</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="rounded-xl bg-[#0a1e18]/80 p-3 border border-emerald-900/80 text-xs space-y-1">
            <p className="font-semibold text-emerald-200 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              {policyCount} member{policyCount !== 1 ? "s" : ""} covered · {flagCount} gap{flagCount !== 1 ? "s" : ""} found
            </p>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              Health & life coverage evaluated against household liabilities & medical benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-emerald-950/50 p-2 border border-emerald-900/50">
              <span className="text-stone-400 block">Health SI</span>
              <span className="font-semibold text-emerald-300">{formatLakhs(bestHealthSI)}</span>
            </div>
            <div className="rounded-lg bg-emerald-950/50 p-2 border border-emerald-900/50">
              <span className="text-stone-400 block">Life Cover</span>
              <span className={`font-semibold ${bestLifeSA ? "text-emerald-300" : "text-amber-300"}`}>
                {formatLakhs(bestLifeSA)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
