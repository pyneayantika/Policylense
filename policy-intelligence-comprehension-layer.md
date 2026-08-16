# Policy Intelligence: Contextual Comprehension Layer

## Feature Specification

---

## Document Context

This spec extends the Policy Intelligence System Architecture and Implementation Plan. It defines a **Contextual Comprehension Layer** — an integrated learning system that explains insurance concepts using the user's own policy data at the exact moment they need to understand them.

**This is not a separate product.** It's a first-class feature of Policy Intelligence that closes the gap between "we detected a problem" and "the user understands the problem well enough to act."

**Companion Documents:**
- Policy Intelligence: Problem Statement
- Policy Intelligence: System Architecture & Design
- Policy Intelligence: Implementation Plan
- Policy Intelligence: Prompt Library

---

## 1. The Product Insight

### 1.1 Why This Exists

Policy Intelligence's core loop is:

```
Upload policy → Detect gaps → Show protection score → Simulate scenarios
```

But there's a hidden assumption in this loop: **the user understands the concepts that make the gaps meaningful.**

When the dashboard says:

```
🔴 CRITICAL
Your father's ₹5L policy has a 20% co-pay, which may
leave significant out-of-pocket exposure.
```

The user needs to understand:
- What "co-pay" actually means in practice
- How 20% translates to real rupees on a real hospital bill
- Why this is different from "deductible"
- What "out-of-pocket exposure" really implies for their family

If they don't understand these terms, the flag is just a red icon. They can't evaluate it, they can't decide what to do about it, and they certainly can't explain it to their spouse.

**Today's alternatives at this moment:**
- Google "what is co-pay" → generic definition, no connection to their policy
- YouTube → 8-minute video that explains co-pay in general, not their specific 20%
- Ask a friend → gets a vague, possibly wrong answer
- Ignore it → the most common outcome

**The comprehension layer solves this by answering:** *"What does this mean, specifically, for MY money?"*

### 1.2 Design Philosophy

```
PRINCIPLE 1 — Zero hunting.
The explanation appears WHERE the concept appears.
The user never leaves the screen to understand something.

PRINCIPLE 2 — Their numbers, not textbook numbers.
"Co-pay means you pay 20%" is a definition.
"On your father's ₹5L claim, co-pay means he pays ₹1,00,000" is comprehension.
Every explanation uses the user's actual policy data.

PRINCIPLE 3 — 60 seconds or less.
No one reads a 2,000-word explainer during a moment of confusion.
Each concept explanation is: one visual + one personalized example +
one confirmation question. Done in under a minute.

PRINCIPLE 4 — Teach once, reference always.
After a user understands co-pay through the interactive explainer,
the term is no longer highlighted as "unknown" — it becomes a
quiet reference link. The system adapts to comprehension.

PRINCIPLE 5 — Never feel like school.
No "lessons." No "modules." No "curriculum."
The user is solving THEIR problem. Learning happens as a side effect.
```

---

## 2. Feature Architecture

### 2.1 Where the Comprehension Layer Activates

The layer has three activation surfaces inside Policy Intelligence:

```
SURFACE 1: TAP-TO-UNDERSTAND
─────────────────────────────
Location: Everywhere a technical term appears
           (dashboard, flags, scenarios, chat responses)
Trigger:  User taps/clicks a highlighted term
Action:   Inline modal opens with personalized explainer
Examples: "co-pay", "sub-limit", "sum insured", "waiting period",
          "pre-authorization", "network hospital", "exclusion",
          "deductible", "no-claim bonus", "restoration benefit"


SURFACE 2: "WHY THIS MATTERS" CARDS
────────────────────────────────────
Location: Below every protection flag on the dashboard
Trigger:  Always visible (no tap needed)
Action:   A compact card explaining the concept behind the flag
          using the user's own numbers
Example:  Flag says "20% co-pay detected" →
          Card below says "What co-pay means for your family"
          with a visual breakdown of ₹5L claim → ₹1L out-of-pocket


SURFACE 3: SCENARIO WALK-THROUGH
─────────────────────────────────
Location: Inside the "What If?" scenario simulator results
Trigger:  Every step of the financial projection
Action:   Each calculation step is expandable — tapping it
          reveals what that concept means and why it reduces
          the payout
Example:  "Co-pay deduction (20%): ₹1,00,000" is tappable →
          expands to show how co-pay works with a visual
```

### 2.2 System Integration

