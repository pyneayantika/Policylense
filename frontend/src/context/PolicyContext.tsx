"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPolicyFacts, uploadPolicy as apiUpload } from "@/lib/api";
import type { Policy, PolicyFacts } from "@/lib/types";

interface PolicyContextValue {
  policies: Policy[];
  factsByPolicy: Record<string, PolicyFacts>;
  uploadPolicy: (policy: Policy) => void;
  hydratePolicies: (loaded: Policy[]) => void;
  ingestFile: (
    familyId: string,
    file: File,
    memberId: string,
    policyType: string
  ) => Promise<Policy>;
  loadFacts: (policyId: string) => Promise<void>;
  ingestionStatus: Record<string, string>;
  setIngestionStatus: (policyId: string, status: string) => void;
}

const PolicyContext = createContext<PolicyContextValue | undefined>(undefined);

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [factsByPolicy, setFacts] = useState<Record<string, PolicyFacts>>({});
  const [ingestionStatus, setStatusMap] = useState<Record<string, string>>({});

  const uploadPolicy = useCallback((policy: Policy) => {
    setPolicies((prev) => {
      const rest = prev.filter((p) => p.id !== policy.id);
      return [...rest, policy];
    });
    setStatusMap((prev) => ({ ...prev, [policy.id]: policy.ingestion_status }));
  }, []);

  const hydratePolicies = useCallback((loaded: Policy[]) => {
    setPolicies(loaded);
    const statuses: Record<string, string> = {};
    for (const p of loaded) statuses[p.id] = p.ingestion_status;
    setStatusMap(statuses);
  }, []);

  const setIngestionStatus = useCallback((policyId: string, status: string) => {
    setStatusMap((prev) => ({ ...prev, [policyId]: status }));
  }, []);

  const ingestFile = useCallback(
    async (
      familyId: string,
      file: File,
      memberId: string,
      policyType: string
    ) => {
      const policy = await apiUpload(familyId, file, memberId, policyType);
      uploadPolicy(policy);
      return policy;
    },
    [uploadPolicy]
  );

  const loadFacts = useCallback(async (policyId: string) => {
    try {
      const facts = await getPolicyFacts(policyId);
      if (facts.policy_facts) {
        setFacts((prev) => ({ ...prev, [policyId]: facts.policy_facts as PolicyFacts }));
      }
    } catch {
      /* facts optional if ingestion still running */
    }
  }, []);

  const value = useMemo(
    () => ({
      policies,
      factsByPolicy,
      uploadPolicy,
      hydratePolicies,
      ingestFile,
      loadFacts,
      ingestionStatus,
      setIngestionStatus,
    }),
    [policies, factsByPolicy, uploadPolicy, hydratePolicies, ingestFile, loadFacts, ingestionStatus, setIngestionStatus]
  );

  return (
    <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>
  );
}

export function usePolicies() {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error("usePolicies must be used within PolicyProvider");
  return ctx;
}
