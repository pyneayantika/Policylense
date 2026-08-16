/**
 * Indian-style display helpers.
 * WHY: the rules engine emits raw numbers; the UI must format them, not the LLM.
 */

export function formatCurrency(amount: number): string {
  const n = Math.round(amount);
  const sign = n < 0 ? "-" : "";
  const s = String(Math.abs(n));
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 0) {
    groups.push(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  return `${sign}₹${groups.reverse().join(",")},${last3}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "warning":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

export function protectionStatusIcon(status: string): string {
  switch (status) {
    case "strong":
      return "🟢";
    case "moderate":
      return "🟡";
    case "gap_detected":
      return "🔴";
    default:
      return "⚪";
  }
}