```
┌─────────────────────────────────────────────────────────────┐
│                  EXISTING POLICY INTELLIGENCE               │
│                                                             │
│   Dashboard ──── Flags ──── Scenarios ──── Chat             │
│       │            │           │             │              │
│       └────────────┴───────────┴─────────────┘              │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │  COMPREHENSION      │  ◄── NEW LAYER         │
│              │  LAYER              │                        │
│              │                     │                        │
│              │  Term Detector      │  Identifies technical  │
│              │  Concept Library    │  terms in any text     │
│              │  Personalizer       │  output and enriches   │
│              │  Explainer Engine   │  them with contextual  │
│              │                     │  explanations          │
│              └──────────┬──────────┘                        │
│                         │                                   │
│              Uses existing data:                            │
│              ├── Policy facts from SQLite                   │
│              ├── Family profile (age, city, members)        │
│              ├── Rules engine calculations                  │
│              └── Retrieved policy clauses from RAG          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The comprehension layer does NOT require new backend infrastructure. It uses data that already exists in the system — policy facts, family context, rules engine outputs, and RAG-retrieved clauses. The new work is entirely in:

1. A concept library (static content, ~15 concepts)
2. A personalizer function (injects user's numbers into explanations)
3. A term detector (identifies and highlights terms in UI text)
4. Frontend components (explainer modal, "Why This Matters" card)

---

## 3. Concept Library

### 3.1 Core Insurance Concepts (MVP Scope)

These 15 concepts cover every term that appears in Policy Intelligence's outputs. Each concept has a structured definition designed for personalization.

```
CONCEPT 01: CO-PAY (Co-Payment)
───────────────────────────────
category: cost_sharing
difficulty: medium
frequency_in_product: very_high (appears in flags, scenarios, chat)

one_line:
  "The percentage of every claim YOU pay from your own pocket,
   even though you have insurance."

misconception:
  "Many people think insurance pays the full hospital bill.
   With co-pay, it doesn't — you always share the cost."

generic_example:
  "If your co-pay is 20% and your hospital bill is ₹5,00,000,
   the insurer pays ₹4,00,000 and you pay ₹1,00,000."

personalized_template:
  "Your {member_name}'s policy has a {copay_percent}% co-pay.
   On an eligible claim of ₹{example_amount}, {member_name}
   would need to pay ₹{copay_amount} from pocket, and the
   insurer would cover up to ₹{insurer_amount}."

visual_type: split_bar
  → Bar showing total claim split into "Insurer pays" (green)
     and "You pay" (red), with rupee amounts labeled

check_question:
  "If {member_name} has an eligible hospital bill of
   ₹{quiz_amount}, how much would the family pay out of pocket?"
  options:
    a) "₹0 — insurance covers everything" (wrong)
    b) "₹{correct_answer} — that's {copay_percent}% of the bill" (correct)
    c) "₹{quiz_amount} — insurance doesn't pay for this" (wrong)

related_concepts: ["deductible", "sum_insured", "sub_limit"]
policy_clause_link: true (link to the co-pay clause via RAG)


CONCEPT 02: SUM INSURED
────────────────────────
category: coverage_limit
difficulty: easy
frequency_in_product: very_high

one_line:
  "The maximum amount your insurer will pay in a policy year.
   It's the ceiling of your coverage, not a guarantee."

misconception:
  "People assume sum insured = the amount they'll receive.
   In reality, co-pay, sub-limits, and exclusions can reduce
   the actual payout significantly below the sum insured."

generic_example:
  "If your sum insured is ₹5,00,000 and your hospital bill
   is ₹7,00,000, the insurer considers only ₹5,00,000.
   You cover the remaining ₹2,00,000."

personalized_template:
  "{member_name}'s policy has a sum insured of
   ₹{sum_insured}. This means the maximum the insurer
   will consider for any eligible claim in a policy year
   is ₹{sum_insured}. Any amount above this is borne
   by the family."

visual_type: container_fill
  → A container showing sum insured as the "full" level,
     with the claim amount either fitting inside (green)
     or overflowing (red portion = out-of-pocket)

check_question:
  "{member_name}'s sum insured is ₹{sum_insured}. A
   hospitalization costs ₹{overflow_amount}. What's the
   maximum the insurer would consider?"
  options:
    a) "₹{overflow_amount} — the full bill" (wrong)
    b) "₹{sum_insured} — that's the policy ceiling" (correct)
    c) "It depends on the hospital" (wrong)

related_concepts: ["copay", "sub_limit", "restoration_benefit"]


CONCEPT 03: SUB-LIMIT
──────────────────────
category: coverage_limit
difficulty: hard
frequency_in_product: high

one_line:
  "A hidden cap on specific treatments INSIDE your sum insured.
   Even if your sum insured is ₹10L, a specific treatment
   might be capped at ₹40,000."

misconception:
  "Most people don't know sub-limits exist. They assume
   ₹10L sum insured means ₹10L for ANY treatment. Sub-limits
   silently reduce coverage for specific procedures."

generic_example:
  "Your policy says ₹10L sum insured. But cataract surgery
   has a sub-limit of ₹40,000. Even if the surgery costs
   ₹80,000, the insurer pays maximum ₹40,000 for it."

