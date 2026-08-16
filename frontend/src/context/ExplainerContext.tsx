"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ExplainerContextValue {
  conceptId: string | null;
  open: (conceptId: string) => void;
  close: () => void;
}

const ExplainerContext = createContext<ExplainerContextValue | undefined>(
  undefined
);

export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [conceptId, setConceptId] = useState<string | null>(null);
  const open = useCallback((id: string) => setConceptId(id), []);
  const close = useCallback(() => setConceptId(null), []);
  const value = useMemo(
    () => ({ conceptId, open, close }),
    [conceptId, open, close]
  );
  return (
    <ExplainerContext.Provider value={value}>
      {children}
    </ExplainerContext.Provider>
  );
}

export function useExplainer() {
  const ctx = useContext(ExplainerContext);
  if (!ctx) throw new Error("useExplainer must be used within ExplainerProvider");
  return ctx;
}
