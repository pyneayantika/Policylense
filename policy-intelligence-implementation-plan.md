# Policy Intelligence: Phase-Wise Implementation Plan

---

## Document Context

This implementation plan is a direct derivative of the **Policy Intelligence System Architecture & Design** document. Every task below maps to a specific architecture component, data flow pipeline, or design decision defined there. References are provided as `[Arch §X.Y]` throughout.

---

## Implementation Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    72-HOUR BUILD — 6 PHASES                        │
│                                                                     │
│  Phase 1 ──── Phase 2 ──── Phase 3 ──── Phase 4 ──── Phase 5 ──── Phase 6
│  Foundation   Document     RAG +        API +        Frontend      Deploy
│  + Setup      Intelligence Extraction   Orchestration + UI         + Polish
│                                                                     │
│  Hours 0–8    Hours 8–20   Hours 20–32  Hours 32–44  Hours 44–60   Hours 60–72
│                                                                     │
│  GATE ✓       GATE ✓       GATE ✓       GATE ✓       GATE ✓        GATE ✓
│  PDF works    Chunks work  RAG returns  APIs return  Dashboard     Live demo
│               correctly    evidence     real data    renders       working
└─────────────────────────────────────────────────────────────────────┘
```

**The single most important rule for this build:** Protect the intelligence layer at all costs. If you're behind schedule, cut frontend scope (simpler UI, fewer screens) — never cut the backend pipeline quality. A beautiful dashboard showing wrong data is worse than an ugly dashboard showing correct protection flags.

---

## Phase 1: Foundation & Setup

**Hours 0–8 | Goal: Project skeleton + PDF extraction working**

This phase establishes the entire project structure, database, sample data, and the first piece of the pipeline — getting clean text out of insurance PDFs.

---

### Task 1.1 — Project Scaffolding (Hours 0–2)

**Maps to:** [Arch §3.1 Backend Component Map]

**What you're building:** The complete folder structure for both backend and frontend, with configuration wired up and the database schema created.

**Why this matters:** A clean project structure means every file you create later has a predictable home. This prevents the "dump everything in one file and refactor later" trap that kills you at hour 50.

**Steps:**

```
1.1.1  Create GitHub repository: policy-intelligence
       - Add .gitignore (Python + Node)
       - Add README.md placeholder
       - Create two top-level directories: /backend and /frontend

1.1.2  Backend scaffolding (Python + FastAPI)
       Initialize the full directory structure from [Arch §3.1]:
       backend/
       ├── main.py
       ├── config.py
       ├── requirements.txt
       ├── api/routes/          (empty __init__.py in each)
       ├── api/middleware/
       ├── core/pdf_engine/
       ├── core/chunking/
       ├── core/rag/
       ├── core/extraction/
       ├── core/rules/
       ├── core/llm/
       ├── core/llm/prompts/
       ├── db/
       ├── services/
       └── utils/

       In main.py, set up a minimal FastAPI app with:
       - CORS middleware (allow Vercel origin)
       - A health check endpoint: GET /health → {"status": "ok"}

1.1.3  config.py — Environment & settings
       Use pydantic-settings to load environment variables:
       - GEMINI_API_KEY
       - GROQ_API_KEY
       - PRIMARY_LLM (default: "gemini")
       - SQLITE_PATH (default: "./data/policy_intel.db")
       - CHROMA_PATH (default: "./data/chroma")
       - UPLOAD_DIR (default: "./data/uploads")
       - MAX_PDF_SIZE_MB (default: 10)
       - EMBEDDING_MODEL (default: "all-MiniLM-L6-v2")

1.1.4  requirements.txt — Pin all dependencies
       fastapi>=0.100.0
       uvicorn[standard]>=0.23.0
       python-multipart>=0.0.6
       pydantic>=2.0
       pydantic-settings>=2.0
       sqlalchemy>=2.0
       pymupdf>=1.23.0
       chromadb>=0.4.0
       sentence-transformers>=2.2.0
       google-generativeai>=0.3.0
       groq>=0.4.0
       python-dotenv>=1.0

1.1.5  SQLite database initialization
       Create db/init_db.py that executes the full schema from [Arch §5.1]:
       - family, family_member, policy, policy_facts
       - policy_exclusions, policy_sublimits
       - protection_flags, scenario_results
       - All indexes
       Run it once to create the .db file.

1.1.6  Frontend scaffolding (Next.js)
       npx create-next-app@latest frontend --typescript --tailwind --app
       Install: recharts, lucide-react
       Create page stubs:
       - app/page.tsx (landing)
       - app/dashboard/page.tsx
       - app/upload/page.tsx
       - app/scenarios/page.tsx
       - app/chat/page.tsx

1.1.7  Verify both run locally
       Backend:  uvicorn main:app --reload → GET /health returns 200
       Frontend: npm run dev → page renders at localhost:3000
```

**Deliverable:** Both apps running locally. Database created with full schema. All folders in place.

**Verification:** `curl localhost:8000/health` returns `{"status": "ok"}`.

---

### Task 1.2 — Sample Data Preparation (Hours 2–4)

**Maps to:** [Arch §17.1 — "Sample data preparation"]

**What you're building:** The test dataset that everything else will be validated against. This is your ground truth.

**Why this matters:** You cannot test extraction, chunking, RAG, or rules without real policy documents. If you skip this, you'll build blind and discover at hour 40 that your chunker doesn't work on actual policies.

**Steps:**

```
1.2.1  Source 2-3 real insurance policy PDFs
       Where to find them:
       - IRDAI website publishes sample policy wordings
       - Insurance company websites have product brochures with policy terms
       - Search: "[insurer name] health insurance policy wording PDF"
       Target:
       - 1 health insurance policy (comprehensive, 30-60 pages)
       - 1 simpler health policy (basic, 10-20 pages)
       - 1 term life insurance policy (optional — health is priority for MVP)
       Save to: backend/data/sample_policies/

1.2.2  Manually annotate ground truth for each policy
       Create a JSON file per policy with expected extracted values:
       {
           "policy_name": "Star Health Comprehensive",
           "expected_facts": {
               "sum_insured": 500000,
               "copay_percent": 20,
               "room_rent_limit": 5000,
               "room_rent_type": "per_day",
               "ped_waiting_months": 48,
               "initial_waiting_months": 1,
               "network_required": true,
               "pre_auth_required": true
           },
           "expected_exclusions": [
               "Cosmetic surgery",
               "Dental unless requiring hospitalization",
               "Self-inflicted injuries"
           ],
           "expected_sections": [
               "Coverage", "Exclusions", "Waiting Period",
               "Co-payment", "Claim Process"
           ]
       }
       Save to: backend/data/ground_truth/

