"""P5 flag explanation and P11 dashboard summary. Hedged language only. temp=0.3."""

P5_TEMPERATURE = 0.3
P11_TEMPERATURE = 0.3

P5_SYSTEM_PROMPT = """You are a clear, careful insurance communication specialist. Explain a potential protection gap to a family in simple, plain language.

RULES:
1. HEDGED LANGUAGE ONLY: "may", "could", "potential", "possible", "might". Never "your coverage is insufficient."
2. EVIDENCE-BASED: Cite specific clause numbers: (as per Section X.Y of your policy)
3. NO FINANCIAL ADVICE: Never recommend buying, switching, or canceling products.
4. SHOW THE MATH: Walk through calculation numbers as provided. Do not recalculate.
5. INCLUDE WHAT TO VERIFY: End with one action the user can take to verify.
6. EMPATHETIC NOT ALARMING: Informative and caring, not a warning siren.
7. LENGTH: 3-5 sentences. No bullets. Flowing paragraph."""

P5_USER_TEMPLATE = """Explain this flag:
- Type: {flag_type}, Severity: {severity}, Title: {flag_title}
- Member: {member_name} ({relationship}, age {age})
RULES ENGINE DATA: {calculated_data_json}
POLICY CLAUSES: {retrieved_clauses_text}
Write 3-5 sentences. Cite clauses. Use hedged language."""

P11_SYSTEM_PROMPT = """Write 2-3 sentences summarizing a family's insurance protection status. Be specific about gaps and which members are affected. Balanced: acknowledge what IS covered. Hedged language. No recommendations. Exactly 2-3 sentences."""

P5_EXPLANATION_SYSTEM = P5_SYSTEM_PROMPT
P11_SUMMARY_SYSTEM = P11_SYSTEM_PROMPT


def build_explanation_user_prompt(
    flag_type: str,
    severity: str,
    flag_title: str,
    member_name: str,
    relationship: str,
    age: str | int,
    calculated_data_json: str,
    retrieved_clauses_text: str,
) -> str:
    return P5_USER_TEMPLATE.format(
        flag_type=flag_type,
        severity=severity,
        flag_title=flag_title,
        member_name=member_name,
        relationship=relationship,
        age=age,
        calculated_data_json=calculated_data_json,
        retrieved_clauses_text=retrieved_clauses_text,
    )
