"use client";

import { useCallback, useState } from "react";
import type { FamilyMember } from "@/lib/types";
import { UploadCloud, Shield, HeartPulse, FileText } from "lucide-react";

interface PolicyUploaderProps {
  members: FamilyMember[];
  disabled?: boolean;
  onUpload: (file: File, memberId: string, policyType: string) => Promise<void>;
}

export function PolicyUploader({ members, disabled, onUpload }: PolicyUploaderProps) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [memberId, setMemberId] = useState(members[0]?.id || "");
  const [policyType, setPolicyType] = useState<"health" | "life">("health");
  const [busy, setBusy] = useState(false);

  const pick = useCallback((next: File | null) => {
    if (next && next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a digitally generated PDF.");
      return;
    }
    setFile(next);
  }, []);

  async function submit() {
    if (!file || !memberId) return;
    setBusy(true);
    try {
      await onUpload(file, memberId, policyType);
    } finally {
      setBusy(false);
    }
  }

  const activeMember = members.find((m) => m.id === memberId) || members[0];
  const memberInitials = activeMember
    ? activeMember.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "RS";

  return (
    <div className="space-y-6 card-elevated p-6">
      {/* Member Selector */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2">
          For Member
        </label>
        <div className="relative">
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-[#1a6b5a]/30 dark:border-emerald-700/40 bg-emerald-50/20 dark:bg-zinc-800 px-4 py-3 pl-12 text-sm font-semibold text-stone-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 focus:border-[#1a6b5a]"
          >
            {members.map((m) => {
              const init = m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <option key={m.id} value={m.id}>
                  {init} · {m.name} ({m.relationship})
                </option>
              );
            })}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg gradient-hero font-mono text-[10px] font-bold text-emerald-300">
            {memberInitials}
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2">
          Policy Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPolicyType("health")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
              policyType === "health"
                ? "gradient-brand text-white shadow-md shadow-emerald-900/20"
                : "border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-700 hover:border-stone-300"
            }`}
          >
            <HeartPulse size={18} className={policyType === "health" ? "text-emerald-200" : ""} />
            <span>Health Insurance</span>
          </button>

          <button
            type="button"
            onClick={() => setPolicyType("life")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
              policyType === "life"
                ? "gradient-brand text-white shadow-md shadow-emerald-900/20"
                : "border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-700 hover:border-stone-300"
            }`}
          >
            <Shield size={18} className={policyType === "life" ? "text-emerald-200" : ""} />
            <span>Life Insurance</span>
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0] || null);
        }}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          drag
            ? "border-[#1a6b5a] bg-emerald-50/60 dark:bg-emerald-950/20 scale-[1.01]"
            : file
            ? "border-emerald-300/80 dark:border-emerald-700/50 bg-emerald-50/20 dark:bg-emerald-950/10"
            : "border-stone-300/80 dark:border-zinc-700 bg-stone-50/30 dark:bg-zinc-800/50 hover:bg-stone-100/50 dark:hover:bg-zinc-800 hover:border-stone-400/60"
        }`}
      >
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 transition-colors ${
          file ? "bg-emerald-100 dark:bg-emerald-950/40 text-[#1a6b5a]" : "bg-stone-100 dark:bg-zinc-700 text-stone-400 dark:text-zinc-500"
        }`}>
          <UploadCloud size={28} />
        </div>
        <p className="text-sm font-bold text-stone-900 dark:text-zinc-100">
          {file ? "File selected" : "Drop PDF here"}
        </p>
        <p className="mt-1 text-xs text-stone-400 dark:text-zinc-500">
          or tap to browse · Max 10MB (Digitally generated English PDFs)
        </p>

        <label className="mt-5 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-zinc-200 px-5 py-2.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-md hover:bg-stone-800 dark:hover:bg-zinc-300 transition-all">
          Browse Files
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] || null)}
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-xs font-medium text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
            <FileText size={14} />
            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="button"
        disabled={disabled || busy || !file || !memberId}
        onClick={submit}
        className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 hover:shadow-lg disabled:opacity-50 transition-all"
      >
        {busy ? "Analyzing Policy Structure..." : "Upload & Extract Policy"}
      </button>
    </div>
  );
}