1.2.3  Create demo family profile
       Write a seed script (db/seed_demo.py) that inserts:
       - Family: "Sharma Family"
       - Members: Rahul (self, 32), Priya (spouse, 30),
                  Arya (child, 3), Ramesh (parent, 63)
       This is the persona from [Problem Statement §4].
```

**Deliverable:** 2-3 policy PDFs + ground truth JSON files + demo family seeded in SQLite.

**Verification:** Open each PDF manually — confirm it's text-selectable (not scanned).

---

### Task 1.3 — PDF Processing Pipeline (Hours 4–8)

**Maps to:** [Arch §6 PDF Processing Pipeline]

**What you're building:** The first three steps of the ingestion pipeline — extract raw text, clean it, and detect section boundaries.

**Why this matters:** This is the foundation of everything. If you can't get clean, structured text out of a policy PDF, nothing downstream works. The section detector is especially important because it directly feeds the chunking quality in Phase 2.

**Steps:**

```
1.3.1  Text extraction (core/pdf_engine/extractor.py)
       Build PolicyPDFExtractor class:
       - Open PDF using fitz (PyMuPDF)
       - Iterate all pages, extract text blocks
       - Concatenate in reading order
       - Return ExtractionResult:
         {raw_text, page_count, has_text, metadata}
       - If total text < 100 chars → set has_text = False
         (indicates scanned document — reject gracefully)

       Test against all sample policies.
       Expected: 10,000–50,000 characters of raw text per policy.

1.3.2  Text cleaning (core/pdf_engine/cleaner.py)
       Build PolicyTextCleaner class with the cleaning pipeline
       from [Arch §6.2]:
       - remove_page_headers_footers:
         Regex to strip "Page X of Y", insurer names in headers
       - remove_page_numbers:
         Lines that are just a number
       - normalize_whitespace:
         Collapse multiple newlines (>2) to double newline
         Collapse multiple spaces to single space
       - fix_hyphenation:
         Pattern: word fragment + hyphen + newline + word fragment
         → join into single word
       - normalize_currency:
         "Rs.", "Rs", "INR" → "₹"
       - remove_toc_artifacts:
         Lines matching "something ........ number" pattern

       Test: compare raw vs cleaned text for each sample policy.
       The cleaned text should be ~10-20% shorter and more readable.

1.3.3  Section detection (core/pdf_engine/section_detector.py)
       Build PolicySectionDetector class:
       - Use the KNOWN_SECTIONS dictionary from [Arch §6.3]
       - Scan cleaned text line by line
       - When a line matches a known section header pattern:
         Record: {section_name, section_type, start_line, end_line}
       - Handle variations:
         "SECTION 4: EXCLUSIONS" and "4. Exclusions" and
         "What Is Not Covered" should all map to section_type: "exclusions"
       - Output: List[Section] with hierarchy

       Test against sample policies:
       - Should detect at minimum: coverage, exclusions, waiting_period
       - Compare detected sections against ground truth expected_sections
```

**Deliverable:** A working pipeline that takes a PDF path and outputs cleaned text with detected section boundaries.

**Verification script:**

```python
# test_pdf_pipeline.py
extractor = PolicyPDFExtractor()
cleaner = PolicyTextCleaner()
detector = PolicySectionDetector()

result = extractor.extract("data/sample_policies/star_health.pdf")
assert result.has_text == True
assert result.page_count > 5

cleaned = cleaner.clean(result.raw_text)
assert len(cleaned) < len(result.raw_text)  # Cleaning reduced size

sections = detector.detect(cleaned)
assert len(sections) >= 3  # At least coverage, exclusions, waiting period
for s in sections:
    print(f"  {s.section_type}: lines {s.start_line}-{s.end_line}")
```

### Phase 1 Gate Check

```
✅ FastAPI backend runs locally with health check
✅ Next.js frontend renders locally
✅ SQLite database created with full schema
✅ Demo family seeded in database
✅ 2-3 sample policy PDFs sourced and ground truth annotated
✅ PDF → clean text → detected sections pipeline works
✅ Section detection finds ≥3 sections per policy
```

**If you pass this gate by hour 8:** You're on track. Move to Phase 2.
**If you're behind:** The most common blocker is section detection being too brittle. If it's catching less than 3 sections, loosen the matching (use substring matching instead of exact match, lowercase everything). Don't over-engineer it — good enough beats perfect at this stage.

---

## Phase 2: Document Intelligence Layer

**Hours 8–20 | Goal: Chunks with metadata stored in ChromaDB, retrievable**

This phase builds the core document intelligence — converting cleaned policy text into semantically meaningful, metadata-rich chunks and storing them in a searchable vector database.

---

### Task 2.1 — Structure-Aware Chunking (Hours 8–14)

**Maps to:** [Arch §7 Chunking Strategy]

**What you're building:** A chunking pipeline that respects the policy's section/clause structure instead of blindly cutting every 500 tokens.

**Why this matters:** This is the single highest-leverage investment in the entire system. Bad chunks → bad retrieval → bad answers → untrusted product. A clause about co-payment that's been split mid-sentence and merged with an unrelated exclusion clause will produce garbage retrieval results no matter how good your embeddings are.

**Steps:**

```
2.1.1  Structure chunker (core/chunking/structure_chunker.py)
       Build StructureAwareChunker class:

       Input: cleaned_text + List[Section] from section detector
       Output: List[PolicyChunk] with metadata

       Algorithm:
       a) For each detected section:
          - Split the section text on clause patterns:
            "(\d+\.\d+)", "(a)", "(b)", "(i)", "(ii)",
            "Clause \d+", "Article \d+"
          - Each clause becomes one chunk

       b) If no clause patterns found in a section:
          - Split on double newlines (paragraph boundaries)
          - Each paragraph becomes one chunk

       c) Size guard:
          - If chunk > 1000 tokens: split at nearest sentence boundary
          - If chunk < 50 tokens: merge with next chunk in same section
          - Never merge chunks across sections

       d) Attach structural metadata to each chunk:
          chunk.section_name = section.name
          chunk.section_type = section.type
          chunk.clause_number = detected clause number or "N/A"
          chunk.page_number = estimated from line count

