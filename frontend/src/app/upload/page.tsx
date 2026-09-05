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
import { FileText, CheckCircle2, ArrowRight, Sparkles, Home, Clock, AlertCircle, Upload } from "lucide-react";
import type { Policy } from "@/lib/types";

function PolicyCard({ policy, memberName }: { policy: Policy; memberName?: string }) {
  const status = policy.ingestion_status;
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  const typeLabel = (policy.policy_type || "insurance").replace(/_/g, " ");
  const displayType = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1) + " Insurance";

  return (
    <div className={`card-elevated flex flex-wrap items-center justify-between gap-3 p-4 ${
      isFailed ? "!border-red-200 dark:!border-red-900/50" : ""
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isFailed
            ? "bg-red-50 dark:bg-red-950/30 text-red-600"
            : isComplete
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-[#1a6b5a]"
            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700"
        }`}>
          <FileText size={20} />
        </div>
        <div>
          <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">
            {policy.pdf_filename || "Policy document"}
          </p>
          <p className="text-xs text-stone-400 dark:text-zinc-500">
            {[displayType, memberName].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {isFailed ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/50">
          <AlertCircle size={13} /> Failed
        </span>
      ) : isComplete ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
          <CheckCircle2 size={13} /> Complete
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
          <Clock size={13} className="animate-spin" /> Processing
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
      case "validating_content":
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
          // Refresh the list so the card shows "Failed" instead of a stuck "Processing".
          if (family) {
            try {
              const fam = await apiFetchFamily(family.id);
              if (fam.policies) hydratePolicies(fam.policies);
            } catch {
              /* card badge is cosmetic; the error banner already explains */
            }
          }
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/"
              className="text-xs font-medium text-emerald-200/70 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold">
              <Upload size={12} />
              Step 2 of 3
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Upload Policies
          </h1>
          <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed max-w-lg">
            Upload your insurance policy PDFs. We&apos;ll extract and analyze the coverage details automatically.
          </p>
        </div>
      </div>

      {/* Uploader */}
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

      <UploadProgress step={step} failed={failed} error={error} />

      {/* Uploaded Policy Cards */}
      {policies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Uploaded Policy Documents</h2>
          <div className="space-y-3">
            {policies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                memberName={policy.member_id ? memberNameById[policy.member_id] : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* CTA Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-200/60 dark:border-zinc-800">
        <button
          type="button"
          onClick={loadDemoPolicies}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-[#1a6b5a] dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50 transition-all"
        >
          <Sparkles size={14} />
          Pre-load Sharma Family Policies (HDFC Ergo + Max Life)
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-zinc-100 px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg shadow-stone-900/20 hover:shadow-xl hover:bg-stone-800 dark:hover:bg-zinc-200 transition-all"
        >
          <Home size={16} />
          <span>View Dashboard</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
