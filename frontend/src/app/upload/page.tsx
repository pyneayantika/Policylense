"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { usePolicies } from "@/context/PolicyContext";
import { useProtection } from "@/context/ProtectionContext";
import { PolicyUploader } from "@/components/upload/PolicyUploader";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { ApiError, getFamily as apiFetchFamily, getPolicyStatus } from "@/lib/api";
import { FileText, CheckCircle2, ArrowRight, Sparkles, Home, Clock, AlertCircle } from "lucide-react";
import type { Policy } from "@/lib/types";

function PolicyCard({ policy, memberName }: { policy: Policy; memberName?: string }) {
  const status = policy.ingestion_status;
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  const borderColor = isFailed
    ? "border-red-200 dark:border-red-800"
    : isComplete
    ? "border-emerald-200 dark:border-emerald-800"
    : "border-amber-200 dark:border-amber-800";
  const bgColor = isFailed
    ? "bg-red-50/40 dark:bg-red-900/20"
    : isComplete
    ? "bg-white dark:bg-zinc-800"
    : "bg-amber-50/40 dark:bg-amber-900/20";
  const iconBg = isFailed
    ? "bg-red-100 text-red-700"
    : isComplete
    ? "bg-emerald-100 text-[#1a6b5a]"
    : "bg-amber-100 text-amber-800";

  const typeLabel = (policy.policy_type || "insurance").replace(/_/g, " ");
  const displayType = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1) + " Insurance";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${borderColor} ${bgColor} p-4 shadow-2xs`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <FileText size={20} />
        </div>
        <div>
          <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">
            {policy.pdf_filename || "Policy document"}
          </p>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            {[displayType, memberName].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {isFailed ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-mono font-bold text-red-700">
          <AlertCircle size={14} /> Failed
        </span>
      ) : isComplete ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono font-bold text-[#1a6b5a]">
          <CheckCircle2 size={14} /> Complete
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-mono font-bold text-amber-800">
          <Clock size={14} className="animate-spin" /> Processing
        </span>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const { family, members, isSetupComplete, loading } = useFamily();
  const { policies, ingestFile, loadFacts, hydratePolicies } = usePolicies();
  const { refresh } = useProtection();

  const [step, setStep] = useState(-1);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !isSetupComplete && !family) {
      router.replace("/");
    }
  }, [loading, isSetupComplete, family, router]);

  useEffect(() => {
    return () => { if (poller.current) clearInterval(poller.current); };
  }, []);

  useEffect(() => {
    if (!family) return;
    apiFetchFamily(family.id)
      .then((res) => {
        if (res.policies && res.policies.length > 0) {
          hydratePolicies(res.policies);
        }
      })
      .catch(() => {});
  }, [family, hydratePolicies]);

  const memberNameById = Object.fromEntries(
    members.map((m) => [m.id, m.name])
  );

  function statusToStep(status: string): number {
    switch (status) {
      case "uploaded":
      case "extracting":
        return 0;
      case "cleaning":
      case "detecting_sections":
      case "chunking":
        return 1;
      case "embedding":
      case "extracting_facts":
        return 2;
      case "evaluating_rules":
        return 3;
      case "completed":
        return 4;
      default:
        return 0;
    }
  }

  function startPolling(policyId: string) {
    setFailed(false);
    setError(null);
    setStep(0);
    if (poller.current) clearInterval(poller.current);
    poller.current = setInterval(async () => {
      try {
        const res = await getPolicyStatus(policyId);
        if (res.status === "failed") {
          stopPolling(-1);
          setFailed(true);
          setError(res.error || "Ingestion failed");
          return;
        }
        setStep(statusToStep(res.status));
        if (res.status === "completed") {
          stopPolling(5);
          await loadFacts(policyId);
          if (family) {
            await refresh(family.id);
            const res = await apiFetchFamily(family.id);
            if (res.policies) hydratePolicies(res.policies);
          }
        }
      } catch {
        // keep polling on transient network errors
      }
    }, 1000);
  }

  function stopPolling(next: number) {
    if (poller.current) clearInterval(poller.current);
    poller.current = null;
    setStep(next);
  }

  // Pre-loaded sample demo policies shortcut
  async function loadDemoPolicies() {
    setFailed(false);
    setError(null);
    setStep(0);
    setTimeout(async () => {
      stopPolling(5);
      if (family) {
        await refresh(family.id);
      }
    }, 3000);
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 border-b border-stone-300/80 dark:border-zinc-700 pb-5">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-semibold text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back
          </Link>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1a6b5a] bg-emerald-100/80 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            Step 2 of 3
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          Upload Policies
        </h1>
        <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
          Upload your insurance policy PDFs. We&apos;ll extract and analyze the coverage details automatically.
        </p>
      </div>

      {/* Main Upload Form */}
      {family && members.length > 0 ? (
        <PolicyUploader
          members={members}
          onUpload={async (file, memberId, policyType) => {
            try {
              const policy = await ingestFile(family.id, file, memberId, policyType);
              if (policy.ingestion_status === "failed") {
                setStep(-1);
                setFailed(true);
                setError(policy.ingestion_error || "Ingestion failed");
                return;
              }
              startPolling(policy.id);
            } catch (err) {
              setStep(-1);
              setFailed(true);
              setError(err instanceof ApiError ? err.message : "Upload failed");
            }
          }}
        />
      ) : null}

      {/* Live Upload Progress */}
      <UploadProgress step={step} failed={failed} error={error} />

      {/* Uploaded Policy Cards — driven by real data */}
      {policies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Uploaded Policy Documents</h2>
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              memberName={policy.member_id ? memberNameById[policy.member_id] : undefined}
            />
          ))}
        </div>
      )}

      {/* Demo Pre-loader Shortcut & View Dashboard CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-300/80 dark:border-zinc-700">
        <button
          type="button"
          onClick={loadDemoPolicies}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2.5 text-xs font-semibold text-[#1a6b5a] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <Sparkles size={16} />
          Pre-load Sharma Family Policies (HDFC Ergo + Max Life)
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] dark:bg-zinc-100 px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 shadow-md hover:bg-black dark:hover:bg-zinc-200 transition-all"
        >
          <Home size={16} />
          <span>View Dashboard</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
