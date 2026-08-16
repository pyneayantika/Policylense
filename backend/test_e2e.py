"""
End-to-end API flow: family → upload PDF → protection → scenario → chat.

  python test_e2e.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient

from main import app

SAMPLE = Path(__file__).parent / "data" / "sample_policies" / "ramesh_star_health_sample.pdf"
MEMBERS = [
    {"name": "Rahul", "relationship": "self", "age": 32, "city": "Pune", "annual_income": 1_800_000},
    {"name": "Priya", "relationship": "spouse", "age": 30, "city": "Pune"},
    {"name": "Arya", "relationship": "child", "age": 3, "city": "Pune"},
    {"name": "Ramesh", "relationship": "parent_1", "age": 63, "city": "Pune"},
]


def pick_pdf() -> Path:
    if SAMPLE.exists():
        return SAMPLE
    from scripts.generate_sample_policy import build_sample_pdf

    return build_sample_pdf()


def main() -> None:
    pdf = pick_pdf()
    with TestClient(app) as client:
        client.timeout = 300.0
        health = client.get("/health")
        print(f"1. GET /health -> {health.status_code} {health.json()}")
        assert health.status_code == 200

        created = client.post("/api/v1/family", json={"name": "E2E Sharma Family"})
        print(f"2. POST /family -> {created.status_code} {created.json()}")
        assert created.status_code == 200
        family_id = created.json()["id"]

        member_ids: dict[str, str] = {}
        for row in MEMBERS:
            res = client.post(f"/api/v1/family/{family_id}/members", json=row)
            print(f"3. POST member {row['name']} -> {res.status_code}")
            assert res.status_code == 200
            member_ids[row["name"]] = res.json()["id"]

        family = client.get(f"/api/v1/family/{family_id}")
        print(f"4. GET /family -> {len(family.json()['members'])} members")
        assert len(family.json()["members"]) == 4

        print(f"5. Uploading {pdf.name} (ingestion may take a minute)...")
        with pdf.open("rb") as handle:
            upload = client.post(
                f"/api/v1/family/{family_id}/policies/upload",
                data={"member_id": member_ids["Ramesh"], "policy_type": "health"},
                files={"file": (pdf.name, handle, "application/pdf")},
            )
        print(
            f"   upload -> {upload.status_code} {upload.json().get('ingestion_status')} "
            f"id={upload.json().get('id')}"
        )
        assert upload.status_code == 200
        policy = upload.json()
        policy_id = policy["id"]
        if policy.get("ingestion_status") == "failed":
            print(f"   FAIL ingest: {policy.get('ingestion_error')}")
            sys.exit(1)

        status = client.get(f"/api/v1/policies/{policy_id}/status")
        facts = client.get(f"/api/v1/policies/{policy_id}/facts")
        print(f"6. GET status -> {status.json()}")
        pf = facts.json().get("policy_facts") or {}
        print(f"   facts SI={pf.get('sum_insured')} copay={pf.get('copay_percent')}")

        protection = client.get(f"/api/v1/family/{family_id}/protection")
        body = protection.json()
        print(
            f"7. GET /protection -> score={body.get('overall_score')} "
            f"flags={len(body.get('flags') or [])}"
        )
        for flag in (body.get("flags") or [])[:6]:
            print(f"   [{flag.get('severity')}] {flag.get('title')}")
        assert protection.status_code == 200
        assert body.get("overall_score") is not None
        assert len(body.get("flags") or []) >= 2

        scenario = client.post(
            f"/api/v1/family/{family_id}/scenarios",
            json={"scenario_text": "What if my father is hospitalized for 7 lakh?"},
        )
        sc = scenario.json()
        print(f"8. POST /scenarios -> {scenario.status_code}")
        proj = sc.get("financial_projection") or {}
        print(
            f"   cap={proj.get('sum_insured_cap')} copay={proj.get('copay_deduction')} "
            f"payout={proj.get('estimated_insurer_payout')} oop={proj.get('estimated_out_of_pocket')} "
            f"confidence={sc.get('confidence')}"
        )
        print(f"   explanation: {(sc.get('explanation') or '')[:220]}...")
        assert scenario.status_code == 200
        assert sc.get("confidence") == "indicative"
        assert int(proj.get("estimated_insurer_payout") or 0) == 400_000
        assert int(proj.get("estimated_out_of_pocket") or 0) == 300_000

        chat = client.post(
            f"/api/v1/family/{family_id}/chat",
            json={"question": "What is the co-pay percentage?", "policy_id": policy_id},
        )
        ch = chat.json()
        print(f"9. POST /chat -> {chat.status_code} confidence={ch.get('confidence')}")
        print(f"   answer: {(ch.get('answer') or '')[:280]}")
        print(f"   evidence chunks: {len(ch.get('evidence') or [])}")
        print(f"   follow-ups: {ch.get('follow_up_suggestions')}")
        assert chat.status_code == 200
        assert ch.get("answer")
        lowered = (ch.get("answer") or "").lower()
        if "couldn't find" not in lowered:
            assert "20" in (ch.get("answer") or "") or ch.get("evidence")

        print("\nPASS")


if __name__ == "__main__":
    main()
