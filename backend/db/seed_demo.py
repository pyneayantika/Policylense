"""
Seed the Sharma family from the problem statement.

WHY: The 72-hour demo must work even if PDF upload or LLM extraction fails.
Pre-loading Rahul / Priya / Arya / Ramesh lets the dashboard have a household
before any policy is ingested. Policy facts are added in later phases.
"""

from db.database import SessionLocal, create_all_tables
from db.models import Family, FamilyMember


DEMO_FAMILY_NAME = "Sharma Family"

MEMBERS = [
    {
        "name": "Rahul",
        "relationship": "self",
        "age": 32,
        "city": "Pune",
        "annual_income": 1_800_000,
    },
    {
        "name": "Priya",
        "relationship": "spouse",
        "age": 30,
        "city": "Pune",
        "annual_income": None,
    },
    {
        "name": "Arya",
        "relationship": "child",
        "age": 3,
        "city": "Pune",
        "annual_income": None,
    },
    {
        "name": "Ramesh",
        "relationship": "parent_1",
        "age": 63,
        "city": "Pune",
        "annual_income": None,
    },
]


def seed() -> str:
    create_all_tables()
    db = SessionLocal()
    try:
        existing = db.query(Family).filter(Family.name == DEMO_FAMILY_NAME).first()
        if existing:
            print(f"[seed] Family already exists id={existing.id}")
            return existing.id

        family = Family(name=DEMO_FAMILY_NAME)
        db.add(family)
        db.flush()

        for row in MEMBERS:
            db.add(FamilyMember(family_id=family.id, **row))

        db.commit()
        print(f"[seed] Created {DEMO_FAMILY_NAME} id={family.id}")
        for member in db.query(FamilyMember).filter(FamilyMember.family_id == family.id):
            print(f"  - {member.name} ({member.relationship}, {member.age})")
        return family.id
    finally:
        db.close()


if __name__ == "__main__":
    seed()
