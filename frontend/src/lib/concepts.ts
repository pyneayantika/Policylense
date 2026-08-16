/**
 * 15 IRDAI-relevant concepts. Top 5 include visuals + check questions.
 * Definitions are product content — the LLM does not invent them.
 */

export type ConceptGroup = "Coverage" | "Cost Sharing" | "Conditions" | "Process";
export type VisualKind =
  | "split_bar"
  | "container_fill"
  | "timeline"
  | "shock_comparison"
  | "nested_boxes";

export interface CheckOption {
  text: string;
  correct: boolean;
}

export interface Concept {
  id: string;
  title: string;
  group: ConceptGroup;
  difficulty: 1 | 2 | 3 | 4 | 5;
  one_line: string;
  misconception?: string;
  visual?: VisualKind;
  check?: { question: string; options: CheckOption[] };
}

export const CONCEPTS: Concept[] = [
  {
    id: "copay",
    title: "Co-Payment",
    group: "Cost Sharing",
    difficulty: 3,
    one_line:
      "The percentage of every claim YOU pay from your pocket, even with insurance.",
    misconception:
      "People think insurance pays the full bill. With co-pay, you always share.",
    visual: "split_bar",
    check: {
      question:
        "A ₹5,00,000 admissible claim has a 20% co-pay. Who typically pays about ₹1,00,000?",
      options: [
        { text: "You (the insured) may pay this share", correct: true },
        { text: "The insurer always pays the full ₹5,00,000", correct: false },
      ],
    },
  },
  {
    id: "sum_insured",
    title: "Sum Insured",
    group: "Coverage",
    difficulty: 1,
    one_line:
      "The maximum your insurer will pay in a policy year. The ceiling, not a guarantee.",
    misconception:
      "People assume SI = amount received. Co-pay, sub-limits, and exclusions can reduce it.",
    visual: "container_fill",
    check: {
      question: "If sum insured is ₹5L and the hospital bill is ₹7L, can the insurer pay ₹7L?",
      options: [
        { text: "No — payout may be capped at the sum insured", correct: true },
        { text: "Yes — the bill amount is always paid in full", correct: false },
      ],
    },
  },
  {
    id: "sub_limit",
    title: "Sub-Limit",
    group: "Coverage",
    difficulty: 5,
    one_line: "A hidden cap on specific treatments INSIDE your sum insured.",
    misconception:
      "Most don't know sub-limits exist. ₹10L SI doesn't mean ₹10L for every treatment.",
    visual: "nested_boxes",
    check: {
      question: "A ₹10L sum insured means cataract surgery can always use the full ₹10L?",
      options: [
        { text: "Not necessarily — a treatment sub-limit may cap it lower", correct: true },
        { text: "Yes — SI is available equally for every treatment", correct: false },
      ],
    },
  },
  {
    id: "waiting_period",
    title: "Waiting Period",
    group: "Conditions",
    difficulty: 3,
    one_line:
      "A time window after buying when certain conditions are NOT covered.",
    misconception:
      "People think they're covered immediately. PED may not be covered for 2–4 years.",
    visual: "timeline",
    check: {
      question: "Are pre-existing diseases usually covered from day one?",
      options: [
        { text: "Usually not — a PED waiting period may still apply", correct: true },
        { text: "Yes — every condition is covered immediately", correct: false },
      ],
    },
  },
  {
    id: "room_rent_limit",
    title: "Room Rent Limit",
    group: "Cost Sharing",
    difficulty: 5,
    one_line:
      "A daily cap. If you exceed it, ALL charges may be reduced proportionally — not just room.",
    misconception:
      "Most misunderstood term. Exceeding room rent can reduce surgeon fees, medicines, everything.",
    visual: "shock_comparison",
    check: {
      question:
        "If you choose a room above the daily cap, only the room charge is reduced?",
      options: [
        { text: "Other associated charges may also be cut proportionally", correct: true },
        { text: "Only the extra room rupees are deducted", correct: false },
      ],
    },
  },
  {
    id: "exclusion",
    title: "Exclusion",
    group: "Coverage",
    difficulty: 1,
    one_line: "Treatments or situations your policy wording says will not be paid.",
  },
  {
    id: "pre_authorization",
    title: "Pre-Authorization",
    group: "Process",
    difficulty: 1,
    one_line:
      "Insurer approval before a planned hospitalization, often needed for cashless claims.",
  },
  {
    id: "network_hospital",
    title: "Network Hospital",
    group: "Process",
    difficulty: 1,
    one_line:
      "Hospitals with an insurer agreement — cashless may be available there.",
  },
  {
    id: "deductible",
    title: "Deductible",
    group: "Cost Sharing",
    difficulty: 3,
    one_line:
      "A fixed amount you may pay first before insurance contributes, unlike co-pay which is a percentage.",
  },
  {
    id: "no_claim_bonus",
    title: "No-Claim Bonus",
    group: "Coverage",
    difficulty: 1,
    one_line:
      "A possible increase in sum insured after a claim-free year. Not a cash payout.",
  },
  {
    id: "restoration_benefit",
    title: "Restoration Benefit",
    group: "Coverage",
    difficulty: 3,
    one_line:
      "May refill sum insured for a later unrelated claim in the same year after it is exhausted.",
  },
  {
    id: "cashless_claim",
    title: "Cashless Claim",
    group: "Process",
    difficulty: 1,
    one_line:
      "The insurer may pay the network hospital directly after pre-authorization.",
  },
  {
    id: "claim_settlement_ratio",
    title: "Claim Settlement Ratio",
    group: "Process",
    difficulty: 1,
    one_line:
      "Share of claims an insurer paid industry-wide. Context only — not a guarantee for your claim.",
  },
  {
    id: "portability",
    title: "Portability",
    group: "Conditions",
    difficulty: 3,
    one_line:
      "A possible right to switch insurers without fully restarting waiting-period credit.",
  },
  {
    id: "proportionate_deduction",
    title: "Proportionate Deduction",
    group: "Cost Sharing",
    difficulty: 5,
    one_line:
      "When room rent exceeds the limit, the insurer may cut every associated charge by the same ratio.",
  },
];

export const CONCEPT_BY_ID = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c])
) as Record<string, Concept>;

export const TERM_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "copay", re: /co-?pay(?:ment)?/gi },
  { id: "sum_insured", re: /sum\s+insured/gi },
  { id: "sub_limit", re: /sub-?limits?/gi },
  { id: "waiting_period", re: /waiting\s+periods?/gi },
  { id: "exclusion", re: /exclu(?:sion|ded|sions)/gi },
  { id: "room_rent_limit", re: /room\s+rent/gi },
  { id: "pre_authorization", re: /pre-?auth(?:orisation|orization)?/gi },
  { id: "network_hospital", re: /network\s+hospitals?/gi },
  { id: "deductible", re: /deductibles?/gi },
  { id: "proportionate_deduction", re: /proportionate\s+deductions?/gi },
  { id: "no_claim_bonus", re: /no-?claim\s+bonus/gi },
  { id: "restoration_benefit", re: /restoration(?:\s+benefit)?/gi },
];

export function getConcept(id: string): Concept | undefined {
  return CONCEPT_BY_ID[id];
}

export function difficultyDots(level: number): string {
  return "●".repeat(level) + "○".repeat(Math.max(0, 5 - level));
}
