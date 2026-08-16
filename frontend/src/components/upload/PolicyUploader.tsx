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
    <div className="space-y-6 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
      {/* 1. Member Selector */}
      <div>
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-stone-600 dark:text-zinc-400 mb-2">
          FOR MEMBER
        </label>
        <div className="relative">
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-[#1a6b5a] dark:border-emerald-600 bg-emerald-50/30 dark:bg-zinc-700 px-4 py-3 pl-12 text-sm font-semibold text-stone-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/30"
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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f2922] font-mono text-xs font-bold text-emerald-300">
            {memberInitials}
          </div>
        </div>
      </div>

      {/* 2. Type Selector Tabs */}
      <div>
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-stone-600 dark:text-zinc-400 mb-2">
          POLICY TYPE
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPolicyType("health")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
              policyType === "health"
                ? "bg-[#1a6b5a] text-white shadow-sm ring-2 ring-[#1a6b5a]"
                : "border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-600"
            }`}
          >
            <HeartPulse size={18} className={policyType === "health" ? "text-emerald-200" : "text-stone-500 dark:text-zinc-400"} />
            <span>Health Insurance</span>
          </button>

          <button
            type="button"
            onClick={() => setPolicyType("life")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
              policyType === "life"
                ? "bg-[#1a6b5a] text-white shadow-sm ring-2 ring-[#1a6b5a]"
                : "border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-600"
            }`}
          >
            <Shield size={18} className={policyType === "life" ? "text-emerald-200" : "text-stone-500 dark:text-zinc-400"} />
            <span>Life Insurance</span>
          </button>
        </div>
      </div>

      {/* 3. Drag-Drop Zone */}
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
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          drag
            ? "border-[#1a6b5a] bg-emerald-50/60"
            : file
            ? "border-emerald-300 bg-emerald-50/20"
            : "border-stone-300 dark:border-zinc-600 bg-stone-50/50 dark:bg-zinc-700/30 hover:bg-stone-100/50 dark:hover:bg-zinc-700/50"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-zinc-700 text-[#1a6b5a] mb-3">
          <UploadCloud size={24} />
        </div>
        <p className="text-sm font-bold text-stone-900 dark:text-zinc-100">Drop PDF here</p>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
          or tap to browse · Max 10MB (Digitally generated English PDFs)
        </p>

        <label className="mt-4 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition-colors">
          Browse Files
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] || null)}
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-100/80 px-3 py-1.5 text-xs font-medium text-[#1a6b5a] border border-emerald-300">
            <FileText size={14} />
            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={disabled || busy || !file || !memberId}
        onClick={submit}
        className="w-full rounded-xl bg-[#1a6b5a] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#145447] disabled:opacity-50 transition-colors"
      >
        {busy ? "Analyzing Policy Structure..." : "Upload & Extract Policy"}
      </button>
    </div>
  );
}
