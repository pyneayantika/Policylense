"""
Indicative health sum-insured benchmarks by age and city tier.

WHY: '₹5L for a 63-year-old in Pune' needs a comparison point. These are
NOT adequacy verdicts — rules must flag as warning, never 'insufficient'.
"""

HEALTH_BENCHMARKS: dict[str, dict[tuple[int, int], int]] = {
    "metro": {
        (0, 30): 500_000,
        (31, 45): 1_000_000,
        (46, 60): 1_500_000,
        (61, 99): 2_000_000,
    },
    "non_metro": {
        (0, 30): 300_000,
        (31, 45): 500_000,
        (46, 60): 1_000_000,
        (61, 99): 1_500_000,
    },
}

METRO_CITIES = [
    "mumbai",
    "delhi",
    "bangalore",
    "bengaluru",
    "chennai",
    "kolkata",
    "hyderabad",
    "pune",
    "ahmedabad",
]


def city_tier(city: str | None) -> str:
    """Pune counts as metro for the Rahul persona demo."""
    if city and city.strip().lower() in METRO_CITIES:
        return "metro"
    return "non_metro"


def get_benchmark(age: int | None, city: str | None) -> int | None:
    """Look up indicative SI benchmark. None if age is missing."""
    if age is None:
        return None
    band = HEALTH_BENCHMARKS[city_tier(city)]
    for (lo, hi), value in band.items():
        if lo <= age <= hi:
            return value
    return None
