# Insurance Policy Analyzer — UI Mockups

All screens for the PolicyLens insurance analysis app.

---

## 1a · Family Setup — `app/page.tsx`

**Header:** PolicyLens logo | Step 1 of 3

### Set up your family
> We'll analyze coverage for everyone. Add all family members covered under your policies.

**Family Name:** `Sharma Family`

### Add Family Member Form
| Field        | Value/Placeholder |
|-------------|-------------------|
| Name        | Enter name        |
| Relationship| Self (dropdown: Self, Spouse, Child, Parent, Sibling) |
| Age         | Age               |
| City        | City              |

**[+ Add Member]** button (green, #1a6b5a)

### Family Members (3)
| Avatar | Name           | Details            |
|--------|----------------|--------------------|
| RS     | Rajesh Sharma  | Self · 42 · Mumbai |
| PS     | Priya Sharma   | Spouse · 38 · Mumbai |
| AS     | Aarav Sharma   | Child · 8 · Mumbai |

Each member row has an × delete button.

**[Continue to Upload →]** button (dark, #1a1a1a)

---

## 1b · Upload — `app/upload/page.tsx`

**Header:** ← Upload Policies | Step 2 of 3

> Upload your insurance policy PDFs. We'll extract and analyze the coverage details automatically.

### For Member
Dropdown selector showing avatar + name (e.g. RS · Rajesh Sharma), bordered green when active.

### Type Selector
Two toggle buttons side by side:
- **Health Insurance** (selected, green fill)
- Life Insurance (unselected, gray outline)

### Drag-Drop Zone
Dashed border container:
- Upload icon
- "Drop PDF here"
- "or tap to browse · Max 10MB"

### Uploaded File — Complete
Card: `HDFC_Ergo_Health_2024.pdf` · 2.4 MB · Health Insurance · **Complete**

**Progress Steps (all ✓ green):**
1. ✅ Extracting text...
2. ✅ Analyzing coverage...
3. ✅ Understanding terms...
4. ✅ Detecting gaps...
5. ✅ Complete!

### Uploaded File — In Progress
Card (amber border): `Max_Life_Term_2023.pdf` · 1.8 MB · Life Insurance · **Analyzing...**
- Progress bar at ~60%

**[🏠 View Dashboard]** button (dark)

---

## 1c · Dashboard (Hero Screen) — `app/dashboard/page.tsx`

**Header:** PolicyLens logo + "Sharma Family" | 🔔 notification + RS avatar

### Protection Score Ring
Dark green gradient card (#0f2922 → #1a4a3a):
- **Donut ring** (SVG): Score **62** of 100, amber stroke (#f59e0b)
- Label: "PROTECTION SCORE"
- Status: **Needs Attention** (amber)
- "3 policies analyzed · 2 gaps found"

### Family Coverage
| Avatar | Name           | Health     | Life      | Status Dot |
|--------|---------------|------------|-----------|------------|
| RS     | Rajesh Sharma | **₹10L**  | **₹1Cr** | 🟡 amber   |
| PS     | Priya Sharma  | **₹10L**  | None      | 🔴 red     |
| AS     | Aarav Sharma  | **₹10L**  | N/A       | 🟢 green   |

### Coverage Flags

#### 🔴 CRITICAL — No life cover for Priya
Priya has no life insurance. If she contributes to household income, this is a significant financial risk.

*Evidence: No life insurance policy found for member Priya Sharma*

**Why This Matters:** Without life cover, the family would lose financial support if Priya were no longer able to contribute. At age 38, term insurance premiums are still affordable.

#### 🟡 WARNING — Room rent sub-limit detected
HDFC Ergo policy has a `room rent` sub-limit of ₹5,000/day. Private rooms in Mumbai average ₹8,000–12,000/day.

*Evidence: Section 4.2.1 — "Room rent limited to ₹5,000 per day"*

**Why This Matters:** Exceeding the room rent limit triggers `proportionate deduction` on ALL charges — not just the room. A ₹5L bill could pay out only ₹3.1L.

### Bottom Nav
`[Dashboard]` · Scenarios · Chat · Learn

---

## 1d · Scenarios — `app/scenarios/page.tsx`

**Header:** "What If...?" | RS avatar

> See how your insurance handles real medical scenarios.

### Scenario For
Dropdown: RS · Rajesh Sharma

### Quick Buttons
- **₹5L hospitalization** (selected, green)
- ₹7L hospitalization
- ₹10L hospitalization

### Scenario Result — ₹5,00,000 Hospitalization
For Rajesh · HDFC Ergo Health

| Line Item                  | Amount       |
|---------------------------|-------------|
| Total Bill                | ₹5,00,000   |
| Room rent excess          | – ₹42,000   |
| `Proportionate deduction` | – ₹78,400   |
| `Co-pay` (20%)            | – ₹75,920   |
| **Insurance pays**        | **₹3,03,680** (green) |
| **You pay**               | **₹1,96,320** (red)   |

**Caveats:** Room at ₹8,000/day (limit: ₹5,000). Proportionate deduction applies to surgery, medicines, and ICU charges. Amounts are estimates based on policy terms.

*Evidence: Section 4.2.1 (room rent), Section 5.1 (co-pay), Section 4.3 (proportionate clause)*

*Disclaimer: This is an illustrative estimate, not a claim guarantee. Actual settlement depends on hospital bills, TPA assessment, and insurer discretion.*

### Bottom Nav
Dashboard · `[Scenarios]` · Chat · Learn

---

## 1e · Chat — `app/chat/page.tsx`

**Header:** "Ask PolicyLens" | `AI-Powered` badge (green)

### Message Thread

**🤖 AI:** I've analyzed your 3 policies. Your biggest concern is the `room rent sub-limit` in the HDFC Ergo policy. In a ₹5L hospitalization, you could end up paying ~₹2L out of pocket.

> **Evidence** | 🟢 High Confidence
> "Room rent is limited to ₹5,000 per day or 1% of Sum Insured, whichever is lower" — HDFC Ergo, Section 4.2.1
> ▼ Show 2 more clauses

**👤 User:** What happens if I upgrade to a room without sub-limits?

**🤖 AI:** Great question! Without the `room rent` sub-limit, that same ₹5L hospitalization scenario would look very different:

| Current    | → | No sub-limit |
|-----------|---|-------------|
| **₹1.96L** (red) | → | **₹0.76L** (green) |
| you pay    |   | you pay     |

🟡 Medium Confidence · estimate varies by hospital

### Follow-up Chips
- `Compare plans without sub-limits` (green outline)
- `Run ₹10L scenario`
- `Explain co-pay impact`

### Input
Text field: "Ask about your policies..." + Send button (green)

### Bottom Nav
Dashboard · Scenarios · `[Chat]` · Learn

---

## 1f · SmartText + ExplainerModal

Shows a bottom-sheet modal over dimmed dashboard content.

### Modal: Room Rent Limit
Coverage · Difficulty ●●●○○

**Definition:** A daily cap on room charges. If you exceed it, **ALL** charges may be reduced proportionally — not just the room.

**⚠️ Common misconception:** Most people don't realize exceeding room rent can reduce surgeon fees, medicines, everything — not just the room charge.

### In Your Policy
Your HDFC Ergo policy limits room rent to **₹5,000/day**. Private rooms in Mumbai average ₹8,000–12,000/day. Choosing a ₹10,000 room means exceeding the limit by 100%.

### Impact Visualization (Shock Comparison)
| Expected Payout | Actual Payout |
|-----------------|--------------|
| **₹5.0L** (green) | **₹3.1L** (red) |
| what you think   | what you get  |

**₹1.9L gap** — from your pocket

### Quick Check ✓
**Q:** If your room rent limit is ₹5,000/day and you pick a ₹10,000 room, what happens to your surgery charges?

- A. Nothing — surgery is separate
- **B. They're also reduced proportionally ✓** (selected, green)
- C. Surgery is fully covered always

**Correct!** When you exceed room rent limits, the insurer applies proportionate deduction to ALL charges — surgery, medicines, ICU, everything.

### Related Concepts
`Sub-limit →` · `Proportionate Deduction →` · `Co-pay →`

---

## 1g · Learn — `app/learn/page.tsx`

**Header:** "Learn Insurance" | `15 concepts` badge

### Coverage (green accent bar)
| Concept          | Difficulty | Description                              |
|-----------------|-----------|------------------------------------------|
| Sum Insured     | ●○○○○     | The maximum your insurer will pay in a year |
| Sub-limit       | ●●●●○     | Hidden caps on specific treatments        |
| Restoration     | ●●●○○     | When your sum insured refills after use   |
| Network Hospital| ●○○○○     | Hospitals with cashless claim agreements  |

### Cost Sharing (amber accent bar)
| Concept          | Difficulty | Description                              |
|-----------------|-----------|------------------------------------------|
| Co-pay          | ●●○○○     | Your share of every claim amount          |
| Deductible      | ●●○○○     | Amount you pay before insurance kicks in  |
| Room Rent Limit | ●●●●●     | Daily cap that affects all charges        |
| No Claim Bonus  | ●●○○○     | Reward for not making claims              |

### Conditions (red accent bar)
| Concept          | Difficulty | Description                              |
|-----------------|-----------|------------------------------------------|
| Waiting Period  | ●●●○○     | Time before certain conditions are covered|
| Exclusion       | ●●○○○     | What your policy won't cover              |
| Prop. Deduction | ●●●●●     | All charges reduced when you exceed limits|

### Process (indigo accent bar)
| Concept          | Difficulty | Description                              |
|-----------------|-----------|------------------------------------------|
| Pre-auth        | ●●○○○     | Approval needed before planned procedures |
| Cashless Claim  | ●○○○○     | Hospital bills paid directly by insurer   |

### Bottom Nav
Dashboard · Scenarios · Chat · `[Learn]`

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1a6b5a` | Buttons, links, safe states |
| Primary Dark | `#0f2922` | Dashboard score card bg |
| Amber | `#f59e0b` | Warnings, score ring |
| Red | `#dc2626` / `#ef4444` | Critical flags, negative amounts |
| Green | `#22c55e` | Safe status, confidence high |
| Dark | `#1a1a1a` | CTA buttons, nav active |
| Body BG | `#f0eee9` | Page background |
| Card BG | `#ffffff` | Card surfaces |
| Font | DM Sans | Body text |
| Font Mono | DM Mono | Badges, labels |

### Semantic Card Patterns
- **Critical:** bg `#fef2f2`, text `#dc2626`, border `#fecaca`
- **Warning:** bg `#fffbeb`, text `#d97706`, border `#fde68a`
- **Safe:** bg `#f0faf7`, text `#1a6b5a`, border `#d0ece5`
- **Info:** bg `#f0f4ff`, text `#1e40af`, border `#dbeafe`

### SmartText Highlight
Insurance terms rendered with: `background:#fef3c7; padding:1px 4px; border-radius:3px; border-bottom:1.5px dashed #d97706; cursor:pointer`

---

## Concept Data (Top 5)

### COPAY
- **Definition:** The percentage of every claim YOU pay from your pocket, even with insurance.
- **Misconception:** People think insurance pays full bill. With co-pay, you always share.
- **Visual:** split_bar (insurer pays vs you pay)

### SUM_INSURED
- **Definition:** The maximum your insurer will pay in a policy year. The ceiling, not a guarantee.
- **Misconception:** People assume SI = amount received. Co-pay, sub-limits, exclusions reduce it.
- **Visual:** container_fill (claim fitting inside or overflowing SI)

### WAITING_PERIOD
- **Definition:** A time window after buying when certain conditions are NOT covered.
- **Misconception:** People think they're covered immediately. PED may not be covered for 2-4 years.
- **Visual:** timeline (policy start → today → waiting end)

### ROOM_RENT_LIMIT
- **Definition:** A daily cap. If you exceed it, ALL charges may be reduced proportionally — not just room.
- **Misconception:** Most misunderstood term. Exceeding room rent can reduce surgeon fees, medicines, everything.
- **Visual:** shock_comparison (expected vs actual payout)

### SUB_LIMIT
- **Definition:** A hidden cap on specific treatments INSIDE your sum insured.
- **Misconception:** Most don't know sub-limits exist. ₹10L SI doesn't mean ₹10L for every treatment.
- **Visual:** nested_boxes (large SI box with small sub-limit box inside)
