"use client";

import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const STEPS = [
  "Extracting text...",
  "Analyzing coverage...",
  "Understanding terms...",
  "Detecting gaps...",
  "Complete!",
] as const;

interface UploadProgressProps {
  step: number;
  failed?: boolean;
  error?: string | null;
}

export function UploadProgress({ step, failed, error }: UploadProgressProps) {
  if (step < 0 && !failed) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
        <span>Analysis Progress</span>
        {step >= 4 && !failed && (
          <span className="text-xs font-mono font-semibold text-[#1a6b5a] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            COMPLETE
          </span>
        )}
      </h3>

      <ol className="space-y-3">
        {STEPS.map((label, i) => {
          const done = !failed && step > i;
          const current = !failed && step === i;

          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  failed && current
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : done
                    ? "bg-emerald-100 text-[#1a6b5a] border border-emerald-300"
                    : current
                    ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-[#1a6b5a]" />
                ) : current ? (
                  <Loader2 size={14} className="animate-spin text-amber-700" />
                ) : (
                  i + 1
                )}
              </span>

              <span
                className={`font-medium ${
                  done
                    ? "text-[#1a6b5a]"
                    : current
                    ? "text-amber-800 font-semibold"
                    : "text-stone-400"
                }`}
              >
                {done ? `✅ ${label}` : label}
              </span>
            </li>
          );
        })}
      </ol>

      {failed && error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
