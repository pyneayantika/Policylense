# Policy Intelligence — Project Rules

Persistent build rules derived from `policy-intelligence-system-architecture.md` and `policy-intelligence-implementation-plan.md`. Cursor also loads the split copies in `.cursor/rules/`.

**Protect the intelligence layer.** If behind schedule, simplify UI. Never ship a pretty dashboard with wrong numbers.

---

## Product boundaries

This product makes **existing coverage understandable**. It is not a recommender, underwriter, advisor, or claim-filing tool.

- Hedged language only: "may", "potential", "indicative". Never "insufficient", "you will pay", "guaranteed".
- Never recommend buying, switching, or cancelling insurance.
- Every user-facing insight must cite a policy clause (or say evidence was not found).
- Scenario results are always `confidence: "indicative"`.

**MVP in:** digitally generated English health PDFs, one household, indicative analysis.  
**MVP out:** OCR/scans, regional languages, auth, payments, production security.

---

## Architecture (non-negotiable)

Three jobs stay separate:

| Job | Question | Owner |
|---|---|---|
| Retrieval | What does the policy say? | RAG (Chroma + MiniLM) |
| Calculation | What are the rupees? | Python rules engine |
| Explanation | How do we say this? | LLM with retrieved evidence |

Trust chain: `Retrieve → Structure → Calculate → Reason → Explain → Evidence`.

Hybrid store: **Chroma** = unstructured clauses. **SQLite** = facts, family, flags, scenarios.

LLM never computes money. Rules engine never generates prose.

---

## Build order and gates

Follow implementation phases. Do not skip ahead past a failed gate.

1. Foundation (0–8): scaffold, schema, PDF extract → clean → sections  
2. Document intelligence (8–20): structure-aware chunks → embed → retrieve  
3. Extraction + rules (20–32): LLM JSON facts → validate → flags + score + scenario math  
4. API (32–44): services orchestrate only; no business logic in routes  
5. Frontend (44–60): setup → upload → dashboard → scenarios → chat  
6. Deploy + polish (60–72): Railway + Vercel + **Load Demo** fallback  

Never cut: protection dashboard with flags; scenario simulation (pre-defined buttons ok).  
May cut: chat, free-text scenarios, policy detail, mobile polish, extra concepts.

---

## Stack and layout

- Backend: Python FastAPI — `backend/` as in Arch §3.1  
- Frontend: Next.js 14 App Router + Tailwind + Recharts — `frontend/`  
- PDF: PyMuPDF. Reject scanned PDFs (`extracted text < 100 chars`).  
- Embeddings: `all-MiniLM-L6-v2` (384-dim), batch embed.  
- LLM: Gemini primary, Groq fallback, via `LLMProvider` abstraction.  
- Chunking: section/clause structure, not fixed 500-token windows.

---

## Env placeholders

Backend `.env`: `GEMINI_API_KEY`, `GROQ_API_KEY`, `PRIMARY_LLM`, `SQLITE_PATH`, `CHROMA_PATH`, `UPLOAD_DIR`, `MAX_PDF_SIZE_MB`, `MAX_CHUNKS_PER_POLICY`, `EMBEDDING_MODEL`, `CORS_ORIGINS`, `GEMINI_RPM_LIMIT`, `GROQ_RPM_LIMIT`.  
Frontend `.env.local`: `NEXT_PUBLIC_API_URL`.  
Never commit real keys.
