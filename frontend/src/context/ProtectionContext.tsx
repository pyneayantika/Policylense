"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProtectionSummary } from "@/lib/api";
import type { ProtectionFlag, ProtectionSummary } from "@/lib/types";

interface ProtectionContextValue {
  score: number | null;
  summary: ProtectionSummary | null;
  memberScores: Record<string, number>;
  flags: ProtectionFlag[];
  isLoading: boolean;
  refresh: (familyId: string) => Promise<void>;
}

const ProtectionContext = createContext<ProtectionContextValue | undefined>(
  undefined
);

export function ProtectionProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<ProtectionSummary | null>(null);
  const [memberScores, setMemberScores] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<ProtectionFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async (familyId: string) => {
    setIsLoading(true);
    try {
      const next = await getProtectionSummary(familyId);
      setSummary(next);
      setScore(next.overall_score);
      setFlags(next.flags);
      const mapped: Record<string, number> = {};
      for (const member of next.members) {
        mapped[member.member_id] =
          member.protection_status === "strong"
            ? 80
            : member.protection_status === "moderate"
              ? 55
              : 30;
      }
      setMemberScores(mapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ score, summary, memberScores, flags, isLoading, refresh }),
    [score, summary, memberScores, flags, isLoading, refresh]
  );

  return (
    <ProtectionContext.Provider value={value}>
      {children}
    </ProtectionContext.Provider>
  );
}

export function useProtection() {
  const ctx = useContext(ProtectionContext);
  if (!ctx) {
    throw new Error("useProtection must be used within ProtectionProvider");
  }
  return ctx;
}
