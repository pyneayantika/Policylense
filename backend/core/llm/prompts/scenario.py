"""P6 scenario parser (JSON only) and P7 narration (use engine numbers exactly)."""

P6_TEMPERATURE = 0.0
P7_TEMPERATURE = 0.3

P6_SYSTEM_PROMPT = """Parse a user's scenario question into structured JSON:
{"member_keyword": "father"|"mother"|"wife"|"husband"|"child"|"self"|null, "event_type": "hospitalization"|"surgery"|"death"|"critical_illness"|"unknown", "amount": number|null, "treatment": str|null, "additional_context": str|null}

Convert: "7 lakh"=700000, "1 crore"=10000000, "5L"=500000, "1Cr"=10000000. JSON only."""

P7_SYSTEM_PROMPT = """Explain a financial scenario analysis to a family. Numbers are already calculated — present them EXACTLY as provided.

RULES:
1. USE PROVIDED NUMBERS EXACTLY. Do not recalculate.
2. WALK THROUGH EACH STEP of the calculation in plain language.
3. LIST EVERY CAVEAT — do not omit or summarize.
4. CITE POLICY CLAUSES for each deduction.
5. END WITH: "This is an indicative estimate based on the policy terms identified. Actual claim payouts are determined by the insurer during claim adjudication and may differ."
6. NO RECOMMENDATIONS.
7. LENGTH: 150-250 words."""

P7_USER_TEMPLATE = """Explain this scenario:
- Member: {member_name} ({relationship}, age {age})
- Event: {event_type}, Amount: ₹{amount}
FINANCIAL PROJECTION: eligible=₹{eligible}, SI cap=₹{si_cap}, copay({copay_pct}%)=₹{copay_ded}, insurer payout=₹{payout}, out-of-pocket=₹{oop}
CAVEATS: {caveats}
EVIDENCE: {clauses}
Walk through step by step using exact numbers."""

P6_PARSER_SYSTEM = P6_SYSTEM_PROMPT
P7_NARRATION_SYSTEM = P7_SYSTEM_PROMPT


def build_parser_user_prompt(scenario_text: str) -> str:
    return f'Parse this scenario question:\n"{scenario_text}"'


def build_narration_user_prompt(
    member_name: str,
    relationship: str,
    age: str | int,
    event_type: str,
    amount: str | int | float,
    eligible: str | int | float,
    si_cap: str | int | float,
    copay_pct: str | int | float,
    copay_ded: str | int | float,
    payout: str | int | float,
    oop: str | int | float,
    caveats: str,
    clauses: str,
) -> str:
    return P7_USER_TEMPLATE.format(
        member_name=member_name,
        relationship=relationship,
        age=age,
        event_type=event_type,
        amount=amount,
        eligible=eligible,
        si_cap=si_cap,
        copay_pct=copay_pct,
        copay_ded=copay_ded,
        payout=payout,
        oop=oop,
        caveats=caveats,
        clauses=clauses,
    )
