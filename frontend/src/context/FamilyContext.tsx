"use client";

/**
 * Family + members in session, persisted so refresh keeps the household.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addMember as apiAddMember, createFamily, getFamily, resetAll as apiResetAll } from "@/lib/api";
import type { Family, FamilyMember } from "@/lib/types";

const STORAGE_KEY = "pi_family_id";

interface FamilyContextValue {
  family: Family | null;
  members: FamilyMember[];
  setFamily: (family: Family | null) => void;
  addMember: (member: FamilyMember) => void;
  registerFamily: (name: string) => Promise<Family>;
  registerMember: (input: {
    name: string;
    relationship: string;
    age: number | null;
    city: string | null;
    annual_income?: number | null;
  }) => Promise<FamilyMember>;
  resetSession: () => Promise<void>;
  isSetupComplete: boolean;
  loading: boolean;
  error: string | null;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamilyState] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setFamily = useCallback((next: Family | null) => {
    setFamilyState(next);
    if (next) localStorage.setItem(STORAGE_KEY, next.id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setLoading(false);
      return;
    }
    getFamily(id)
      .then((res) => {
        setFamilyState(res.family);
        setMembers(res.members);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const addMember = useCallback((member: FamilyMember) => {
    setMembers((prev) => [...prev, member]);
  }, []);

  const registerFamily = useCallback(async (name: string) => {
    setError(null);
    try {
      const created = await createFamily(name);
      setFamily(created);
      setMembers([]);
      return created;
    } catch {
      const localFamily: Family = {
        id: `fam_${Date.now()}`,
        name,
        created_at: new Date().toISOString(),
      };
      setFamily(localFamily);
      setMembers([]);
      return localFamily;
    }
  }, [setFamily]);

  const registerMember = useCallback(
    async (input: {
      name: string;
      relationship: string;
      age: number | null;
      city: string | null;
      annual_income?: number | null;
    }) => {
      if (!family) throw new Error("Create a family first");
      setError(null);
      try {
        const member = await apiAddMember(family.id, {
          name: input.name,
          relationship: input.relationship,
          age: input.age,
          city: input.city,
          known_conditions: null,
          annual_income: input.annual_income ?? null,
        });
        addMember(member);
        return member;
      } catch {
        const localMember: FamilyMember = {
          id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          family_id: family.id,
          name: input.name,
          relationship: input.relationship,
          age: input.age,
          city: input.city,
          known_conditions: null,
          annual_income: input.annual_income ?? null,
          created_at: new Date().toISOString(),
        };
        addMember(localMember);
        return localMember;
      }
    },
    [family, addMember]
  );

  const resetSession = useCallback(async () => {
    setError(null);
    try {
      await apiResetAll();
    } catch {
      // clear client state even if backend is unreachable
    }
    setFamilyState(null);
    setMembers([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      family,
      members,
      setFamily,
      addMember,
      registerFamily,
      registerMember,
      resetSession,
      isSetupComplete: Boolean(family && members.length > 0),
      loading,
      error,
    }),
    [
      family,
      members,
      setFamily,
      addMember,
      registerFamily,
      registerMember,
      resetSession,
      loading,
      error,
    ]
  );

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within FamilyProvider");
  return ctx;
}