personalized_template:
  "{member_name}'s policy has sub-limits on the following
   treatments: {sublimit_list}. For example, {treatment_name}
   is capped at ₹{sublimit_amount}, regardless of the actual
   cost. This is separate from the overall sum insured of
   ₹{sum_insured}."

visual_type: nested_boxes
  → Large box = sum insured (₹10L)
     Small highlighted box inside = sub-limit for specific
     treatment (₹40,000)
     Shows the mismatch visually

check_question:
  "{member_name}'s sum insured is ₹{sum_insured}, but
   {treatment_name} has a sub-limit of ₹{sublimit_amount}.
   If {treatment_name} costs ₹{treatment_cost}, what's the
   maximum the insurer pays for that treatment?"
  options:
    a) "₹{treatment_cost}" (wrong)
    b) "₹{sum_insured}" (wrong)
    c) "₹{sublimit_amount} — that's the sub-limit cap" (correct)

related_concepts: ["sum_insured", "room_rent_limit", "copay"]


CONCEPT 04: WAITING PERIOD (Pre-Existing Disease)
──────────────────────────────────────────────────
category: coverage_condition
difficulty: medium
frequency_in_product: high

one_line:
  "A time window after buying the policy during which certain
   conditions are NOT covered. You have insurance, but it
   doesn't apply to these specific things — yet."

misconception:
  "People buy insurance thinking they're covered immediately
   for everything. Waiting periods mean pre-existing conditions
   may not be covered for 2-4 years after purchase."

generic_example:
  "You buy a policy on January 1, 2024. It has a 48-month PED
   waiting period. If you had diabetes before buying, diabetes-
   related hospitalizations aren't covered until January 2028."

personalized_template:
  "{member_name}'s policy has a {ped_waiting_months}-month
   waiting period for pre-existing diseases.
   {if_active: The policy started on {start_date}, which means
   {months_remaining} months remain before pre-existing
   conditions are covered.}
   {if_elapsed: The waiting period has elapsed — pre-existing
   conditions should now be covered under the policy terms.}"

visual_type: timeline
  → Horizontal timeline showing:
     Policy start → Today → Waiting period end
     With a "not covered" zone (red) and "covered" zone (green)

check_question:
  "{member_name}'s policy started {months_elapsed} months ago.
   The PED waiting period is {ped_waiting_months} months.
   Is a hospitalization for a pre-existing condition covered today?"
  options:
    a) "Yes — {member_name} has active insurance" (wrong)
    b) "No — {months_remaining} months of waiting remain" (correct)
    c) "Only if it's an emergency" (wrong)

related_concepts: ["exclusion", "initial_waiting_period", "portability"]


CONCEPT 05: EXCLUSION
─────────────────────
category: coverage_condition
difficulty: easy
frequency_in_product: high

one_line:
  "Treatments, conditions, or situations your policy will
   NEVER cover — no matter what."

misconception:
  "People assume 'health insurance' covers all health expenses.
   Every policy has a list of things it explicitly won't pay for."

personalized_template:
  "{member_name}'s policy has {exclusion_count} exclusions.
   Some examples from the policy: {top_3_exclusions}.
   These are not covered regardless of circumstances."

visual_type: checklist
  → Two columns: "✅ Covered" vs "❌ Not Covered"
     With specific items from the user's policy

check_question:
  "One of {member_name}'s policy exclusions is '{exclusion_example}'.
   If {member_name} needs this treatment, will insurance pay?"
  options:
    a) "Yes — they have insurance" (wrong)
    b) "No — this is explicitly excluded" (correct)

related_concepts: ["waiting_period", "sub_limit", "conditional_exclusion"]


CONCEPT 06: ROOM RENT LIMIT
────────────────────────────
category: cost_sharing
difficulty: hard

one_line:
  "A daily cap on how much the insurer pays for your hospital
   room. If your room costs more, ALL other charges may be
   reduced proportionally — not just the room cost."

misconception:
  "This is the most misunderstood term in insurance. People
   think room rent limit only affects the room charge. In
   reality, if you exceed the room rent limit, the insurer
   can proportionally reduce EVERY charge — surgeon fees,
   medicines, tests — everything."

generic_example:
  "Your room rent limit is ₹5,000/day. You choose a ₹8,000/day
   room. The insurer doesn't just deduct ₹3,000/day for the room.
   It may reduce ALL charges by the ratio 5,000/8,000 = 62.5%.
   So your ₹3,00,000 surgery bill might only get ₹1,87,500
   from the insurer."

personalized_template:
  "{member_name}'s room rent limit is ₹{room_rent_limit}/day.
   If {member_name} chooses a room costing more than this,
   the insurer may apply proportionate deduction to ALL charges
   — not just the room cost. This is one of the most common
   reasons for unexpectedly high out-of-pocket bills."