2.1.2  Metadata enricher (core/chunking/metadata_enricher.py)
       For each chunk, detect and attach:

       a) content_type classification (keyword-based):
          - "coverage" if text contains: "covered", "payable", "eligible"
          - "exclusion" if text contains: "not covered", "excluded", "not payable"
          - "condition" if text contains: "subject to", "provided that", "condition"
          - "limit" if text contains: "maximum", "limit", "up to", "cap"
          - "process" if text contains: "claim", "submit", "notify", "intimate"
          - "definition" if text contains: "means", "refers to", "shall mean"

       b) financial_values extraction (regex):
          Pattern: ₹[\d,]+  or  \d+%  or  \d+ lakh  or  \d+ crore
          Store as list: ["₹5,000", "20%", "₹5,00,000"]

       c) entity tagging (keyword presence):
          - "room_rent" if text mentions room/rent/accommodation
          - "copay" if text mentions co-pay/copayment/cost sharing
          - "waiting_period" if text mentions waiting/moratorium
          - "sublimit" if text mentions sub-limit/internal limit/capping
          - "pre_auth" if text mentions pre-authorization/pre-authorisation
          - "network" if text mentions network/cashless/empanelled

2.1.3  Build the Pydantic model for PolicyChunk [Arch §7.3]
       @dataclass / Pydantic BaseModel with all fields:
       chunk_id, policy_id, text, level,
       section_name, section_type, clause_number, page_number,
       content_type, entities, financial_values

2.1.4  Test chunking quality
       For each sample policy, run the full pipeline and check:
       - Total chunks: expect 50-200 per policy
       - Average chunk size: expect 100-500 tokens
       - No chunk > 1000 tokens
       - No chunk < 50 tokens (unless last in section)
       - Section metadata is correct (spot-check 10 chunks manually)
       - Content type classification is reasonable (spot-check 10 chunks)

       Print a summary table:
       Policy | Total Chunks | Avg Size | Sections Detected | Coverage Chunks | Exclusion Chunks
```

**Deliverable:** A chunking pipeline that produces metadata-rich chunks from cleaned policy text.

**Verification:** Print 5 random chunks from each policy — each should have correct section_type, a meaningful text snippet, and at least one content_type tag.

---

### Task 2.2 — Embedding + Vector Storage (Hours 14–18)

**Maps to:** [Arch §8 RAG Architecture, §8.2 ChromaDB Collection Design]

**What you're building:** The embedding pipeline that converts chunks into vectors and stores them in ChromaDB for similarity search.

**Steps:**

```
2.2.1  Embedder (core/rag/embedder.py)
       Build ChunkEmbedder class:
       - Load sentence-transformers model: all-MiniLM-L6-v2
         (load once at startup, reuse for all embeddings)
       - Method: embed(text: str) → List[float] (384 dimensions)
       - Method: embed_batch(texts: List[str]) → List[List[float]]
         (batch embedding is 5-10x faster than one-at-a-time)

       Test: embed a simple sentence, verify output is a 384-dim vector.

2.2.2  Vector store (core/rag/vector_store.py)
       Build PolicyVectorStore class:
       - Initialize ChromaDB persistent client at CHROMA_PATH
       - Method: create_collection(family_id) → collection
       - Method: add_chunks(collection, chunks: List[PolicyChunk])
         Store each chunk with:
         - id: chunk.chunk_id
         - document: chunk.text
         - embedding: chunk.embedding
         - metadata: {
             policy_id, section_type, clause_number,
             content_type, page_number, has_financial_value
           }
       - Method: delete_policy(collection, policy_id)
         Remove all chunks for a specific policy (for re-ingestion)

       Note on ChromaDB metadata:
       - Chroma metadata values must be str, int, float, or bool
       - Lists (like entities) must be serialized to comma-separated string
       - Store has_financial_value as bool for filtering

2.2.3  Ingestion integration
       Create a function that chains:
       PDF path → extract → clean → detect sections → chunk → embed → store

       Run it on all sample policies.
       Verify: ChromaDB collection has expected number of chunks.

       Print: "Stored {N} chunks for policy {name} in ChromaDB"
```

**Deliverable:** All sample policy chunks embedded and stored in ChromaDB.

---

### Task 2.3 — Retrieval + Context Building (Hours 18–20)

**Maps to:** [Arch §8.1 Retrieval Strategy, §8.3 Query Construction]

**What you're building:** The retrieval pipeline that takes a user query, finds the most relevant policy chunks, and assembles them into context for the LLM.

**Steps:**

```
2.3.1  Retriever (core/rag/retriever.py)
       Build PolicyRetriever class:
       - Method: retrieve(query, family_id, filters=None, k=10)
         a) Embed the query using the same embedder
         b) Search ChromaDB with:
            - query_embedding
            - where: metadata filters (if provided)
            - n_results: k
         c) Return List[RetrievedChunk]:
            {chunk_text, section_type, clause_number,
             similarity_score, policy_id, page_number}

       - Method: retrieve_with_reranking(query, family_id, k=5)
         a) Retrieve top-10 from ChromaDB (broad recall)
         b) Re-score each result:
            final_score = similarity_score
                        + 0.15 (if section_type matches query intent)
                        + 0.10 (if chunk contains financial values
                                and query mentions amounts)
         c) Sort by final_score, return top-5

       Query intent detection (simple keyword-based):
       - "cover", "benefit", "eligible" → intent: coverage
       - "exclude", "not covered" → intent: exclusions
       - "waiting", "wait" → intent: waiting_period
       - "co-pay", "copay", "out of pocket" → intent: copay
       - "claim", "process", "file" → intent: claim_process
       - "limit", "cap", "maximum" → intent: sublimits

2.3.2  Context builder (core/rag/context_builder.py)
       Build ContextBuilder class:
       - Method: build_context(retrieved_chunks) → str
         Assembles retrieved chunks into a structured prompt context:

         """
         POLICY EVIDENCE:

         [Source: Section 4.2 — Hospitalization Benefits | Policy: Star Health]
         Coverage is subject to a maximum room rent of ₹5,000 per day...

         [Source: Section 8.1 — Co-Payment | Policy: Star Health]
         A co-payment of 20% shall be borne by the insured...

         [Source: Section 12.3 — Sub-Limits | Policy: Star Health]
         Cataract treatment is subject to a sub-limit of ₹40,000...
         """

       Each chunk is clearly labeled with its source for LLM citation.

2.3.3  Retrieval quality test
       Run these 5 test queries and verify the top-3 results are relevant:

       Query 1: "What is the co-payment percentage?"
       → Should retrieve chunks from copay/co-payment section

       Query 2: "What is not covered under this policy?"
       → Should retrieve chunks from exclusions section

       Query 3: "How long is the waiting period for pre-existing diseases?"
       → Should retrieve chunks from waiting period section

       Query 4: "What is the room rent limit?"
       → Should retrieve chunks mentioning room/rent/accommodation

       Query 5: "How do I file a claim?"
       → Should retrieve chunks from claim process section

       Log: For each query, print top-3 chunks with scores.
       At least 4 of 5 queries should return relevant top-1 results.
