"use client";

import type { ReactNode } from "react";
import { FamilyProvider } from "./FamilyContext";
import { PolicyProvider } from "./PolicyContext";
import { ProtectionProvider } from "./ProtectionContext";
import { ExplainerProvider } from "./ExplainerContext";
import { ExplainerModal } from "@/components/shared/ExplainerModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FamilyProvider>
      <PolicyProvider>
        <ProtectionProvider>
          <ExplainerProvider>
            {children}
            <ExplainerModal />
          </ExplainerProvider>
        </ProtectionProvider>
      </PolicyProvider>
    </FamilyProvider>
  );
}