visual_type: proportional_deduction_visual
  → Two side-by-side comparisons:
     Left: Room within limit → full bill covered
     Right: Room above limit → ALL charges reduced proportionally
     The visual shock of the second scenario drives understanding

check_question:
  "Room rent limit: ₹{room_rent_limit}/day. Room chosen:
   ₹{higher_room}/day. Total bill: ₹{total_bill}.
   What happens?"
  options:
    a) "Insurer pays full bill minus room difference" (wrong)
    b) "Insurer may proportionally reduce ALL charges" (correct)
    c) "Nothing — room rent limit only affects room cost" (wrong)

related_concepts: ["sum_insured", "copay", "sub_limit"]


CONCEPT 07: PRE-AUTHORIZATION
─────────────────────────────
category: process
difficulty: easy

one_line:
  "Getting approval from your insurer BEFORE a planned
   hospitalization. Skip this step, and your cashless
   claim may be denied."

personalized_template:
  "{member_name}'s policy {requires_preauth: requires |
   does not explicitly require} pre-authorization for
   planned hospitalizations. For cashless treatment at
   a network hospital, it's generally necessary to inform
   the insurer in advance."

visual_type: process_flow
  → Simple 3-step flow:
     Inform insurer → Get approval → Admit to hospital
     vs.
     Skip pre-auth → Admit → Claim denied/reimbursement only

related_concepts: ["network_hospital", "cashless_claim"]


CONCEPT 08: NETWORK HOSPITAL
─────────────────────────────
category: process
difficulty: easy

one_line:
  "Hospitals that have an agreement with your insurer.
   Go here for cashless treatment. Go elsewhere, and
   you pay first, claim later."

personalized_template:
  "{member_name}'s policy {requires_network: requires
   treatment at network hospitals for cashless claims |
   allows reimbursement at non-network hospitals too}.
   Network hospitals can be found on {insurer_name}'s
   website or app."

visual_type: comparison_card
  → Network hospital: Cashless → insurer pays hospital directly
     Non-network: Reimbursement → you pay first, claim later

related_concepts: ["pre_authorization", "cashless_claim"]


CONCEPT 09: DEDUCTIBLE
───────────────────────
category: cost_sharing
difficulty: medium

one_line:
  "A fixed amount you pay first before insurance kicks in.
   Unlike co-pay (a percentage), deductible is a flat amount."

generic_example:
  "If your deductible is ₹50,000 and your bill is ₹3,00,000,
   you pay the first ₹50,000, and the insurer covers up to
   ₹2,50,000 (subject to other limits)."

personalized_template:
  "{member_name}'s policy has a deductible of ₹{deductible}.
   This means the first ₹{deductible} of every claim is paid
   by {member_name}, and the insurer covers expenses above
   that amount (subject to sum insured and other conditions)."

visual_type: threshold_bar
  → Horizontal bar: first ₹X is red (you pay), rest is green (insurer)

related_concepts: ["copay", "sum_insured"]


CONCEPT 10: NO-CLAIM BONUS
───────────────────────────
category: benefit
difficulty: easy

one_line:
  "A reward for NOT making claims. Your sum insured increases
   each year you don't claim — typically by 5-50%."

personalized_template:
  "{member_name}'s policy offers no-claim bonus:
   {ncb_description}. This means if no claims are made
   in a policy year, the sum insured for the next year
   increases without additional premium."

visual_type: growth_chart
  → Year-by-year bar chart showing sum insured growing
     Year 1: ₹5L → Year 2: ₹5.25L → Year 3: ₹5.5L...

related_concepts: ["sum_insured", "restoration_benefit"]


CONCEPT 11: RESTORATION BENEFIT
────────────────────────────────
category: benefit
difficulty: medium

one_line:
  "If your sum insured is exhausted by one claim, restoration
   benefit refills it (fully or partially) for subsequent
   claims in the same year."

personalized_template:
  "{member_name}'s policy {has_restoration: includes |
   does not include} restoration benefit. {if_yes: If the
   sum insured of ₹{sum_insured} is fully used in one claim,
   it gets restored for future claims in the same policy year.}"

visual_type: refill_animation
  → Container empties (first claim) → refills (restoration)

related_concepts: ["sum_insured", "no_claim_bonus"]


CONCEPT 12: CASHLESS CLAIM
───────────────────────────
category: process
difficulty: easy

one_line:
  "The insurer pays the hospital directly — you don't pay
   upfront. Only available at network hospitals with
   pre-authorization."

visual_type: flow_comparison
  → Cashless: You → Hospital → Insurer pays hospital
     Reimbursement: You → Hospital → You pay → Claim → Wait → Refund

related_concepts: ["network_hospital", "pre_authorization"]


