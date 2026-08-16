"""
Currency formatting helpers.

WHY: The rules engine produces raw floats. The UI and explanations need
Indian-style display (₹5,00,000) without the LLM inventing those strings.
"""


def format_inr(amount: float | int | None) -> str:
    """Format a number as Indian rupees. Does not calculate — only displays."""
    if amount is None:
        return "—"
    n = int(round(amount))
    s = str(abs(n))
    if len(s) <= 3:
        body = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups: list[str] = []
        while rest:
            groups.append(rest[-2:])
            rest = rest[:-2]
        body = ",".join(reversed(groups)) + "," + last3
    sign = "-" if n < 0 else ""
    return f"{sign}₹{body}"
