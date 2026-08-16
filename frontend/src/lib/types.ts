/**
 * Frontend types mirroring backend models.
 * WHY: the UI must not invent shapes — these match SQLite/API contracts.
 */

export interface Family {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  relationship: "self" | "spouse" | "child" | "parent_1" | "parent_2" | string;
  age: number | null;
  city: string | null;
  known_conditions: string[] | string | null;
  annual_income: number | null;
  created_at?: string;
}

export interface Policy {
  id: string;
  family_id: string;
  member_id: string | null;
  policy_type: "health" | "life" | "vehicle" | "home" | string;
  insurer_name: string | null;
  product_name: string | null;
  policy_number: string | null;
  start_date: string | null;
  end_date: string | null;
  premium: number | null;
  status: string;
  pdf_filename: string | null;
  ingestion_status: "pending" | "processing" | "completed" | "failed" | string;
  ingestion_error?: string | null;
  created_at?: string;
}

export interface PolicyFacts {
  id: string;
  policy_id: string;
  fact_type: string;
  sum_insured: number | null;
  room_rent_limit: number | null;
  room_rent_type: string | null;
  copay_percent: number | null;
  copay_condition: string | null;
  deductible: number | null;
  ped_waiting_months: number | null;
  initial_waiting_months: number | null;
  specific_waiting_months: number | null;
  icu_limit: number | null;
  icu_limit_type: string | null;
  network_required: boolean;
  pre_auth_required: boolean;
  sum_assured: number | null;
  cover_type: string | null;
  payout_type: string | null;
  covers_members: string[] | string | null;
  cover_basis: string | null;
  confidence: number;
  extraction_notes: string | null;
}

export interface PolicyExclusion {
  id: string;
  policy_id: string;
  exclusion_text: string;
  exclusion_type: string | null;
  waiting_months: number | null;
  waiting_tier: string | null;
  condition: string | null;
  source_clause: string | null;
  confidence: number;
}

export interface PolicySublimit {
  id: string;
  policy_id: string;
  treatment_type: string;
  limit_amount: number | null;
  limit_type: string | null;
  limit_value: number | null;
  description: string | null;
  source_clause: string | null;
  confidence: number;
}

export interface ProtectionFlag {
  id: string;
  family_id: string;
  member_id: string | null;
  policy_id: string | null;
  flag_type: string;
  severity: "critical" | "warning" | "info" | string;
  title: string;
  description: string | null;
  evidence_clauses: string[] | string | null;
  calculated_data: Record<string, unknown> | string | null;
  member_name?: string;
  created_at?: string;
}

export type ProtectionStatus = "strong" | "moderate" | "gap_detected";

export interface MemberProtectionStatus {
  member_id: string;
  name: string;
  relationship: string;
  health_cover: { sum_insured: number | null; status: ProtectionStatus | string } | null;
  life_cover: { sum_assured: number | null; status: ProtectionStatus | string } | null;
  protection_status: ProtectionStatus | string;
}

export interface ProtectionSummary {
  overall_score: number;
  members: MemberProtectionStatus[];
  flags: ProtectionFlag[];
  score_breakdown: Record<string, number>;
}

export interface ScenarioParams {
  member?: string;
  member_id?: string;
  event?: string;
  event_type?: string;
  amount?: number | null;
  treatment?: string | null;
}

export interface FinancialProjection {
  eligible_amount: number;
  sum_insured_cap: number;
  copay_deduction: number;
  estimated_insurer_payout: number;
  estimated_out_of_pocket: number;
}

export interface EvidenceClause {
  clause: string;
  text: string;
  section?: string;
  policy?: string;
}

export interface ScenarioResult {
  id?: string;
  family_id?: string;
  scenario_type: string;
  scenario_params: ScenarioParams | string;
  result_data?: FinancialProjection | string;
  financial_projection?: FinancialProjection;
  explanation: string | null;
  caveats?: string[];
  evidence_clauses: EvidenceClause[] | string | null;
  confidence?: "indicative" | string;
  created_at?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  evidence?: EvidenceClause[];
  confidence?: "high" | "medium" | "low" | string;
}

export interface ChatResponse {
  answer: string;
  evidence: EvidenceClause[];
  confidence: "high" | "medium" | "low" | string;
  follow_up_suggestions?: string[];
}

export interface ConceptSummary {
  concept_id: string;
  title: string;
  category: string;
  difficulty?: string;
  one_line: string;
}

export interface PersonalizedExplainer {
  concept_id: string;
  title: string;
  one_line: string;
  explanation: string;
  misconception?: string;
  visual_data?: Record<string, unknown>;
  check_question?: {
    question: string;
    options: { text: string; correct: boolean }[];
  };
  policy_clause?: EvidenceClause;
  related_concepts?: string[];
}

export interface ApiErrorBody {
  status?: string;
  endpoint?: string;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}