CONCEPT 13: CLAIM SETTLEMENT RATIO
───────────────────────────────────
category: evaluation
difficulty: easy

one_line:
  "The percentage of claims an insurer actually pays out of
   all claims received. Higher is generally better, but the
   number alone doesn't tell the full story."

visual_type: percentage_ring
  → Ring chart showing claims paid vs rejected

related_concepts: ["cashless_claim", "exclusion"]


CONCEPT 14: PORTABILITY
────────────────────────
category: policy_management
difficulty: medium

one_line:
  "Your right to switch insurers without losing waiting period
   credits. If you've completed 2 years of waiting period with
   insurer A, insurer B must honor those 2 years."

visual_type: transfer_visual
  → Insurer A (2 years completed) → Transfer → Insurer B
     (2 years credited, not restarted)

related_concepts: ["waiting_period", "no_claim_bonus"]


CONCEPT 15: PROPORTIONATE DEDUCTION
────────────────────────────────────
category: cost_sharing
difficulty: hard

one_line:
  "When you choose a room above your room rent limit, the
   insurer reduces ALL charges (not just room) by the same
   proportion. This is the single biggest surprise in
   insurance claims."

generic_example:
  "Room rent limit: ₹5,000/day. Room chosen: ₹10,000/day.
   Ratio: 50%. Total bill: ₹4,00,000.
   Without proportionate deduction: Insurer pays ₹3,85,000
   (bill minus room difference).
   WITH proportionate deduction: Insurer pays ₹2,00,000
   (50% of EVERYTHING). You pay ₹2,00,000."

visual_type: shock_comparison
  → Side-by-side:
     "What people expect to pay" vs "What they actually pay"
     The gap between these two numbers is the visual punch

related_concepts: ["room_rent_limit", "copay", "sub_limit"]
```

### 3.2 Concept Difficulty Tiers

```
EASY (5 concepts):
  Sum Insured, Exclusion, Pre-Authorization,
  Network Hospital, Cashless Claim

  → One-line explanation + visual is sufficient.
  → Users "get it" immediately.

MEDIUM (6 concepts):
  Co-Pay, Waiting Period, Deductible,
  No-Claim Bonus, Restoration Benefit, Portability

  → Need a personalized example to land.
  → The generic definition isn't enough — users need
     to see THEIR numbers to understand.

HARD (4 concepts):
  Sub-Limit, Room Rent Limit, Proportionate Deduction,
  [concept combinations in scenario results]

  → These are where real financial damage happens.
  → Need the full explainer: visual + personalized example
     + check question.
  → Room Rent + Proportionate Deduction is the #1 cause
     of "I thought I was covered" shock.
```

---

## 4. Personalization Engine

### 4.1 How Personalization Works

The comprehension layer takes the **generic concept definition** and injects the **user's actual policy data** to create a personalized explanation.

```python
# core/comprehension/personalizer.py

class ConceptPersonalizer:
    """
    Takes a concept template and fills it with the user's
    actual policy data from SQLite.
    """

    def personalize(self, concept_id: str,
                     member: FamilyMember,
                     policy_facts: PolicyFacts) -> PersonalizedExplainer:
        """
        Returns a fully personalized explanation with:
        - Personalized text (their name, their numbers)
        - Personalized visual data (for frontend rendering)
        - Personalized check question (with correct answer calculated)
        """

        template = self.concept_library.get(concept_id)

        # Example: personalizing CO-PAY
        if concept_id == "copay":
            example_amount = policy_facts.sum_insured or 500000
            copay_pct = policy_facts.copay_percent or 0
            copay_amount = example_amount * (copay_pct / 100)
            insurer_amount = example_amount - copay_amount

            text = template.personalized_template.format(
                member_name=member.name,
                copay_percent=copay_pct,
                example_amount=f"{example_amount:,.0f}",
                copay_amount=f"{copay_amount:,.0f}",
                insurer_amount=f"{insurer_amount:,.0f}"
            )

            visual_data = {
                "type": "split_bar",
                "total": example_amount,
                "segments": [
                    {"label": "Insurer pays", "value": insurer_amount,
                     "color": "green"},
                    {"label": "You pay", "value": copay_amount,
                     "color": "red"}
                ]
            }

            quiz_amount = 300000  # ₹3L quiz scenario
            correct_answer = quiz_amount * (copay_pct / 100)
            check_question = {
                "question": f"If {member.name} has an eligible bill of "
                           f"₹{quiz_amount:,.0f}, how much does the "
                           f"family pay from pocket?",
                "options": [
                    {"text": "₹0 — insurance covers everything",
                     "correct": False},
                    {"text": f"₹{correct_answer:,.0f} — that's "
                            f"{copay_pct}% of the bill",
                     "correct": True},
                    {"text": f"₹{quiz_amount:,.0f} — insurance "
                            f"doesn't pay", "correct": False}
                ]
            }

            return PersonalizedExplainer(
                concept_id=concept_id,
                title="Co-Payment",
                one_line=template.one_line,
                explanation=text,
                misconception=template.misconception,
                visual_data=visual_data,
                check_question=check_question,
                policy_clause_ref=self._get_clause_ref(
                    policy_facts.policy_id, "copay"
                ),
                related_concepts=template.related_concepts
            )
