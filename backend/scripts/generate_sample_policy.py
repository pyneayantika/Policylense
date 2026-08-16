"""
Build a tiny *digitally generated* IRDAI-style PDF for pipeline tests.

WHY: Real insurer PDFs come later (Task 1.2). We still need a text-selectable
file tonight so extract → clean → section-detect can be verified without
waiting on irdai.gov.in downloads. This file mimics CIS, letterhead, ligatures,
coverage, exclusions, waiting periods, co-pay, and sub-limits.
"""

from pathlib import Path

import pymupdf as fitz

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "data" / "sample_policies"
OUTPUT = SAMPLE_DIR / "ramesh_star_health_sample.pdf"

PAGES = [
    """
Star Health and Allied Insurance Co. Ltd.
IRDAI Regn. No. : 129  UIN: SHAHLIP22028V072122
Regd. & Corporate Office: 1, New Tank Street, Chennai
CIN: L66010TN2005PLC056649
Page 1 of 3

Customer Information Sheet
This is a summary only. Please refer to the policy wording for full terms.
Sum Insured: ₹5,00,000
Co-payment: 20%
(Note: the above is a partial listing. Please refer to the policy clauses for the full listing)

Policy Wording
""",
    """
Star Health and Allied Insurance Co. Ltd.
IRDAI Regn. No. : 129
Page 2 of 3

DEFINITIONS
Hospitalization means admission in a Hospital for a minimum period of 24 consecutive hours.

II. Coverage
The Company agrees as under to pay the insured up to the Sum Insured of ₹5,00,000
for in-patient hospitalization expenses incurred in India, subject to the terms herein.

Section 1 In-Patient Hospitalization
Room rent is subject to a maximum of ₹5,000 per day. If a higher room is chosen,
proportionate deduction may apply to all associated charges.

Section 2 Pre-Hospitalization
Medical expenses incurred 60 days prior to hospitalization are payable.

WAITING PERIOD
Waiting Period I: Initial waiting period of 30 days from inception except accidents.
Waiting Period II: Specific listed diseases are excluded until expiry of 24 months.
Waiting Period III: Pre-existing Disease (PED) shall be excluded until 36 consecutive months
from the date of inception of the ﬁrst policy.
""",
    """
Star Health and Allied Insurance Co. Ltd.
Page 3 of 3

III. EXCLUSIONS
The Company shall not be liable to make any payment for:
A.1 Cosmetic surgery
A.2 Dental treatment unless requiring hospitalization
A.3 Self-inﬂicted injuries
A.4 Treatment for external congenital anomalies

CO-PAYMENT
A co-payment of 20% shall be borne by the insured on the claim amount admissible
and payable. Applicable to insured persons. This cost sharing applies to every eligible claim.

SUB-LIMITS
Cataract treatment is subject to a sub-limit of ₹40,000.
Ambulance charges are payable up to ₹2,000 per hospitalization.

CLAIM PROCEDURE
Cashless facility is available at network hospitals subject to pre-authorization.
The insured shall intimate the Company before planned hospitalization.

Please check whether the details given by you are correct.
""",
]


def build_sample_pdf(path: Path = OUTPUT) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    for page_text in PAGES:
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 50), page_text.strip(), fontsize=11, fontname="helv")
    doc.save(path)
    doc.close()
    print(f"[sample-pdf] Wrote {path} ({path.stat().st_size} bytes)")
    return path


if __name__ == "__main__":
    build_sample_pdf()