```

**Deliverable:** A working retrieval pipeline. Query → relevant chunks with evidence citations.

### Phase 2 Gate Check

```
✅ Structure-aware chunker produces 50-200 chunks per policy
✅ Each chunk has section_type, clause_number, content_type metadata
✅ No chunks > 1000 tokens, no chunks < 50 tokens
✅ All sample policy chunks embedded in ChromaDB
✅ 5/5 test retrieval queries return relevant top-1 results
✅ Context builder formats chunks with source citations
```

**If you pass this gate by hour 20:** Your document intelligence layer is solid. This is the hardest part — it gets easier from here.
**If you're behind:** Most likely cause is section detection missing sections, causing chunks to lose metadata. Quick fix: fall back to paragraph-level chunks for undetected sections — metadata-less chunks are better than no chunks.

---

## Phase 3: Extraction + Rules Engine

**Hours 20–32 | Goal: Structured policy facts in SQLite + protection flags generated**

This phase builds the "brain" — extracting machine-readable facts from policy text using the LLM, and running deterministic rules to detect protection gaps.

---

### Task 3.1 — LLM Provider Setup (Hours 20–22)

**Maps to:** [Arch §10 LLM Integration Layer]

**Steps:**

```
3.1.1  LLM provider abstraction (core/llm/provider.py)
       Build abstract base class LLMProvider:
       - async complete(system_prompt, user_prompt, temperature, max_tokens)
         → LLMResponse {text, tokens_used, provider_name}

3.1.2  Gemini client (core/llm/gemini_client.py)
       - Initialize google.generativeai with GEMINI_API_KEY
       - Model: gemini-2.5-flash (or gemini-2.0-flash if 2.5 unavailable)
       - Implement complete() method
       - Add rate limit tracking: count requests per minute
       - If approaching 15 RPM → signal fallback needed

3.1.3  Groq client (core/llm/groq_client.py)
       - Initialize Groq client with GROQ_API_KEY
       - Model: llama-3.1-8b-instant
       - Implement complete() method
       - Add rate limit tracking: count requests per minute

3.1.4  LLM router (core/llm/provider.py)
       Build LLMRouter class:
       - Primary: Gemini
       - Fallback: Groq (activated when Gemini rate-limited)
       - Method: get_provider() → returns available provider
       - Log every fallback event for debugging

3.1.5  Test: send a simple prompt to both providers
       Prompt: "Extract the sum insured from this text: 'Sum Insured: ₹5,00,000'"
       Verify both return sensible responses.
```

**Deliverable:** LLM abstraction with Gemini primary + Groq fallback, both tested.

---

### Task 3.2 — Structured Policy Extraction (Hours 22–28)

**Maps to:** [Arch §10.2 Prompt Architecture — PROMPT 1: EXTRACTION]

**What you're building:** The system that converts policy text chunks into machine-readable JSON facts stored in SQLite.

**Why this matters:** This is where unstructured text becomes computable data. The rules engine in Task 3.3 needs structured facts — it can't reason over raw text. The quality of extraction directly determines the quality of every downstream feature (dashboard scores, gap detection, scenario simulation).

**Steps:**

```
3.2.1  Extraction prompt (core/llm/prompts/extraction.py)
       Build the extraction prompt template:

       SYSTEM PROMPT:
       """
       You are a policy document analyst. Extract structured facts from
       insurance policy text. Return ONLY valid JSON. Do not infer values
       not explicitly stated in the text. For any field where the value
       is not clearly stated, use null.

       Output format:
       {
         "sum_insured": number or null,
         "copay_percent": number or null,
         "deductible": number or null,
         "room_rent_limit": number or null,
         "room_rent_type": "per_day" | "percentage" | "no_limit" | null,
         "ped_waiting_months": number or null,
         "initial_waiting_months": number or null,
         "network_required": boolean or null,
         "pre_auth_required": boolean or null,
         "covers_members": ["self", "spouse", "child"] or null,
         "exclusions": [{"text": "...", "type": "permanent"|"waiting_period"|"conditional"}],
         "sublimits": [{"treatment": "...", "limit_amount": number, "limit_type": "absolute"|"percentage_of_si"}],
         "confidence": 0.0-1.0
       }
       """

       USER PROMPT:
       """
       Extract policy facts from the following insurance policy sections:

       {concatenated text of coverage + exclusion + waiting period +
        copay + sublimit chunks — the key chunks, not all chunks}
       """

       Temperature: 0.0 (deterministic extraction)

3.2.2  Policy extractor (core/extraction/policy_extractor.py)
       Build PolicyFactExtractor class:
       - Method: extract_facts(policy_id, chunks: List[PolicyChunk])
         a) Select key chunks:
            - All chunks with section_type in:
              [coverage, exclusions, waiting_period, copay, sublimits]
            - Concatenate their text (respect LLM context window — if
              total > 6000 tokens, prioritize coverage + copay + exclusions)
         b) Send to LLM with extraction prompt
         c) Parse JSON response → Pydantic PolicyFacts model
         d) Return PolicyFacts + raw LLM response for debugging

3.2.3  Pydantic schemas (core/extraction/schemas.py)
       Define strict Pydantic models:
       - PolicyFactsRaw (mirrors LLM JSON output)
       - PolicyFactsValidated (after validation)
       - ExclusionItem
       - SublimitItem

3.2.4  Extraction validator (core/extraction/validator.py)
       Build ExtractionValidator class:
       - Check: sum_insured is a positive number if present
       - Check: copay_percent is between 0 and 100 if present
       - Check: waiting periods are positive integers if present
       - Check: at least sum_insured OR copay_percent was extracted
         (if neither, extraction likely failed)
       - Assign overall confidence score:
         High (>0.8): sum_insured + copay + waiting_period all extracted
         Medium (0.5-0.8): sum_insured extracted but some fields missing
         Low (<0.5): sum_insured not extracted
       - Flag low-confidence extractions for manual review

3.2.5  SQLite persistence
       Write validated facts to policy_facts, policy_exclusions,
       and policy_sublimits tables [Arch §5.1].
       Update policy.ingestion_status = 'completed'.

3.2.6  Test against ground truth
       For each sample policy:
       a) Run extraction pipeline
       b) Compare extracted values against ground truth JSON from Task 1.2
       c) Log discrepancies
       d) Target: ≥80% field accuracy (e.g., sum_insured, copay, PED waiting)

       Example validation output:
       Policy: Star Health Comprehensive
       ┌──────────────────────┬────────────┬───────────┬────────┐
       │ Field                │ Expected   │ Extracted │ Match? │
       ├──────────────────────┼────────────┼───────────┼────────┤
       │ sum_insured          │ 500000     │ 500000    │ ✅     │
       │ copay_percent        │ 20         │ 20        │ ✅     │
       │ room_rent_limit      │ 5000       │ 5000      │ ✅     │
       │ ped_waiting_months   │ 48         │ 48        │ ✅     │
       │ network_required     │ true       │ true      │ ✅     │
       │ pre_auth_required    │ true       │ null      │ ❌     │
       └──────────────────────┴────────────┴───────────┴────────┘
       Accuracy: 5/6 = 83% ✅