```

### 4.2 Data Flow

```
User taps "co-pay" on dashboard
          │
          ▼
Frontend sends: GET /api/v1/concepts/copay?member_id=X&policy_id=Y
          │
          ▼
Backend loads:
  - Concept template from library (static)
  - Member data from SQLite (name, age)
  - Policy facts from SQLite (copay_percent, sum_insured)
  - Policy clause from RAG (the actual co-pay clause text)
          │
          ▼
Personalizer fills template with real data
          │
          ▼
Returns PersonalizedExplainer JSON:
  {
    concept_id: "copay",
    title: "Co-Payment",
    one_line: "The percentage of every claim YOU pay...",
    explanation: "Your father Ramesh's policy has a 20% co-pay...",
    misconception: "Many people think insurance pays the full bill...",
    visual_data: { type: "split_bar", segments: [...] },
    check_question: { question: "...", options: [...] },
    policy_clause: { clause: "8.1", text: "..." },
    related_concepts: ["deductible", "sum_insured"]
  }
          │
          ▼
Frontend renders the explainer modal
```

---

## 5. Term Detection System

### 5.1 How Terms Get Highlighted

Every text output in the UI — flag descriptions, scenario explanations, chat answers — passes through a term detector that identifies and marks insurance concepts.

```python
# core/comprehension/term_detector.py

TERM_PATTERNS = {
    "copay": [
        r"co-?pay(?:ment)?", r"co-?payment",
        r"\d+%\s*co-?pay", r"cost.?sharing"
    ],
    "sum_insured": [
        r"sum\s+insured", r"cover(?:age)?\s+(?:of|amount)",
        r"₹[\d,]+\s*(?:lakh|L|lac)", r"insured\s+amount"
    ],
    "sub_limit": [
        r"sub-?limit", r"internal\s+limit",
        r"capp(?:ed|ing)", r"maximum\s+(?:of|for)\s+₹"
    ],
    "waiting_period": [
        r"waiting\s+period", r"(?:PED|pre-?existing)\s+waiting",
        r"moratorium", r"\d+\s*months?\s*waiting"
    ],
    "exclusion": [
        r"exclud(?:ed|sion)", r"not\s+cover(?:ed)?",
        r"not\s+payable", r"outside\s+(?:scope|coverage)"
    ],
    "room_rent_limit": [
        r"room\s+rent", r"room\s+(?:charge|limit)",
        r"₹[\d,]+\s*/\s*day", r"per\s+day\s+limit"
    ],
    "pre_authorization": [
        r"pre-?auth(?:orization|orisation)?",
        r"prior\s+approval", r"advance\s+intimation"
    ],
    "network_hospital": [
        r"network\s+hospital", r"cashless\s+(?:hospital|facility)",
        r"empanelled", r"in-?network"
    ],
    "deductible": [
        r"deductible", r"initial\s+(?:amount|deduction)"
    ],
    "proportionate_deduction": [
        r"proportionate\s+deduction", r"proportional\s+reduction",
        r"pro-?rata"
    ],
    "no_claim_bonus": [
        r"no.?claim\s+bonus", r"NCB", r"claim.?free\s+bonus"
    ],
    "restoration_benefit": [
        r"restoration", r"recharge\s+benefit",
        r"sum\s+insured\s+(?:restored|refilled)"
    ]
}

class TermDetector:

    def detect_and_mark(self, text: str) -> MarkedText:
        """
        Scans text for insurance terms and returns marked-up text
        with concept IDs for frontend highlighting.

        Output format for frontend:
        {
            "original_text": "Your policy has a 20% co-pay...",
            "marked_text": "Your policy has a 20% <term id='copay'>co-pay</term>...",
            "detected_terms": ["copay"],
            "term_positions": [{"id": "copay", "start": 24, "end": 30}]
        }
        """
        # Regex matching against all patterns
        # Return positions and concept IDs for frontend to render
        # as tappable highlighted spans
```

### 5.2 Frontend Rendering

```jsx
// components/SmartText.tsx
// Renders text with tappable insurance terms

