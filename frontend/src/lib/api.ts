/**
 * Typed fetch wrapper for the FastAPI backend.
 * WHY: pages should not scatter URLs or JSON parsing. 501 stubs throw until Phase 4.
 */

import type {
  ChatResponse,
  ConceptSummary,
  Family,
  FamilyMember,
  PersonalizedExplainer,
  Policy,
  PolicyFacts,
  ProtectionSummary,
  ScenarioResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (body as { error?: { message?: string }; status?: string }).error
        ?.message ||
      (body as { status?: string }).status ||
      res.statusText;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export function createFamily(name: string) {
  return fetchApi<Family>("/api/v1/family", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function addMember(
  familyId: string,
  member: Omit<FamilyMember, "id" | "family_id" | "created_at">
) {
  return fetchApi<FamilyMember>(`/api/v1/family/${familyId}/members`, {
    method: "POST",
    body: JSON.stringify(member),
  });
}

export function getFamily(familyId: string) {
  return fetchApi<{ family: Family; members: FamilyMember[]; policies?: Policy[] }>(
    `/api/v1/family/${familyId}`
  );
}

export function uploadPolicy(
  familyId: string,
  file: File,
  memberId: string,
  policyType: string
) {
  const form = new FormData();
  form.append("file", file);
  form.append("member_id", memberId);
  form.append("policy_type", policyType);
  return fetchApi<Policy>(`/api/v1/family/${familyId}/policies/upload`, {
    method: "POST",
    body: form,
  });
}

export function getPolicyStatus(policyId: string) {
  return fetchApi<{ status: string; progress?: unknown; error?: string }>(
    `/api/v1/policies/${policyId}/status`
  );
}

export function getPolicyFacts(policyId: string) {
  return fetchApi<{
    policy_facts: PolicyFacts | null;
    exclusions: unknown[];
    sublimits: unknown[];
    extraction_confidence: number;
  }>(`/api/v1/policies/${policyId}/facts`);
}

export function getProtectionSummary(familyId: string) {
  return fetchApi<ProtectionSummary>(`/api/v1/family/${familyId}/protection`);
}

export function runScenario(familyId: string, scenarioText: string) {
  return fetchApi<ScenarioResult>(`/api/v1/family/${familyId}/scenarios`, {
    method: "POST",
    body: JSON.stringify({ scenario_text: scenarioText }),
  });
}

export function askPolicy(
  familyId: string,
  question: string,
  policyId?: string
) {
  return fetchApi<ChatResponse>(`/api/v1/family/${familyId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question, policy_id: policyId }),
  });
}

export function getConcept(
  conceptId: string,
  memberId?: string,
  policyId?: string
) {
  const params = new URLSearchParams();
  if (memberId) params.set("member_id", memberId);
  if (policyId) params.set("policy_id", policyId);
  const q = params.toString();
  return fetchApi<PersonalizedExplainer>(
    `/api/v1/concepts/${conceptId}${q ? `?${q}` : ""}`
  );
}

export function getAllConcepts() {
  return fetchApi<ConceptSummary[]>("/api/v1/concepts");
}

export function resetAll() {
  return fetchApi<{ status: string; message: string }>("/api/v1/reset", {
    method: "DELETE",
  });
}