```

**Deliverable:** Extraction pipeline that converts policy chunks into validated structured facts in SQLite.

---

### Task 3.3 — Rules Engine (Hours 28–32)

**Maps to:** [Arch §9 Rules Engine Design]

**What you're building:** The deterministic rules that detect protection gaps and calculate financial exposure using the structured facts from Task 3.2.

**Why this matters:** This is the component that makes the product intelligent rather than just a summarizer. Without the rules engine, you have a policy reader. With it, you have protection intelligence.

**Steps:**

```
3.3.1  Rules engine orchestrator (core/rules/engine.py)
       Build RulesEngine class:
       - Method: evaluate(family_id) → List[ProtectionFlag]
         a) Load family profile + all members from SQLite
         b) Load all policy_facts for the family
         c) Run each rule set against each member + their policies
         d) Collect all generated flags
         e) Persist flags to protection_flags table
         f) Return sorted by severity (critical → warning → info)

3.3.2  Coverage gap rules (core/rules/coverage_rules.py)
       Implement from [Arch §9.3 — Rule Set 1]:
       - no_health_cover(member, policies)
       - no_life_cover_for_earner(member, policies)

3.3.3  Sum insured rules (core/rules/coverage_rules.py)
       Implement from [Arch §9.3 — Rule Set 2]:
       - sum_insured_vs_benchmark(member, policy_facts, city_tier)
       - Use the HEALTH_BENCHMARKS dictionary from the architecture doc
       - Remember: flag as "warning", never as "insufficient"

3.3.4  Co-pay rules (core/rules/financial_rules.py)
       Implement from [Arch §9.3 — Rule Set 3]:
       - copay_exposure(policy_facts)
       - Include example calculation in the description

3.3.5  Waiting period rules (core/rules/financial_rules.py)
       Implement from [Arch §9.3 — Rule Set 4]:
       - ped_waiting_active(policy_facts, policy)
       - Calculate months elapsed since policy start date
       - Flag if PED waiting period hasn't elapsed yet

3.3.6  Protection score calculator (core/rules/engine.py)
       Implement from [Arch §9.4]:
       - Score each dimension 0-100
       - Apply weights from WEIGHTS dictionary
       - Calculate weighted composite score
       - Return score + breakdown per dimension

3.3.7  Scenario calculator (core/rules/financial_rules.py)
       Implement from [Arch §9.3 — Rule Set 5]:
       - calculate_hospitalization(amount, policy_facts)
       - Step through: eligible → cap → copay → estimated payout
       - Generate caveats list
       - Mark confidence as "indicative"

3.3.8  Test rules engine
       Run evaluate() for the demo family (Sharma Family):
       Expected flags (based on the persona in [Problem Statement §4]):
       - 🔴 Ramesh (parent): health coverage may leave exposure
         (₹5L with 20% copay, age 63, metro city)
       - 🟡 Priya (spouse): life coverage gap or low relative to liabilities
       - 🟢 Rahul (self): adequate health + life coverage

       Run scenario calculator:
       Input: ₹7L hospitalization for Ramesh
       Expected output:
       - sum_insured_cap: ₹5L
       - copay_deduction: ₹1L (20% of ₹5L)
       - estimated_insurer_payout: ₹4L
       - estimated_out_of_pocket: ₹3L
       - caveats: [sublimits, non-covered expenses, claim adjudication]
```

**Deliverable:** Rules engine generates accurate protection flags + financial projections from structured policy facts.

### Phase 3 Gate Check

```
✅ LLM provider abstraction works with Gemini + Groq fallback
✅ Extraction pipeline converts policy chunks → structured JSON facts
✅ Extraction accuracy ≥ 80% against ground truth for sample policies
✅ Validated facts stored in SQLite (policy_facts, exclusions, sublimits)
✅ Rules engine generates ≥ 2 correct flags for demo family
✅ Protection score calculates (number between 0-100)
✅ Scenario calculator produces correct math for ₹7L hospitalization
✅ All caveats and disclaimers are attached to outputs
```

**If you pass this gate by hour 32:** Your intelligence layer is complete. The hard part is done.
**If you're behind:** The most likely blocker is LLM extraction returning inconsistent JSON. Quick fix: add retry logic (up to 3 retries) and a more explicit JSON-only prompt. If the LLM still fails, hard-code the extracted facts from your ground truth JSON for the demo and move on — the architecture is still demonstrable.

---

## Phase 4: API + Service Orchestration

**Hours 32–44 | Goal: All endpoints returning real data from the intelligence layer**

This phase wires everything together — the extraction pipeline, RAG, rules engine, and LLM explanation — behind clean FastAPI endpoints.

---

### Task 4.1 — Service Layer (Hours 32–36)

**Maps to:** [Arch §3.1 — services/]

**What you're building:** The orchestration services that sequence the pipeline components. Services contain no business logic — they just call the right components in the right order.

**Steps:**

```
4.1.1  Ingestion service (services/ingestion_service.py)
       Orchestrates the full policy ingestion pipeline:
       upload_and_analyze(family_id, member_id, policy_type, pdf_file):
         1. Save PDF to UPLOAD_DIR
         2. Extract text (PDF engine)
         3. Clean text (cleaner)
         4. Detect sections (section detector)
         5. Chunk (structure chunker + metadata enricher)
         6. Embed + store in ChromaDB
         7. Extract structured facts (LLM extraction)
         8. Validate + store in SQLite
         9. Run rules engine for the family
         10. Return policy_id + ingestion status

       Track progress: update policy.ingestion_status at each step
       Handle errors: if any step fails, set status = 'failed' with error message

4.1.2  Analysis service (services/analysis_service.py)
       get_protection_summary(family_id):
         1. Load family + members from SQLite
         2. Load all policies + facts for the family
         3. Load all protection flags
         4. Calculate protection score
         5. Build member-wise summary
         6. Return structured ProtectionSummary

4.1.3  Scenario service (services/scenario_service.py)
       simulate_scenario(family_id, scenario_text):
         1. Parse scenario text using LLM:
            → Extract: {member, event_type, amount}
         2. Find relevant policies for that member
         3. Retrieve relevant chunks via RAG
         4. Run scenario calculator (deterministic math)
         5. Generate explanation using LLM
            (input: calculated numbers + retrieved clauses)
         6. Persist result to scenario_results table
         7. Return ScenarioResponse