function SmartText({ markedText, memberId, policyId }) {
    const [activeExplainer, setActiveExplainer] = useState(null);

    // Replace <term> tags with tappable spans
    // On tap → fetch personalized explainer → show modal

    return (
        <>
            <p>
                {markedText.segments.map(segment =>
                    segment.isTerm ? (
                        <span
                            className="underline decoration-dotted
                                       decoration-blue-400 cursor-pointer
                                       text-blue-600"
                            onClick={() => openExplainer(segment.conceptId)}
                        >
                            {segment.text}
                        </span>
                    ) : (
                        <span>{segment.text}</span>
                    )
                )}
            </p>

            {activeExplainer && (
                <ExplainerModal
                    explainer={activeExplainer}
                    onClose={() => setActiveExplainer(null)}
                />
            )}
        </>
    );
}
```

---

## 6. API Extension

### 6.1 New Endpoints

```
Added to existing FastAPI backend:

GET  /api/v1/concepts/{concept_id}
     Query params: member_id, policy_id (both optional)
     Returns: PersonalizedExplainer (if member/policy provided)
              or GenericExplainer (if not)

GET  /api/v1/concepts
     Returns: List of all concept summaries
              (for the reference/glossary page)

POST /api/v1/text/detect-terms
     Body: { "text": "Your policy has a 20% co-pay..." }
     Returns: MarkedText with term positions and concept IDs

GET  /api/v1/concepts/{concept_id}/clause
     Query params: policy_id
     Returns: The actual policy clause text for this concept
              (retrieved via RAG)
```

### 6.2 Integration with Existing Endpoints

Existing endpoints are enhanced to include term detection:

```
GET /family/{family_id}/protection
    → Flag descriptions now include detected_terms
    → Each flag includes a "why_this_matters" concept reference

POST /family/{family_id}/scenarios
    → Each calculation step includes a concept_id
    → The explanation text includes detected_terms

POST /family/{family_id}/chat
    → Chat responses include detected_terms for highlighting
```

---

## 7. Frontend Components

### 7.1 ExplainerModal

```
┌──────────────────────────────────────────┐
│  ╳                                       │
│                                          │
│  💡 Co-Payment                           │
│                                          │
│  The percentage of every claim YOU pay   │
│  from your own pocket, even though you   │
│  have insurance.                         │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  ₹5,00,000 claim                │    │
│  │  ████████████████░░░░            │    │
│  │  Insurer: ₹4,00,000  You: ₹1L   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  For Ramesh's policy:                    │
│  His 20% co-pay means on an eligible     │
│  claim of ₹5,00,000, Ramesh pays         │
│  ₹1,00,000 from pocket and the insurer   │
│  covers up to ₹4,00,000.                 │
│                                          │
│  ⚠️ Common misconception:                │
│  Many people think insurance pays the    │
│  full bill. With co-pay, you always      │
│  share the cost.                         │
│                                          │
│  ── Quick Check ──────────────────────   │
│                                          │
│  If Ramesh has an eligible bill of       │
│  ₹3,00,000, how much does he pay?        │
│                                          │
│  ○ ₹0 — insurance covers everything     │
│  ● ₹60,000 — that's 20% of the bill  ✅ │
│  ○ ₹3,00,000 — insurance doesn't pay    │
│                                          │
│  📄 Source: Policy Section 8.1            │
│                                          │
│  Related: Deductible · Sum Insured       │
│                                          │
└──────────────────────────────────────────┘
```

### 7.2 "Why This Matters" Card (Below Flags)

```
┌──────────────────────────────────────────┐
│  🔴 CRITICAL                              │
│  Parent health coverage may leave         │
│  significant out-of-pocket exposure       │
│                                           │
│  📄 Evidence: Clause 4.2, 8.1             │
│  [See Details]  [Run Scenario →]          │
├──────────────────────────────────────────┤
│  💡 Why this matters                      │
│                                           │
│  Ramesh's ₹5L policy has two features     │
│  that reduce what the insurer actually    │
│  pays:                                    │
│                                           │
│  ₹5,00,000 claim                          │
│  ████████████░░░░░░░░                     │
│  After co-pay (20%):  ₹4,00,000          │
│  After sub-limits:    may reduce further  │
│                                           │
│  [Tap co-pay to understand →]             │
│  [Tap sub-limits to understand →]         │
│                                           │
└──────────────────────────────────────────┘
```

### 7.3 Concept Reference Page

```
app/learn/page.tsx

