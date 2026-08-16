"use client";

interface ConfidenceBadgeProps {
  level: "high" | "medium" | "low" | string;
}

const TONE: Record<string, string> = {
  high: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-red-50 text-red-700 border-red-200",
};

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const tone = TONE[level] || "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {level} confidence
    </span>
  );
}