4.1.4  Chat service (services/chat_service.py)
       ask_policy(family_id, question, policy_id=None):
         1. Retrieve relevant chunks via RAG
            (optionally filtered to specific policy)
         2. Check structured facts in SQLite for direct answers
         3. Build context from retrieved chunks
         4. Generate answer using LLM chat prompt
         5. Parse citations from response
         6. Return ChatResponse with answer + evidence
```

---

### Task 4.2 — FastAPI Endpoints (Hours 36–40)

**Maps to:** [Arch §11 API Design]

**Steps:**

```
4.2.1  Family routes (api/routes/family.py)
       POST /api/v1/family
       POST /api/v1/family/{family_id}/members
       GET  /api/v1/family/{family_id}

4.2.2  Policy routes (api/routes/policy.py)
       POST /api/v1/family/{family_id}/policies/upload
         - Accept multipart/form-data (PDF file + member_id + policy_type)
         - Trigger ingestion service (synchronous for MVP — async is overkill)
         - Return policy_id + initial status
       GET  /api/v1/policies/{policy_id}/status
       GET  /api/v1/policies/{policy_id}/facts

4.2.3  Protection routes (api/routes/protection.py)
       GET /api/v1/family/{family_id}/protection
         - Call analysis service
         - Return: overall_score, member summaries, flags, score breakdown

4.2.4  Scenario routes (api/routes/scenario.py)
       POST /api/v1/family/{family_id}/scenarios
         - Accept: {scenario_text: str}
         - Call scenario service
         - Return: financial projection, caveats, explanation, evidence

4.2.5  Chat routes (api/routes/chat.py)
       POST /api/v1/family/{family_id}/chat
         - Accept: {question: str, policy_id: str (optional)}
         - Call chat service
         - Return: answer, evidence citations, confidence

4.2.6  Error handling middleware (api/middleware/error_handler.py)
       - Catch all exceptions
       - Map to structured error responses from [Arch §11.2]
       - Log full traceback for debugging
       - Return user-friendly error messages
```

---

### Task 4.3 — Explanation Prompts + Chat (Hours 40–44)

**Maps to:** [Arch §10.2 — PROMPT 2, 3, 4]

**Steps:**

```
4.3.1  Explanation prompt (core/llm/prompts/explanation.py)
       For protection flag explanations:
       - Input: flag details + relevant policy clauses + calculated numbers
       - Output: 2-3 sentence plain-language explanation
       - Tone: cautious, evidence-grounded
       - Must use: "may", "potential", "could" — never definitive claims
       - Must cite specific clause numbers

4.3.2  Scenario prompt (core/llm/prompts/scenario.py)
       For scenario simulation narrative:
       - Input: ScenarioResult + retrieved clauses
       - Output: step-by-step financial walkthrough
       - Must lead with the deterministic numbers
       - Must list all caveats
       - Must end with: "This is an indicative estimate"

4.3.3  Chat prompt (core/llm/prompts/chat.py)
       For policy Q&A:
       - System prompt emphasizes: ONLY answer from provided context
       - If answer not in retrieved chunks → "I couldn't find that
         information in your uploaded policy documents"
       - Cite clause numbers for every factual claim
       - Distinguish: "the policy states X" vs "this means Y for you"

4.3.4  End-to-end API test
       Run the full flow via curl/httpie:
       a) POST /family → create Sharma family
       b) POST /family/{id}/members → add all 4 members
       c) POST /family/{id}/policies/upload → upload parent's health policy
       d) GET /family/{id}/protection → verify dashboard data
       e) POST /family/{id}/scenarios → run ₹7L hospitalization scenario
       f) POST /family/{id}/chat → ask "What is the co-pay percentage?"

       All 6 calls should succeed with real, accurate data.
```

**Deliverable:** Complete API layer returning real protection intelligence from the backend pipeline.

### Phase 4 Gate Check

```
✅ Full ingestion pipeline works via API (upload PDF → dashboard data)
✅ GET /protection returns: score, member summaries, ≥2 flags
✅ POST /scenarios returns: financial projection with correct math + caveats
✅ POST /chat returns: answer with evidence citations from retrieved clauses
✅ Error handling returns structured error messages (not raw stack traces)
✅ End-to-end flow: upload → dashboard → scenario → chat — all working
```

**If you pass this gate by hour 44:** You have a fully functional backend. The product works — it just needs a face.
**If you're behind:** The scenario parsing (LLM extracting member/event/amount from text) is the most likely sticking point. Quick fix: for the demo, support only pre-defined scenarios via a dropdown instead of free-text input. This eliminates the parsing step entirely and still demonstrates the intelligence.

---

## Phase 5: Frontend & UI

**Hours 44–60 | Goal: Working frontend rendering real data from the API**

This phase builds the user-facing application — the family setup, policy upload, protection dashboard, scenario simulator, and policy chat.

---

### Task 5.1 — Core Screens (Hours 44–50)

**Maps to:** [Arch §12 Frontend Architecture]

**Steps:**

```
5.1.1  API client setup
       Create a simple fetch-based API client (lib/api.ts):
       - Base URL pointing to Railway backend
       - Methods: createFamily, addMember, uploadPolicy,
                  getProtection, runScenario, askPolicy
       - Error handling: parse error responses from backend

5.1.2  Family setup page (app/page.tsx)
       [See Arch §12.2 — Flow 1: Screen 1]
       - Family name input
       - "Add Member" form: name, relationship (dropdown), age, city
       - List of added members with checkmarks
       - "Continue to Upload" button
       - Store family_id and member list in React context

5.1.3  Policy upload page (app/upload/page.tsx)
       [See Arch §12.2 — Flow 1: Screen 2]
       - Drag-drop zone for PDF files
       - Member selector dropdown (who is this policy for?)
       - Policy type selector (Health / Life)
       - Upload progress indicator:
         "Extracting text..." → "Analyzing sections..." →
         "Understanding coverage..." → "Detecting gaps..." → "Done"
       - List of uploaded policies with status indicators
       - "View Protection Dashboard" button (enabled when ≥1 policy processed)

