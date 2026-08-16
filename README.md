# Policy Intelligence

Turns uploaded Indian health-insurance PDFs into a family protection dashboard, gap flags, and “what if?” scenarios — with every insight cited back to a policy clause.

This is **protection visibility**, not financial advice. The product does not sell insurance or compute coverage “sufficiency.”

## Why the architecture looks like this

Financial numbers must be exact. Language models invent numbers. So the system splits three jobs:

1. **Retrieval** — what does the policy say? (RAG)
2. **Calculation** — what are the rupees? (Python rules)
3. **Explanation** — how do we say this clearly? (LLM, grounded in retrieved clauses)

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 + Tailwind | Fast UI, free Vercel host |
| Backend | FastAPI | Fits a RAG + rules pipeline |
| PDF | PyMuPDF | Text-layer IRDAI PDFs |
| Vectors | ChromaDB embedded | ₹0, no extra service |
| Facts | SQLite | ₹0, enough for a single-family demo |
| LLM | Gemini Flash → Groq fallback | Free tiers |

## Local setup (Phase 1)

```bash
# Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env   # then add keys when you reach Phase 3
python -m db.init_db
python -m db.seed_demo
uvicorn main:app --reload --port 8000
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

- API health: http://localhost:8000/health
- UI: http://localhost:3000

## Demo family

Sharma family from the problem statement: Rahul (self), Priya (spouse), Arya (child), Ramesh (parent). Seeded by `python -m db.seed_demo`.

## Docs

- `policy-intelligence-problem-statement.md`
- `policy-intelligence-system-architecture.md`
- `policy-intelligence-implementation-plan.md`
- `policy-intelligence-prompt-library.md`
- `RULE.md`