┌──────────────────────────────────────────┐
│  📖 Insurance Concepts                    │
│                                           │
│  Understand every term in your policy,    │
│  explained with YOUR numbers.             │
│                                           │
│  ── Coverage ─────────────────────────    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Sum      │ │ Sub-     │ │ Restor-  │ │
│  │ Insured  │ │ Limit    │ │ ation    │ │
│  │ ●●●○○    │ │ ●●●●○    │ │ ●●●○○    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                           │
│  ── Cost Sharing ─────────────────────    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Co-Pay   │ │ Deduct-  │ │ Room     │ │
│  │          │ │ ible     │ │ Rent     │ │
│  │ ●●●○○    │ │ ●●●○○    │ │ ●●●●●    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                           │
│  ── Conditions ───────────────────────    │
│  ┌──────────┐ ┌──────────┐               │
│  │ Waiting  │ │ Exclus-  │               │
│  │ Period   │ │ ions     │               │
│  │ ●●●○○    │ │ ●●○○○    │               │
│  │          │ │          │               │
│  └──────────┘ └──────────┘               │
│                                           │
│  ●○○○○ = Easy  ●●●○○ = Medium  ●●●●● = Hard
│                                           │
│  Tap any concept for a personalized       │
│  explanation with your policy data.       │
│                                           │
└──────────────────────────────────────────┘
```

---

## 8. Implementation Plan (Additional Hours)

This layer adds approximately **8-10 hours** to the existing 72-hour build. Here's where it fits:

```
EXISTING PHASE 5 (Frontend, Hours 44-60) — extend by 6 hours:

[NEW] Hours 60-62: Concept Library + Personalizer
  - Create concept_library.py with all 15 concepts (static data)
  - Build personalizer function for top 5 concepts:
    copay, sum_insured, sub_limit, waiting_period, room_rent_limit
  - These are the concepts that appear most in dashboard flags
  - Wire to GET /concepts/{id} endpoint

[NEW] Hours 62-64: Term Detector + SmartText Component
  - Build term_detector.py with regex patterns
  - Build SmartText.tsx component for highlighted terms
  - Integrate SmartText into:
    - FlagCard descriptions
    - ScenarioResult explanations
    - ChatMessage responses

[NEW] Hours 64-66: ExplainerModal + Visual Components
  - Build ExplainerModal.tsx with:
    - Concept title + one-line
    - Personalized explanation
    - Visual (split_bar for co-pay, container for sum_insured,
      timeline for waiting_period)
    - Check question with answer feedback
    - Policy clause reference
  - Use Recharts for visual components (already in the stack)

[NEW] Hours 66-68: "Why This Matters" Cards
  - Build WhyThisMatters.tsx component
  - Attach to each FlagCard on the dashboard
  - Each card uses the concept personalizer to show
    the user's own numbers in a visual breakdown

EXISTING PHASE 6 (Deploy + Polish, Hours 68-80):
  - Extended from 60-72 to 68-80 (total build: ~80 hours)
  - Deploy, polish, demo data fallback, documentation
```

### 8.1 Priority Cut Decisions

If you're running behind, cut in this order:

```
PRIORITY 1 — ALWAYS BUILD:
  ExplainerModal for copay, sum_insured, waiting_period
  (3 concepts × 1 hour each = 3 hours)
  These appear in every flag and scenario.

PRIORITY 2 — BUILD IF TIME:
  SmartText term highlighting across all surfaces
  (2 hours)

PRIORITY 3 — BUILD IF TIME:
  "Why This Matters" cards on dashboard flags
  (2 hours)

PRIORITY 4 — CUT IF BEHIND:
  Check questions / quiz element in explainer
  (1 hour saved)

PRIORITY 5 — CUT IF BEHIND:
  Concept reference page (/learn)
  (2 hours saved)

PRIORITY 6 — CUT IF BEHIND:
  Concepts beyond the top 5
  (remaining 10 concepts are nice-to-have)
```

---

## 9. Portfolio Positioning

### 9.1 How to Talk About This in Interviews

**Don't say:** "I built a gamified learning platform for insurance."

**Say:** "I realized that gap detection is useless if the user doesn't understand the concepts behind the gaps. So I built a comprehension layer that explains every technical term using the user's own policy data. When the dashboard shows 'co-pay: 20%,' the user can tap it and see exactly what that means for their father's specific policy — not a generic definition, but their actual rupee amounts. No one else does this because no other product has both the policy data AND the learning layer in the same place."

### 9.2 The PM Insight to Articulate

The insight isn't "people need financial literacy." Everyone knows that.

The insight is: **comprehension is a product feature, not a separate product.** When you separate education from the decision-making context, you get content marketing. When you embed it at the point of confusion with personalized data, you get a product moat.

This is the same insight that made Stripe's documentation a competitive advantage — they didn't build a "developer education platform." They put the explanation exactly where the developer was confused, with their own API key in the examples.

That's what you're doing for insurance.

---

*Document Version: 1.0*
*Last Updated: August 2026*
*Author: Ayantika Pyne*
*Project: Policy Intelligence — Contextual Comprehension Layer*
*Companion Documents:*
  - *Policy Intelligence: Problem Statement*
  - *Policy Intelligence: System Architecture & Design*
  - *Policy Intelligence: Implementation Plan*
  - *Policy Intelligence: Prompt Library*