5.1.4  Protection dashboard (app/dashboard/page.tsx)
       [See Arch §12.2 — Flow 2]
       This is the most important screen — the hero of the demo.

       Components to build:
       a) ProtectionScoreRing (components/ProtectionScoreRing.tsx)
          - Circular progress ring showing score (e.g., 74/100)
          - Color: green (>75), amber (50-75), red (<50)
          - Text below: "Strong" / "Moderate — gaps detected" / "Critical gaps"
          - Use Recharts PieChart or a simple SVG arc

       b) MemberCard (components/MemberCard.tsx)
          - Card per family member showing:
            Name, relationship, age
            Health cover: ₹XL (or "None")
            Life cover: ₹XCr (or "None")
            Status dot: 🟢 / 🟡 / 🔴
          - Horizontally scrollable row of cards

       c) FlagCard (components/FlagCard.tsx)
          - Severity badge: CRITICAL (red) / WARNING (amber) / INFO (blue)
          - Title: "Parent health coverage may leave exposure"
          - Description: 2-3 line explanation
          - Evidence link: "📄 Clause 4.2, 8.1"
          - Action buttons: "See Details" | "Run Scenario"

       d) ScoreBreakdown (components/ScoreBreakdown.tsx)
          - Horizontal bar chart showing score per dimension
          - Use Recharts BarChart
          - Labels: Health Coverage, Life Coverage, Sum Insured Adequacy, etc.
```

---

### Task 5.2 — Feature Screens (Hours 50–56)

**Steps:**

```
5.2.1  Scenario simulator (app/scenarios/page.tsx)
       Two input modes:
       a) Quick scenarios (pre-defined buttons):
          - "₹5L hospitalization for [member dropdown]"
          - "₹10L hospitalization for [member dropdown]"
          - "Loss of income for [member dropdown]"
       b) Free-text input (stretch goal):
          - Text input: "What if my father needs ₹7L surgery?"

       Result display (components/ScenarioResult.tsx):
       - Financial projection card:
         Eligible amount: ₹7,00,000
         Policy limit applied: ₹5,00,000
         Co-pay deduction (20%): ₹1,00,000
         ──────────────────────────────
         Estimated insurer payout: ₹4,00,000
         Estimated out-of-pocket: ₹3,00,000

       - Caveats section:
         ⚠️ Sub-limits may further reduce payout
         ⚠️ Non-medical expenses not included
         ⚠️ Actual payout subject to claim adjudication

       - Evidence cards:
         [Clause 4.2] Coverage limit: ₹5,00,000
         [Clause 8.1] Co-payment: 20%

       - Disclaimer banner at bottom:
         "This is an indicative estimate, not a coverage guarantee."

5.2.2  Policy chat (app/chat/page.tsx)
       - Chat message list with user/assistant bubbles
       - Input field with send button
       - Assistant messages include:
         - Answer text
         - Evidence citations (expandable):
           📄 Source: Section 7.2 — Waiting Period
         - Confidence badge: High / Medium / Low
       - Suggested follow-up questions (clickable chips)
       - Empty state: "Ask anything about your uploaded policies"

5.2.3  Policy detail view (app/policy/[id]/page.tsx)
       - Policy header: name, insurer, member covered, status
       - Extracted facts table:
         Sum Insured: ₹5,00,000
         Co-pay: 20%
         Room Rent Limit: ₹5,000/day
         PED Waiting Period: 48 months
         Network Required: Yes
       - Exclusions list (collapsible)
       - Sub-limits list (collapsible)
       - Extraction confidence indicator
```

---

### Task 5.3 — State Management & Navigation (Hours 56–60)

**Steps:**

```
5.3.1  React context setup [Arch §12.3]
       - FamilyContext: family data + members
       - PolicyContext: uploaded policies + ingestion status
       - ProtectionContext: scores + flags
       - Persist family_id to localStorage for session continuity

5.3.2  Navigation flow
       Landing → Family Setup → Upload → Dashboard
                                           ↕
                                    Scenarios / Chat / Policy Detail

       - If no family exists → redirect to setup
       - If no policies uploaded → redirect to upload
       - Dashboard is the primary screen after setup

5.3.3  Loading and error states
       - Full-page loader during policy ingestion
       - Skeleton cards on dashboard while data loads
       - Error banners with retry buttons
       - Empty states with guidance text
```

### Phase 5 Gate Check

```
✅ Family setup → upload → dashboard flow works end-to-end
✅ Dashboard renders: score ring, member cards, flag cards with real data
✅ Scenario simulator shows financial projection with caveats + evidence
✅ Policy chat returns answers with evidence citations
✅ Loading, error, and empty states all handled
✅ Navigation between all screens works
```

---

## Phase 6: Deployment & Demo Polish

**Hours 60–72 | Goal: Live demo accessible via URL, polished for portfolio**

---

### Task 6.1 — Backend Deployment to Railway (Hours 60–63)

**Maps to:** [Arch §13 Deployment Architecture]

**Steps:**

```
6.1.1  Create Dockerfile [Arch §13.2]
       - Base: python:3.11-slim
       - Install dependencies from requirements.txt
       - Pre-download embedding model at build time
       - Create data directories
       - CMD: uvicorn main:app --host 0.0.0.0 --port 8000

6.1.2  Railway setup
       - Connect GitHub repository
       - Set build command: docker build
       - Set environment variables (API keys, config)
       - Deploy and verify: GET /health returns 200

6.1.3  CORS configuration
       Update main.py CORS middleware:
       - Allow origin: https://policy-intel.vercel.app (your Vercel URL)
       - Allow methods: GET, POST
       - Allow headers: Content-Type

6.1.4  Verify API from Railway URL
       curl https://your-app.railway.app/health
       → {"status": "ok"}
```

---

### Task 6.2 — Frontend Deployment to Vercel (Hours 63–65)

**Steps:**

```
6.2.1  Environment configuration
       - Set NEXT_PUBLIC_API_URL to Railway backend URL
       - Ensure all API calls use this variable

6.2.2  Vercel deployment
       - Connect GitHub repository
       - Framework preset: Next.js
       - Deploy and verify: frontend loads at vercel.app URL

6.2.3  End-to-end production test
       Full flow on deployed URLs:
       a) Create family on Vercel frontend
       b) Upload policy PDF → hits Railway backend
       c) View protection dashboard → renders real data
       d) Run scenario → returns financial projection
       e) Ask policy question → returns answer with evidence
```

---

### Task 6.3 — Demo Data Fallback (Hours 65–67)

**Why this matters:** Live PDF upload + LLM extraction can fail in a demo (network issues, rate limits, slow processing). You need a bulletproof fallback.

**Steps:**

```
6.3.1  Pre-seed demo data
       Create a "Load Demo" button on the landing page:
       - Creates the Sharma family with all 4 members
       - Inserts pre-extracted policy facts directly into SQLite
         (bypass the PDF ingestion pipeline)
       - Runs rules engine on the pre-loaded facts
       - Redirects to dashboard

       This ensures the dashboard, scenarios, and chat all work
       even if the PDF upload or LLM extraction fails during a demo.

6.3.2  Pre-load ChromaDB with demo chunks
       Store pre-chunked + pre-embedded demo policy data
       so RAG retrieval works even without live PDF processing.

6.3.3  Test the fallback flow
       - Click "Load Demo" → dashboard renders immediately
       - Run scenario → works with pre-loaded data
       - Chat → works with pre-loaded chunks
```

---

### Task 6.4 — UI Polish (Hours 67–70)

**Steps:**

```
6.4.1  Visual polish
       - Consistent color scheme:
         Green (#22C55E) for strong/safe
         Amber (#F59E0B) for warnings
         Red (#EF4444) for critical gaps
         Blue (#3B82F6) for info/evidence
       - Proper spacing and typography
       - Mobile-responsive layout (test at 375px width)

6.4.2  Confidence indicators (components/ConfidenceBadge.tsx)
       Show extraction confidence on every insight:
       - High: solid green badge
       - Medium: amber badge with "Some details unverified"
       - Low: red badge with "Low confidence — verify manually"

6.4.3  Disclaimer banner
       Persistent footer on all screens:
       "Policy Intelligence provides indicative analysis based on
       uploaded documents. This is not financial advice. Consult
       a qualified insurance advisor for coverage decisions."

6.4.4  Evidence expandability
       - Flag cards: "See Evidence" toggles clause citations
       - Scenario results: evidence section is collapsible
       - Chat: citations are inline but expandable
```

---

### Task 6.5 — Documentation & Portfolio Packaging (Hours 70–72)

**Steps:**

```
6.5.1  README.md
       Write a portfolio-grade README with:
       - Project title + one-line description
       - Problem statement (2-3 sentences from [Problem Statement §6])
       - Architecture diagram (text-based from [Arch §2.1])
       - Tech stack table
       - Key design decisions (from [Arch §18 ADRs]):
         1. Hybrid RAG + deterministic rules (not LLM-only)
         2. Structure-aware chunking (not fixed-size)
         3. Evidence-first trust architecture
       - How to run locally
       - Live demo link
       - Screenshots of key screens

6.5.2  Architecture summary for interviews
       Prepare a 2-minute verbal walkthrough:
       "The system has three intelligence jobs — retrieval, calculation,
       and explanation — each handled by the right technology.
       Financial calculations are deterministic because LLMs hallucinate
       numbers. The LLM explains results it didn't compute.
       Every insight traces back to a specific policy clause."

6.5.3  Record a demo walkthrough (optional but high-value)
       Screen-record the full flow:
       Upload → Dashboard → Click a flag → Run scenario →
       Ask a question → Show evidence
       Keep it under 3 minutes.

6.5.4  Push final code to GitHub
       Clean up:
       - Remove hardcoded API keys
       - Remove debug print statements
       - Ensure .env.example exists with all required variables
       - Final commit with clean message
```

### Phase 6 Gate Check (Final)

```
✅ Backend live on Railway — API responds
✅ Frontend live on Vercel — UI loads
✅ End-to-end flow works on deployed URLs
✅ Demo fallback ("Load Demo") works without PDF upload
✅ Disclaimers and confidence badges visible
✅ Mobile-responsive layout
✅ README.md complete with architecture and design decisions
✅ GitHub repo clean and public
✅ Demo walkthrough recorded (optional)
```

---

## Risk Contingency Plan

What to do when things go wrong during the build:

| Problem | Hour | Fix |
|---|---|---|
| Section detection misses sections | 4-8 | Loosen regex patterns; fall back to paragraph-level chunks for undetected sections |
| Chunks too large or too small | 8-14 | Adjust size guard thresholds; for MVP, allow slightly larger chunks (up to 1500 tokens) |
| RAG returns irrelevant chunks | 14-20 | Add section_type metadata filter to queries; increase k to 15 and rerank harder |
| LLM extraction returns bad JSON | 22-28 | Add retry logic (3 attempts); add "return ONLY JSON, no other text" to prompt; use hard-coded ground truth for demo |
| LLM rate-limited on both providers | 22-44 | Switch to hard-coded extraction results for demo data; reduce LLM calls by caching responses |
| Rules engine generates wrong flags | 28-32 | Check benchmark values; verify structured facts in SQLite match expectations; adjust thresholds |
| Frontend-backend integration fails (CORS, data format) | 56-60 | Double-check CORS origins; use browser dev tools Network tab; add console.log at every API boundary |
| Railway deployment fails | 60-63 | Check Dockerfile builds locally first; verify embedding model downloads at build time; check RAM usage |
| Demo data fallback doesn't work | 65-67 | This is the safety net — invest extra time here; if needed, hard-code the dashboard data in the frontend as a last resort |

---

## Scope Cut Decisions (Pre-Planned)

If you're running behind, cut in this order — each row is less important than the one above it:

| Priority | Feature | Cut to | Impact |
|---|---|---|---|
| 1 — NEVER CUT | Protection dashboard with flags | — | This IS the product |
| 2 — NEVER CUT | Scenario simulation (at least pre-defined) | — | Strongest demo moment |
| 3 — Protect | Policy upload + real extraction | Use demo fallback data | Demo still works |
| 4 — Can simplify | Policy chat | Remove; replace with static FAQ | Lose interactivity but save 6 hours |
| 5 — Can simplify | Free-text scenario input | Use pre-defined scenario buttons only | Eliminates LLM parsing step |
| 6 — Can simplify | Policy detail view | Remove; keep data in dashboard only | Saves 2-3 hours |
| 7 — Can cut | Score breakdown chart | Show only overall score | Saves 1-2 hours |
| 8 — Can cut | Mobile responsiveness | Desktop-only demo | Saves 1-2 hours |
| 9 — Can cut | Demo recording | Skip; do live demo instead | Saves 1 hour |

---

## Post-72-Hour Backlog (If You Have Extra Time)

These are enhancements that strengthen the portfolio but aren't required for the core demo:

```
P1 — Multi-policy analysis
     Upload 2+ policies for same member → cross-reference coverage

P2 — Claim readiness checklist
     "Do you have these documents ready?" per policy

P3 — Renewal tracking
     Flag policies approaching expiry date

P4 — PDF comparison
     Upload old vs new policy → highlight coverage changes

P5 — Export protection report
     Generate a downloadable PDF summary for the family
```

---

*Document Version: 1.0*
*Last Updated: August 2026*
*Author: Ayantika Pyne*
*Project: Policy Intelligence*
*Companion Documents:*
  - *Policy Intelligence: Problem Statement*
  - *Policy Intelligence: System Architecture & Design*
