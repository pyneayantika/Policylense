# Policy Intelligence: System Architecture & Design

---

## Table of Contents

1. [Architecture Philosophy](#1-architecture-philosophy)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow Pipelines](#4-data-flow-pipelines)
5. [Database Design](#5-database-design)
6. [PDF Processing Pipeline](#6-pdf-processing-pipeline)
7. [Chunking Strategy](#7-chunking-strategy)
8. [RAG Architecture](#8-rag-architecture)
9. [Rules Engine Design](#9-rules-engine-design)
10. [LLM Integration Layer](#10-llm-integration-layer)
11. [API Design](#11-api-design)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Error Handling & Resilience](#14-error-handling--resilience)
15. [Security Considerations](#15-security-considerations)
16. [Observability & Logging](#16-observability--logging)
17. [Development Plan (72-Hour Sprint)](#17-development-plan-72-hour-sprint)
18. [Architecture Decision Records](#18-architecture-decision-records)

---

## 1. Architecture Philosophy

### 1.1 Core Design Principles

**Principle 1 — Separation of Intelligence Jobs**

The system separates three fundamentally different AI jobs that should never be conflated:

| Job | Question | Technology | Why Separate |
|---|---|---|---|
| Retrieval | "What does the policy say?" | RAG (embeddings + vector search) | Retrieval is a search problem — optimized for recall and precision |
| Calculation | "What are the financial implications?" | Deterministic rules engine | Financial math must be exact — LLMs hallucinate numbers |
| Explanation | "How do we communicate this clearly?" | LLM with grounded context | Natural language generation is the LLM's strength |

This is the most important architectural decision. A system that lets an LLM both calculate co-pay exposure AND explain it will eventually produce a wrong number wrapped in confident language. In a high-stakes insurance context, that's a liability.

**Principle 2 — Evidence-First Trust Architecture**

Every insight presented to the user follows a strict trust chain:

```
Retrieve (policy clause) → Structure (extract fact) → Calculate (deterministic math)
    → Reason (apply rules) → Explain (LLM generates language) → Evidence (cite clause)
```

No insight is shown without traceable evidence back to a specific policy clause.

**Principle 3 — Hybrid Data Model**

The system maintains two parallel representations of policy knowledge:

| Representation | Store | Purpose |
|---|---|---|
| Unstructured knowledge | ChromaDB (vector) | Semantic search, clause retrieval, Q&A |
| Structured facts | SQLite (relational) | Calculations, gap detection, dashboard metrics |

Neither alone is sufficient. RAG without structured facts can't compute out-of-pocket exposure. Structured facts without RAG can't answer open-ended policy questions.

**Principle 4 — MVP Constraint Discipline**

| Constraint | Decision |
|---|---|
| ₹0 budget | All services must have usable free tiers |
| 72-hour build | One killer flow, not feature breadth |
| Portfolio project | Architecture must be interview-defensible |
| Demo-grade, not production-grade | No auth, no encryption, no horizontal scaling |

---

## 2. High-Level System Architecture

### 2.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER (Browser)                             │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Upload  │  │  Protection  │  │  Scenario   │  │   Policy     │  │
│  │  Policy  │  │  Dashboard   │  │  Simulator  │  │   Chat       │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘  │
│       │               │               │                │           │
└───────┼───────────────┼───────────────┼────────────────┼───────────┘
        │               │               │                │
        ▼               ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS FRONTEND (Vercel)                       │
│                     React + Tailwind CSS                            │
│                     API Route Proxy Layer                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                          HTTPS (REST)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (Railway)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PDF Engine   │  │  RAG Engine   │  │   Rules Engine           │  │
│  │  (PyMuPDF)    │  │  (ChromaDB)   │  │   (Deterministic)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│         ▼                 ▼                        ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Chunking    │  │  Embeddings  │  │   LLM Abstraction Layer  │  │
│  │  Pipeline    │  │  (MiniLM)    │  │   (Gemini / Groq)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│                    ┌──────────────────┐                              │
│                    │     SQLite DB    │                              │
│                    │  (Structured     │                              │
│                    │   Policy Facts)  │                              │
│                    └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack (Final)

| Layer | Technology | Version | Free Tier Limits |
|---|---|---|---|
| Frontend Framework | Next.js | 14.x (App Router) | — |
| UI Library | React | 18.x | — |
| Styling | Tailwind CSS | 3.x | — |
| Charts | Recharts | 2.x | — |
| Backend Framework | FastAPI | 0.100+ | — |
| PDF Processing | PyMuPDF (fitz) | 1.23+ | — |
| Vector Database | ChromaDB | 0.4+ | Local, no limits |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | — | Local, no limits |
| LLM (Primary) | Google Gemini 2.5 Flash | — | 15 RPM / 1M TPD free |
| LLM (Fallback) | Groq (Llama 3.1 8B) | — | 30 RPM free |
| Relational DB | SQLite | 3.x | Local, no limits |
| Frontend Hosting | Vercel | Free tier | 100 GB bandwidth |
| Backend Hosting | Railway | Free trial | $5 credit |
| Version Control | GitHub | — | — |

---

## 3. Component Architecture

### 3.1 Backend Component Map

```
backend/
├── main.py                          # FastAPI app entry point
├── config.py                        # Environment & configuration
│
├── api/                             # API layer
│   ├── routes/
│   │   ├── policy.py                # POST /upload, POST /analyze
│   │   ├── protection.py            # GET /protection-summary
│   │   ├── scenario.py              # POST /simulate-scenario
│   │   ├── chat.py                  # POST /ask-policy
│   │   └── family.py                # POST /family-profile, GET /family
│   └── middleware/
│       ├── error_handler.py         # Global error handling
│       └── rate_limiter.py          # Basic rate limiting
│
├── core/                            # Business logic
│   ├── pdf_engine/
│   │   ├── extractor.py             # PyMuPDF text extraction
│   │   ├── cleaner.py               # Text cleaning & normalization
│   │   └── section_detector.py      # Policy section identification
│   │
│   ├── chunking/
│   │   ├── structure_chunker.py     # Section-aware chunking
│   │   ├── semantic_chunker.py      # Semantic boundary detection
│   │   └── metadata_enricher.py     # Chunk metadata attachment
│   │
│   ├── rag/
│   │   ├── embedder.py              # Sentence-transformer embeddings
│   │   ├── vector_store.py          # ChromaDB operations
│   │   ├── retriever.py             # Similarity search + reranking
│   │   └── context_builder.py       # Retrieved context assembly
│   │
│   ├── extraction/
│   │   ├── policy_extractor.py      # LLM-based structured extraction
│   │   ├── schemas.py               # Pydantic models for policy facts
│   │   └── validator.py             # Extraction validation
│   │
│   ├── rules/
│   │   ├── engine.py                # Rules engine orchestrator
│   │   ├── coverage_rules.py        # Coverage gap detection rules
│   │   ├── financial_rules.py       # Financial calculation rules
│   │   ├── claim_readiness.py       # Claim readiness checks
│   │   └── benchmarks.py            # Coverage benchmark data
│   │
│   └── llm/
│       ├── provider.py              # LLM provider abstraction
│       ├── gemini_client.py         # Gemini API client
│       ├── groq_client.py           # Groq API client (fallback)
│       ├── prompts/
│       │   ├── extraction.py        # Policy fact extraction prompts
│       │   ├── explanation.py       # Gap/insight explanation prompts
│       │   ├── scenario.py          # Scenario simulation prompts
│       │   └── chat.py              # Policy Q&A prompts
│       └── response_parser.py       # LLM response parsing
│
├── db/
│   ├── database.py                  # SQLite connection manager
│   ├── models.py                    # SQLAlchemy ORM models
│   └── migrations/
│       └── init_db.py               # Schema creation
│
├── services/                        # Orchestration layer
│   ├── ingestion_service.py         # End-to-end policy ingestion
│   ├── analysis_service.py          # Protection analysis orchestration
│   ├── scenario_service.py          # Scenario simulation orchestration
│   └── chat_service.py              # Policy Q&A orchestration
│
└── utils/
    ├── text_utils.py                # Text processing utilities
    ├── financial_utils.py           # Currency, percentage helpers
    └── constants.py                 # Application constants
```

### 3.2 Component Interaction Diagram

```
                        ┌─────────────────┐
                        │   API Routes    │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Services     │  ← Orchestration layer
                        │  (Ingestion,    │     (sequences the pipeline,
                        │   Analysis,     │      no business logic here)
                        │   Scenario)     │
                        └───┬────┬────┬───┘
                            │    │    │
              ┌─────────────┘    │    └──────────────┐
              ▼                  ▼                   ▼
     ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
     │  PDF Engine  │    │  RAG Engine   │    │ Rules Engine  │
     │             │    │              │    │              │
     │  extract    │    │  embed       │    │  evaluate    │
     │  clean      │    │  store       │    │  calculate   │
     │  detect     │    │  retrieve    │    │  flag        │
     └──────┬──────┘    └──────┬───────┘    └──────┬───────┘
            │                  │                   │
            ▼                  ▼                   │
     ┌─────────────┐    ┌──────────────┐          │
     │  Chunking   │    │   ChromaDB   │          │
     │  Pipeline   │    └──────────────┘          │
     └──────┬──────┘                              │
            │                                     │
            ▼                                     │
     ┌─────────────┐                              │
     │  Extraction  │──────────┐                  │
     │  (LLM-based) │          │                  │
     └─────────────┘          ▼                  ▼
                        ┌──────────────────────────┐
                        │        SQLite DB         │
                        │  (Structured Policy      │
                        │   Facts + Family Data)   │
                        └──────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │    LLM Explanation       │
                        │  (Takes: rule flags +    │
                        │   retrieved clauses +    │
                        │   calculated numbers)    │
                        │                          │
                        │  Produces: human-        │
                        │  readable insight with   │
                        │  evidence citations      │
                        └──────────────────────────┘
```

---

## 4. Data Flow Pipelines

### 4.1 Pipeline 1: Policy Ingestion (Upload → Intelligence)

This is the most critical pipeline. Everything downstream depends on it.

```
Step 1: UPLOAD
User uploads PDF via frontend
    │
    ▼
Step 2: EXTRACT
PyMuPDF extracts raw text from PDF
    │  Output: raw_text (string)
    │  Fallback: if text empty → reject with "scanned PDF not supported"
    │
    ▼
Step 3: CLEAN
Text cleaner normalizes extracted text
    │  - Remove headers/footers/page numbers
    │  - Normalize whitespace
    │  - Fix encoding issues
    │  - Remove table-of-contents artifacts
    │  Output: cleaned_text (string)
    │
    ▼
Step 4: DETECT SECTIONS
Section detector identifies policy structure
    │  - Match known section headers (coverage, exclusions, waiting period, etc.)
    │  - Build section tree: Policy → Section → Subsection → Clause
    │  Output: List[Section] with hierarchy metadata
    │
    ▼
Step 5: CHUNK
Structure-aware chunker creates meaningful units
    │  - Each chunk = one semantic unit (clause, sub-clause, paragraph)
    │  - Metadata attached: section, clause_number, type, policy_id
    │  Output: List[Chunk] with metadata
    │
    ▼
Step 6: EMBED + STORE
Sentence-transformer creates embeddings → ChromaDB stores them
    │  Output: Chunks indexed in vector store
    │
    ▼
Step 7: EXTRACT STRUCTURED FACTS
LLM extracts machine-readable policy facts from chunks
    │  Input: Key chunks (coverage, limits, exclusions, conditions)
    │  Output: PolicyFacts (Pydantic model)
    │
    ▼
Step 8: VALIDATE + PERSIST
Validator checks extracted facts → SQLite stores them
    │  - Cross-check: does sum_insured exist? is co-pay a valid percentage?
    │  - Flag low-confidence extractions for review
    │  Output: Validated PolicyFacts in SQLite
    │
    ▼
Step 9: RULES EVALUATION
Rules engine evaluates the policy against benchmarks and family context
    │  Input: PolicyFacts + FamilyProfile
    │  Output: List[ProtectionFlag] with severity and evidence
    │
    ▼
Step 10: GENERATE INSIGHTS
LLM generates human-readable explanations for each flag
    │  Input: Flag + relevant chunks + calculated numbers
    │  Output: List[Insight] with explanation + evidence citations
    │
    ▼
Step 11: RESPOND
API returns protection summary to frontend
```

### 4.2 Pipeline 2: Scenario Simulation

```
User asks: "What if my father needs ₹7L hospitalization?"
    │
    ▼
PARSE SCENARIO
LLM extracts scenario parameters:
    │  {member: "parent_1", event: "hospitalization", amount: 700000}
    │
    ▼
RETRIEVE RELEVANT POLICIES
SQLite query: find all active policies covering parent_1 for hospitalization
    │  Output: List[PolicyFacts] for parent_1
    │
    ▼
RETRIEVE RELEVANT CLAUSES
RAG retrieval: search for hospitalization coverage, co-pay, sub-limits, exclusions
    │  Query: "hospitalization coverage limits co-payment sub-limits"
    │  Output: Top-k relevant chunks with metadata
    │
    ▼
CALCULATE FINANCIAL EXPOSURE
Rules engine computes deterministic projection:
    │
    │  eligible_amount       = 700,000
    │  sum_insured_limit     = 500,000
    │  capped_amount         = min(eligible, sum_insured) = 500,000
    │  copay_deduction       = capped_amount × 0.20 = 100,000
    │  insurer_contribution  = capped_amount - copay_deduction = 400,000
    │  user_out_of_pocket    = eligible_amount - insurer_contribution = 300,000
    │
    │  ⚠️ Note: sub-limits may further reduce insurer_contribution
    │  ⚠️ Note: non-covered expenses not included in this estimate
    │
    │  Output: ScenarioResult with calculated numbers + caveats
    │
    ▼
GENERATE EXPLANATION
LLM explains the result using retrieved clauses as evidence:
    │  Input: ScenarioResult + relevant_chunks + caveats
    │  Output: Formatted explanation with evidence citations
    │
    ▼
RESPOND
Return scenario analysis to frontend
```

### 4.3 Pipeline 3: Policy Q&A (Chat)

```
User asks: "Does my policy cover dental treatment?"
    │
    ▼
RETRIEVE
RAG retrieves top-k chunks matching "dental treatment coverage"
    │  Output: List[Chunk] ranked by relevance
    │
    ▼
CHECK STRUCTURED FACTS
SQLite query: check if dental is in exclusions list
    │  Output: Structured fact (if available)
    │
    ▼
GENERATE ANSWER
LLM synthesizes answer from retrieved chunks + structured facts
    │  System prompt enforces:
    │    - Only answer from retrieved evidence
    │    - Cite specific clauses
    │    - Express uncertainty when evidence is ambiguous
    │    - Never fabricate policy details
    │  Output: Answer with clause citations
    │
    ▼
RESPOND
Return answer with evidence to frontend
```

---

## 5. Database Design

### 5.1 SQLite Schema

```sql
-- ============================================================
-- FAMILY CONTEXT
-- ============================================================

CREATE TABLE family (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE family_member (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    family_id       TEXT NOT NULL REFERENCES family(id),
    name            TEXT NOT NULL,
    relationship    TEXT NOT NULL,  -- 'self', 'spouse', 'child', 'parent_1', 'parent_2'
    age             INTEGER,
    city            TEXT,
    known_conditions TEXT,          -- JSON array: ["diabetes", "hypertension"]
    annual_income   REAL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- POLICY DATA
-- ============================================================

CREATE TABLE policy (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    family_id       TEXT NOT NULL REFERENCES family(id),
    member_id       TEXT REFERENCES family_member(id),
    policy_type     TEXT NOT NULL,  -- 'health', 'life', 'vehicle', 'home'
    insurer_name    TEXT,
    product_name    TEXT,
    policy_number   TEXT,
    start_date      DATE,
    end_date        DATE,
    premium         REAL,
    status          TEXT DEFAULT 'active',  -- 'active', 'lapsed', 'expired'
    pdf_filename    TEXT,
    raw_text        TEXT,                   -- full extracted text
    ingestion_status TEXT DEFAULT 'pending', -- 'pending','processing','completed','failed'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_facts (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    policy_id       TEXT NOT NULL REFERENCES policy(id),
    fact_type       TEXT NOT NULL,
    -- ── Health-specific facts ──
    sum_insured     REAL,
    room_rent_limit REAL,
    room_rent_type  TEXT,          -- 'per_day', 'percentage', 'no_limit'
    copay_percent   REAL,
    deductible      REAL,
    ped_waiting_months INTEGER,    -- pre-existing disease waiting period
    initial_waiting_months INTEGER,
    specific_waiting_months INTEGER,
    network_required BOOLEAN DEFAULT FALSE,
    pre_auth_required BOOLEAN DEFAULT FALSE,
    -- ── Life-specific facts ──
    sum_assured     REAL,
    cover_type      TEXT,          -- 'term', 'endowment', 'ulip', 'whole_life'
    payout_type     TEXT,          -- 'lump_sum', 'monthly', 'both'
    -- ── Shared ──
    covers_members  TEXT,          -- JSON array: ["self", "spouse", "child"]
    confidence      REAL DEFAULT 0.0,  -- extraction confidence 0.0-1.0
    extraction_notes TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policy_exclusions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    policy_id       TEXT NOT NULL REFERENCES policy(id),
    exclusion_text  TEXT NOT NULL,
    exclusion_type  TEXT,          -- 'permanent', 'waiting_period', 'conditional'
    waiting_months  INTEGER,
    source_clause   TEXT,          -- e.g., "Section 4.2"
    confidence      REAL DEFAULT 0.0
);

CREATE TABLE policy_sublimits (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    policy_id       TEXT NOT NULL REFERENCES policy(id),
    treatment_type  TEXT NOT NULL, -- 'cataract', 'knee_replacement', 'maternity', etc.
    limit_amount    REAL,
    limit_type      TEXT,          -- 'absolute', 'percentage_of_si'
    limit_value     REAL,          -- percentage value if limit_type = 'percentage_of_si'
    source_clause   TEXT,
    confidence      REAL DEFAULT 0.0
);

-- ============================================================
-- PROTECTION ANALYSIS
-- ============================================================

CREATE TABLE protection_flags (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    family_id       TEXT NOT NULL REFERENCES family(id),
    member_id       TEXT REFERENCES family_member(id),
    policy_id       TEXT REFERENCES policy(id),
    flag_type       TEXT NOT NULL,  -- 'coverage_gap', 'insufficient_cover',
                                   -- 'high_copay', 'waiting_period_risk',
                                   -- 'sublimit_exposure', 'no_cover'
    severity        TEXT NOT NULL,  -- 'critical', 'warning', 'info'
    title           TEXT NOT NULL,
    description     TEXT,
    evidence_clauses TEXT,          -- JSON array of clause references
    calculated_data TEXT,           -- JSON: any numbers the rules engine computed
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenario_results (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    family_id       TEXT NOT NULL REFERENCES family(id),
    scenario_type   TEXT NOT NULL,  -- 'hospitalization', 'death', 'income_loss'
    scenario_params TEXT NOT NULL,  -- JSON: {member, event, amount, ...}
    result_data     TEXT NOT NULL,  -- JSON: {insurer_payout, out_of_pocket, caveats, ...}
    explanation     TEXT,
    evidence_clauses TEXT,          -- JSON array
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_policy_family ON policy(family_id);
CREATE INDEX idx_policy_member ON policy(member_id);
CREATE INDEX idx_policy_facts_policy ON policy_facts(policy_id);
CREATE INDEX idx_exclusions_policy ON policy_exclusions(policy_id);
CREATE INDEX idx_sublimits_policy ON policy_sublimits(policy_id);
CREATE INDEX idx_flags_family ON protection_flags(family_id);
CREATE INDEX idx_flags_member ON protection_flags(member_id);
CREATE INDEX idx_member_family ON family_member(family_id);
```

### 5.2 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌─────────────┐
│  family   │──1:N──│ family_member │──1:N──│   policy    │
└──────────┘       └──────────────┘       └──────┬──────┘
     │                                           │
     │                              ┌────────────┼────────────┐
     │                              │            │            │
     │                         ┌────▼────┐ ┌─────▼─────┐ ┌───▼──────┐
     │                         │ policy_ │ │ policy_   │ │ policy_  │
     │                         │ facts   │ │ exclusions│ │ sublimits│
     │                         └─────────┘ └───────────┘ └──────────┘
     │
     ├──1:N──┌──────────────────┐
     │       │ protection_flags  │
     │       └──────────────────┘
     │
     └──1:N──┌──────────────────┐
             │ scenario_results  │
             └──────────────────┘
```

---

## 6. PDF Processing Pipeline

### 6.1 Text Extraction (PyMuPDF)

```python
# core/pdf_engine/extractor.py — Conceptual design

class PolicyPDFExtractor:
    """
    Extracts text from digitally-generated insurance policy PDFs.
    Does NOT support scanned/image-based PDFs (MVP scope boundary).
    """

    def extract(self, pdf_path: str) -> ExtractionResult:
        """
        Returns:
            ExtractionResult:
                raw_text: str          — Full extracted text
                page_count: int        — Number of pages
                has_text: bool         — Whether text extraction succeeded
                metadata: dict         — PDF metadata (title, author, etc.)
        """
        # 1. Open PDF with PyMuPDF
        # 2. Iterate pages, extract text blocks
        # 3. Preserve reading order (top-to-bottom, left-to-right)
        # 4. Detect and handle multi-column layouts
        # 5. Check: if total extracted text < 100 chars → likely scanned → reject
        pass
```

### 6.2 Text Cleaning

```python
# core/pdf_engine/cleaner.py — Cleaning rules

class PolicyTextCleaner:
    """
    Insurance-specific text cleaning pipeline.
    Tuned for IRDAI-filed policy wordings (irdai.gov.in repository).
    Order matters — each step assumes output of the previous.
    """

    CLEANING_STEPS = [
        # ── IRDAI-specific cleaning ──
        "remove_irdai_headers",          # "IRDAI Regn. No. : 129", UIN lines
                                         # Pattern: r"IRDAI\s*Reg.*?No.*?:\s*\d+"
                                         # Pattern: r"UIN\s*:\s*\w+"
                                         # Pattern: r"Unique\s+Identi.*?No.*?:\s*\w+"
        "remove_insurer_letterhead",     # Repeated insurer address blocks:
                                         # "Regd. & Corporate Office: 1, New Tank Street..."
                                         # "Phone:", "Email:", "Website:", "CIN:"
                                         # These repeat on nearly every page in IRDAI PDFs
        "remove_cis_section",            # "Customer Information Sheet" — this is a summary
                                         # table at the start of IRDAI filings, NOT the
                                         # policy wording itself. It contains condensed
                                         # versions of facts that the real sections detail.
                                         # Remove it to avoid duplicate/conflicting extraction.
                                         # Pattern: from "Customer Information Sheet" to
                                         # "Policy Wording" or "DEFINITIONS"
        "remove_premium_tables",         # IRDAI filings often embed premium charts
                                         # (rows of numbers with age bands and amounts).
                                         # These are pricing data, not policy terms.
                                         # Pattern: detect rows of mostly numbers with
                                         # consistent column structure
        "remove_wellness_program",       # Star Health policies have "Star Wellness Program"
                                         # sections with activity points tables — not
                                         # coverage terms. Flag and skip.
                                         # Pattern: "Wellness Program" or "wellness points"

        # ── General cleaning ──
        "remove_page_headers_footers",   # "Page 12 of 45", insurer letterhead
        "remove_page_numbers",           # Standalone page numbers
        "normalize_whitespace",          # Collapse multiple spaces/newlines
        "fix_hyphenation",               # "hospi-\ntalization" → "hospitalization"
        "fix_irdai_ocr_artifacts",       # IRDAI PDFs sometimes have ligature issues:
                                         # "ﬁrst" → "first", "ﬁnancial" → "financial"
                                         # "deﬁned" → "defined" (fi/fl ligatures)
        "normalize_currency",            # "Rs.", "Rs", "INR", "₹" → "₹"
        "normalize_numbers",             # "5,00,000" stays (Indian format is valid)
        "remove_toc_artifacts",          # "Section 4 ........ 23" (table of contents)
        "strip_watermarks",              # "DRAFT", "SAMPLE POLICY" repeated text
        "remove_disclaimer_footers",     # "Please check whether the details given by you..."
                                         # These legal disclaimers repeat across pages
    ]
```

### 6.3 Section Detection

```python
# core/pdf_engine/section_detector.py — Section identification

# Insurance policies follow semi-predictable structures.
# The detector uses pattern matching against known section headers.

KNOWN_SECTIONS = {
    # ══════════════════════════════════════════════════
    # IRDAI policy wordings use multiple formatting styles:
    #
    # STYLE A (Star Health): Roman numerals + section numbers
    #   "II. Coverage", "III. EXCLUSIONS", "Section 1", "Section 9"
    #   Sub-sections: A, B, C, D lettering
    #
    # STYLE B (HDFC ERGO / Apollo Munich): "Section I", "Section II"
    #   With descriptive headers: "Section I — Coverage",
    #   "Section VI — General Conditions"
    #
    # STYLE C (SBI General / New India): "Def. 1.", "Def. 2."
    #   for definitions, numbered clauses for coverage
    #
    # STYLE D (Arogya Sanjeevani - standardized):
    #   Fixed structure mandated by IRDAI — all insurers use
    #   the same section headers
    #
    # The detector must handle ALL styles.
    # ══════════════════════════════════════════════════

    "coverage": [
        # Text patterns
        "coverage", "benefits", "what is covered", "scope of cover",
        "hospitalization", "in-patient", "sum insured",
        "the company agrees as under",
        # IRDAI Roman numeral patterns (case-insensitive matching)
        r"^II\.?\s*Coverage",           # "II. Coverage" (Star Health style)
        r"^B\.?\s*COVERAGE",            # "B. COVERAGE" (Star Assure style)
        r"^I\.?\s*COVERAGE",            # "I. COVERAGE" (some insurers)
        r"Section\s+(?:I|1)\b.*?cover", # "Section I — Coverage"
        # Star Health numbered sections (coverage sub-types)
        r"Section\s+\d+",              # "Section 1" through "Section 13"
        "in-patient hospitalization", "in-patient treatment",
        "day care procedures", "day care treatment",
        "domiciliary hospitalization", "domiciliary treatment",
        "pre-hospitalization", "post-hospitalization",
        "organ donor", "ambulance", "ayush treatment",
        "modern treatment", "modern treatments"
    ],
    "exclusions": [
        "exclusion", "what is not covered", "not payable",
        "general exclusion", "specific exclusion",
        "the company shall not be liable",
        "shall not be liable to make any payment",
        # IRDAI Roman numeral patterns
        r"^III\.?\s*(?:EXCLUSION|Exclusion)",
        r"^IV\.?\s*(?:EXCLUSION|Exclusion)",
        # IRDAI standardized exclusion numbering
        "permanent exclusion", "list of exclusions",
        # Arogya Sanjeevani standardized wording
        "expenses incurred in connection with"
    ],
    "waiting_period": [
        "waiting period", "moratorium", "time-bound exclusion",
        # IRDAI-specific waiting period patterns
        "pre-existing disease", "pre existing disease", "PED",
        r"\d+\s*months?\s*of\s*continuous\s*coverage",
        "date of inception of the first policy",
        # Three-tier waiting structure common in IRDAI policies
        "initial waiting period",           # 30 days
        "specific disease waiting period",  # 24 months
        "pre-existing disease waiting",     # 36-48 months
        # Arogya Sanjeevani specific
        "30 days waiting", "24 months waiting",
        "36 months", "48 months"
    ],
    "copay": [
        "co-pay", "copay", "co-payment", "cost sharing",
        # IRDAI-specific co-pay patterns
        r"co-?payment\s+of\s+\d+%",
        "applicable to claim amount admissible",
        "borne by the insured",
        # Arogya Sanjeevani mandatory 5% co-pay wording
        "5% applicable to claim amount"
    ],
    "sublimits": [
        "sub-limit", "sublimit", "capping", "internal limit",
        "room rent", "icu charges",
        # IRDAI-specific sub-limit patterns
        "subject to a maximum of",
        "per day", "per hospitalization",
        "proportionate deduction",
        "room rent limit", "room rent cap",
        # Star Health specific limit table headers
        "limits mentioned in the table",
        # Arogya Sanjeevani standardized sub-limits
        "2% of the sum insured subject to maximum",  # room rent
        "5% of sum insured subject to maximum",      # ICU
        "25% of the sum insured or",                 # cataract
        "50% of the sum insured"                     # modern treatments
    ],
    "claim_process": [
        "claim", "how to claim", "claim procedure",
        "intimation", "pre-authorization", "pre-authorisation",
        # IRDAI-specific claim patterns
        "claim intimation", "claim notification",
        "cashless claim", "reimbursement claim",
        "claim settlement", "claim form",
        "third party administrator", "TPA"
    ],
    "network_hospitals": [
        "network", "cashless", "preferred provider",
        "empanelled hospital",
        # IRDAI-specific patterns
        "network hospital", "cashless facility",
        "hospital network list"
    ],
    "definitions": [
        "definition", "glossary", "interpretation",
        # IRDAI-specific definition patterns
        r"^Def\.\s*\d+",               # "Def. 1.", "Def. 2." (SBI General style)
        r"^DEFINITIONS",                # All-caps header
        "means and includes", "shall mean",
        "hereinafter referred to as"
    ],
    "general_conditions": [
        "general condition", "terms and condition",
        "general terms",
        # IRDAI-specific
        "cancellation", "free look period",
        "policy shall be void",
        "material facts", "misrepresentation",
        "arbitration", "dispute resolution",
        "grievance redressal", "ombudsman"
    ],
    "renewal": [
        "renewal", "premium", "grace period", "portability",
        # IRDAI-specific
        "migration", "lifelong renewal",
        "renewal shall not be denied",
        "cumulative bonus", "no claim bonus",
        "portability norms", "portability regulations"
    ],
    "modern_treatments": [
        # IRDAI mandated coverage category (post-2020 regulations)
        "modern treatment", "modern treatment methods",
        "robotic surgery", "stem cell therapy",
        "balloon sinuplasty", "deep brain stimulation",
        "oral chemotherapy", "immunotherapy",
        "intra vitreal injections",
        "uterine artery embolisation", "HIFU"
    ]
}

# ── IRDAI Document Structure Patterns ──
#
# Most IRDAI-filed policies follow this macro structure:
#
# 1. Customer Information Sheet (CIS) — SKIP (summary, not terms)
# 2. Policy Schedule — metadata (insurer, product, UIN)
# 3. Definitions — "Def. 1" through "Def. 40+"
# 4. Coverage — Roman numeral or "Section" numbered
#    ├── In-Patient Hospitalization
#    ├── Day Care Procedures
#    ├── Pre/Post Hospitalization
#    ├── Ambulance
#    ├── Organ Donor
#    ├── AYUSH Treatment
#    ├── Modern Treatments
#    └── Optional Covers (if any)
# 5. Exclusions — lettered sub-points (A, B, C...)
#    ├── Permanent Exclusions
#    ├── Waiting Period Exclusions (30 days, 24 months, 36-48 months)
#    └── Specific Disease Exclusions
# 6. Co-Payment clause (if applicable)
# 7. Sub-Limits table/section
# 8. Claim Process
# 9. General Conditions
# 10. Portability / Migration / Renewal
# 11. Grievance Redressal
# 12. Premium Table — SKIP (pricing, not terms)
# 13. Wellness Program — SKIP (loyalty program, not coverage)
#
# Output: hierarchical section tree
# Policy (Star Health Comprehensive, UIN: SHAHLIP22028V072122)
#  ├── Definitions (Def. 1 through Def. 35)
#  ├── Coverage
#  │    ├── Section 1: In-Patient Hospitalization
#  │    ├── Section 2: Pre-Hospitalization
#  │    ├── Section 3: Post-Hospitalization
#  │    ├── Section 4: Day Care Procedures
#  │    ├── Section 5: Ambulance
#  │    ├── Section 9: Accidental Death (if applicable)
#  │    └── Section 13: Modern Treatments
#  ├── Exclusions
#  │    ├── Permanent Exclusions (A.1 through A.17+)
#  │    ├── Waiting Period I: 30 days
#  │    ├── Waiting Period II: 24 months (specific diseases A-N)
#  │    └── Waiting Period III: 36 months (pre-existing diseases)
#  ├── Co-Payment (if applicable)
#  ├── Sub-Limits
#  ├── Claim Process
#  ├── General Conditions
#  └── Renewal / Portability
```

---

## 7. Chunking Strategy

### 7.1 Why Naive Chunking Fails for Insurance

Insurance documents have a critical property: **meaning is distributed across sections**. A single coverage clause might reference conditions defined 30 pages later, with exclusions in another section and sub-limits in yet another.

Naive fixed-size chunking (every 500 tokens) breaks these relationships.

### 7.2 Structure-Aware Chunking Design

```
LEVEL 1: Section-level chunks
    "Section 4: Hospitalization Benefits" (entire section)
    Used for: broad retrieval, section-level questions

LEVEL 2: Clause-level chunks
    "4.2: Coverage is subject to a maximum of ₹5,000 per day for room rent..."
    Used for: specific clause retrieval, fact extraction

LEVEL 3: Paragraph-level chunks (fallback)
    Individual paragraphs within a clause
    Used for: when section/clause detection fails
```

### 7.3 Chunk Data Model

```python
# core/chunking/models.py

@dataclass
class PolicyChunk:
    chunk_id: str               # Unique identifier
    policy_id: str              # Parent policy
    text: str                   # Chunk content
    level: str                  # "section", "clause", "paragraph"

    # ── Structural metadata ──
    section_name: str           # "Waiting Period"
    section_type: str           # "waiting_period" (from KNOWN_SECTIONS)
    clause_number: str          # "7.2"
    page_number: int            # Source page in PDF

    # ── Semantic metadata ──
    content_type: str           # "coverage", "exclusion", "condition",
                                # "limit", "process", "definition"
    entities: List[str]         # ["room_rent", "icu", "co-pay"]
    financial_values: List[str] # ["₹5,000", "20%", "₹5,00,000"]

    # ── Embedding ──
    embedding: List[float]      # 384-dim vector (MiniLM)
```

### 7.4 Chunking Pipeline

```
Raw cleaned text
    │
    ▼
Section Detector
    │  Identifies section boundaries using header matching
    │  Output: List of sections with line ranges
    │
    ▼
Clause Splitter
    │  Within each section, splits on clause numbers (1.1, 1.2, a), b), i), ii))
    │  Preserves clause numbering in metadata
    │  Output: List of clause-level chunks
    │
    ▼
Size Guard
    │  If any chunk > 1000 tokens → split on paragraph boundaries
    │  If any chunk < 50 tokens → merge with adjacent chunk
    │  Output: Right-sized chunks
    │
    ▼
Metadata Enricher
    │  For each chunk:
    │    - Classify content_type using keyword matching
    │    - Extract financial_values using regex
    │    - Tag entities (room_rent, co-pay, waiting_period, etc.)
    │  Output: Enriched chunks with metadata
    │
    ▼
Embedding Generator
    │  all-MiniLM-L6-v2 generates 384-dim embeddings
    │  Output: Chunks with embeddings
    │
    ▼
ChromaDB Storage
    │  Store chunk text + embedding + metadata
    │  Metadata is filterable in Chroma queries
```

---

## 8. RAG Architecture

### 8.1 Retrieval Strategy

The RAG system uses a two-stage retrieval approach:

```
USER QUERY
    │
    ▼
Stage 1: VECTOR SEARCH (broad recall)
    │  ChromaDB similarity search
    │  k = 10 candidates
    │  Filters: policy_id (if specified), content_type (if inferrable)
    │
    ▼
Stage 2: METADATA RERANKING (precision)
    │  Re-score candidates using:
    │    - Semantic similarity score (from Stage 1)
    │    - Section-type match bonus (+0.2 if section matches query intent)
    │    - Recency bonus (newer policies weighted slightly higher)
    │    - Financial-entity match bonus (if query mentions amounts)
    │  Output: Top-5 chunks, ranked
    │
    ▼
CONTEXT ASSEMBLY
    │  For each selected chunk:
    │    - Include the chunk text
    │    - Include clause reference (e.g., "Section 4.2")
    │    - Include section context ("This is from the Hospitalization Benefits section")
    │  Assemble into structured context for LLM
```

### 8.2 ChromaDB Collection Design

```python
# One collection per family (MVP simplification)
# Production would use multi-tenant filtering

COLLECTION_SCHEMA = {
    "name": "policy_chunks_{family_id}",
    "metadata": {
        "hnsw:space": "cosine"  # Cosine similarity for normalized embeddings
    }
}

# Each document stored with metadata for filtered retrieval:
{
    "id": "chunk_abc123",
    "document": "Coverage is subject to a maximum room rent of ₹5,000 per day...",
    "embedding": [0.023, -0.118, ...],  # 384-dim
    "metadata": {
        "policy_id": "pol_xyz",
        "section_type": "coverage",
        "clause_number": "4.2",
        "content_type": "limit",
        "page_number": 12,
        "has_financial_value": True
    }
}
```

### 8.3 Query Construction

Different user intents require different retrieval strategies:

| User Intent | Query Strategy | Metadata Filters |
|---|---|---|
| "What does my policy cover?" | Direct semantic search | `content_type: coverage` |
| "What's not covered?" | Semantic search for exclusions | `section_type: exclusions` |
| "What about waiting periods?" | Direct match | `section_type: waiting_period` |
| "₹7L hospitalization scenario" | Multi-query: coverage + co-pay + sub-limits | `section_type IN (coverage, copay, sublimits)` |
| "Is dental covered?" | Semantic search + exclusion check | No filter (search broadly) |

---

## 9. Rules Engine Design

### 9.1 Why a Rules Engine (Not Just LLM)

The rules engine exists because financial calculations and coverage gap detection must be deterministic. An LLM might say "your co-pay could be around 20%" when the policy explicitly states 20%. The rules engine says exactly 20%, every time.

### 9.2 Rule Categories

```python
# core/rules/engine.py

class RulesEngine:
    """
    Evaluates extracted policy facts against benchmarks and family context.
    Produces ProtectionFlags — deterministic, reproducible, evidence-backed.
    """

    RULE_CATEGORIES = [
        CoverageGapRules,       # Is there coverage at all?
        SumInsuredRules,        # Is the coverage amount meaningful?
        CopayRules,             # Does co-pay create significant exposure?
        WaitingPeriodRules,     # Are waiting periods a current risk?
        SublimitRules,          # Do sub-limits reduce effective coverage?
        ClaimReadinessRules,    # Is the family prepared to file a claim?
        CrossPolicyRules,       # Gaps across family's policy portfolio
    ]
```

### 9.3 Rule Definitions (Detailed)

```python
# ═══════════════════════════════════════════
# RULE SET 1: Coverage Gap Detection
# ═══════════════════════════════════════════

class CoverageGapRules:
    """
    Detects members with no coverage or critically missing coverage types.
    """

    def no_health_cover(member, policies):
        """Flag if a family member has no active health insurance."""
        health_policies = [p for p in policies
                          if p.type == 'health'
                          and member.id in p.covers_members]
        if not health_policies:
            return ProtectionFlag(
                severity="critical",
                flag_type="no_cover",
                title=f"No health coverage detected for {member.name}",
                description="No active health insurance policy was found "
                           "covering this family member.",
                member_id=member.id
            )

    def no_life_cover_for_earner(member, policies):
        """Flag if a primary earner has no life insurance."""
        if member.relationship in ('self', 'spouse') and member.annual_income:
            life_policies = [p for p in policies
                            if p.type == 'life'
                            and member.id in p.covers_members]
            if not life_policies:
                return ProtectionFlag(
                    severity="critical",
                    flag_type="no_cover",
                    title=f"No life coverage for income earner: {member.name}",
                    description="This family member contributes to household "
                               "income but has no detected life insurance.",
                    member_id=member.id
                )


# ═══════════════════════════════════════════
# RULE SET 2: Sum Insured Adequacy
# ═══════════════════════════════════════════

class SumInsuredRules:
    """
    Checks whether sum insured is meaningful for the member's profile.
    Does NOT make absolute sufficiency claims.
    Uses tiered benchmarks by age and city tier.
    """

    # Indicative benchmarks (not financial advice)
    HEALTH_BENCHMARKS = {
        "metro": {
            (0, 30):  500_000,
            (31, 45): 1_000_000,
            (46, 60): 1_500_000,
            (61, 99): 2_000_000,
        },
        "non_metro": {
            (0, 30):  300_000,
            (31, 45): 500_000,
            (46, 60): 1_000_000,
            (61, 99): 1_500_000,
        }
    }

    def sum_insured_vs_benchmark(member, policy_facts, city_tier):
        """
        Compare sum insured against age/city benchmark.
        Flag as 'warning' if below benchmark — never as 'insufficient'.
        """
        benchmark = get_benchmark(member.age, city_tier)
        if policy_facts.sum_insured and policy_facts.sum_insured < benchmark:
            gap_pct = ((benchmark - policy_facts.sum_insured) / benchmark) * 100
            return ProtectionFlag(
                severity="warning",
                flag_type="insufficient_cover",
                title=f"Health coverage may leave exposure for {member.name}",
                description=(
                    f"Current sum insured (₹{policy_facts.sum_insured:,.0f}) "
                    f"is below typical benchmarks for age {member.age} in "
                    f"a {city_tier} city. This does not mean the coverage is "
                    f"inadequate — actual needs depend on individual circumstances."
                ),
                calculated_data={
                    "sum_insured": policy_facts.sum_insured,
                    "benchmark": benchmark,
                    "gap_percentage": round(gap_pct, 1)
                }
            )


# ═══════════════════════════════════════════
# RULE SET 3: Co-Pay Exposure
# ═══════════════════════════════════════════

class CopayRules:

    def copay_exposure(policy_facts):
        """Flag if co-pay exists — user may not realize they owe a percentage."""
        if policy_facts.copay_percent and policy_facts.copay_percent > 0:
            example_claim = 500_000  # ₹5L example
            copay_amount = example_claim * (policy_facts.copay_percent / 100)
            return ProtectionFlag(
                severity="warning" if policy_facts.copay_percent >= 20 else "info",
                flag_type="high_copay",
                title="Co-payment applies to claims",
                description=(
                    f"This policy has a {policy_facts.copay_percent}% co-pay. "
                    f"For a ₹{example_claim:,.0f} claim, the policyholder would "
                    f"need to pay approximately ₹{copay_amount:,.0f} from their "
                    f"own pocket, in addition to any other deductions."
                ),
                calculated_data={
                    "copay_percent": policy_facts.copay_percent,
                    "example_claim": example_claim,
                    "copay_amount": copay_amount
                }
            )


# ═══════════════════════════════════════════
# RULE SET 4: Waiting Period Risk
# ═══════════════════════════════════════════

class WaitingPeriodRules:

    def ped_waiting_active(policy_facts, policy):
        """Flag if pre-existing disease waiting period hasn't elapsed."""
        if policy_facts.ped_waiting_months and policy.start_date:
            months_active = months_between(policy.start_date, today())
            if months_active < policy_facts.ped_waiting_months:
                remaining = policy_facts.ped_waiting_months - months_active
                return ProtectionFlag(
                    severity="warning",
                    flag_type="waiting_period_risk",
                    title="Pre-existing condition waiting period is active",
                    description=(
                        f"Claims related to pre-existing conditions may not be "
                        f"covered for approximately {remaining} more months. "
                        f"The policy's PED waiting period is "
                        f"{policy_facts.ped_waiting_months} months."
                    ),
                    evidence_clauses=["Waiting Period section"],
                    calculated_data={
                        "waiting_months": policy_facts.ped_waiting_months,
                        "months_elapsed": months_active,
                        "months_remaining": remaining
                    }
                )


# ═══════════════════════════════════════════
# RULE SET 5: Scenario Calculator
# ═══════════════════════════════════════════

class ScenarioCalculator:
    """
    Deterministic financial projection for "What if?" scenarios.
    Outputs numbers + caveats. Never claims accuracy beyond inputs.
    """

    def calculate_hospitalization(self, amount, policy_facts):
        """
        Calculate indicative insurer contribution and out-of-pocket.
        Returns both numbers AND a list of caveats that affect accuracy.
        """
        result = ScenarioResult()
        result.eligible_amount = amount

        # Step 1: Apply sum insured cap
        result.sum_insured_cap = min(amount, policy_facts.sum_insured or float('inf'))
        result.capped = amount > (policy_facts.sum_insured or float('inf'))

        # Step 2: Apply co-pay
        copay = policy_facts.copay_percent or 0
        result.copay_deduction = result.sum_insured_cap * (copay / 100)
        result.after_copay = result.sum_insured_cap - result.copay_deduction

        # Step 3: Indicative insurer contribution
        result.estimated_insurer_payout = result.after_copay
        result.estimated_out_of_pocket = amount - result.estimated_insurer_payout

        # Step 4: Caveats (critical for honesty)
        result.caveats = []
        if policy_facts.copay_percent:
            result.caveats.append(
                f"Co-pay of {copay}% has been applied to the capped amount."
            )
        if self._has_sublimits(policy_facts):
            result.caveats.append(
                "Sub-limits may further reduce the insurer's contribution "
                "for specific treatment types."
            )
        result.caveats.append(
            "Non-medical expenses, consumables, and items outside policy "
            "coverage are not included in this estimate."
        )
        result.caveats.append(
            "Actual payout depends on claim adjudication by the insurer."
        )

        result.confidence = "indicative"  # Never "exact" or "guaranteed"
        return result
```

### 9.4 Protection Score Calculation

```python
class ProtectionScorer:
    """
    Calculates a family-level protection score (0-100).
    The score is a composite indicator, not a financial rating.
    """

    WEIGHTS = {
        "health_coverage_exists":    25,  # Does every member have health cover?
        "life_coverage_exists":      20,  # Do earners have life cover?
        "sum_insured_adequacy":      20,  # How do sum insured values compare to benchmarks?
        "low_copay_exposure":        10,  # Are co-pays manageable?
        "no_active_waiting_periods": 10,  # Have waiting periods elapsed?
        "low_sublimit_risk":         10,  # Are sub-limits minimal?
        "claim_readiness":            5,  # Does the user have required documents?
    }

    # Each dimension scores 0-100, then weighted sum produces final score.
    # Score is always presented with context — never as a standalone number.
```

---

## 10. LLM Integration Layer

### 10.1 Provider Abstraction

```python
# core/llm/provider.py

class LLMProvider(ABC):
    """
    Abstract interface for LLM providers.
    Allows swapping Gemini ↔ Groq ↔ local model without changing business logic.
    """

    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.2,
                       max_tokens: int = 2000) -> LLMResponse:
        pass

class GeminiProvider(LLMProvider):
    """Google Gemini 2.5 Flash — primary provider."""
    # Free tier: 15 RPM, 1M tokens/day
    # Model: gemini-2.5-flash

class GroqProvider(LLMProvider):
    """Groq (Llama 3.1 8B) — fallback provider."""
    # Free tier: 30 RPM
    # Used when Gemini rate limit is hit

class LLMRouter:
    """
    Routes requests to available provider.
    Primary → Gemini. Fallback → Groq. Fail → cached response / error.
    """
    def route(self, request) -> LLMProvider:
        if self.gemini.is_available():
            return self.gemini
        elif self.groq.is_available():
            return self.groq
        else:
            raise LLMUnavailableError("All LLM providers exhausted")
```

### 10.2 Prompt Architecture

The system uses four specialized prompt templates:

```
PROMPT 1: EXTRACTION
─────────────────────
Role: Convert policy text into structured JSON facts.
Input: Raw policy clause text
Output: JSON with sum_insured, copay, waiting_period, exclusions, etc.
Temperature: 0.0 (deterministic extraction)
Guardrails:
  - Extract ONLY what is explicitly stated
  - Mark uncertain fields as null with confidence score
  - Never infer values not present in text

PROMPT 2: EXPLANATION
─────────────────────
Role: Explain a protection flag to a non-expert user.
Input: Flag details + relevant policy clauses + calculated numbers
Output: Plain-language explanation with evidence
Temperature: 0.3
Guardrails:
  - Use "may", "potential", "could" — never definitive claims
  - Always cite the specific clause
  - Include what the user should verify independently
  - Never recommend buying/selling insurance products

PROMPT 3: SCENARIO
──────────────────
Role: Narrate a scenario simulation result.
Input: ScenarioResult (from rules engine) + relevant clauses
Output: Step-by-step financial walkthrough with caveats
Temperature: 0.3
Guardrails:
  - Lead with the deterministic numbers (from rules engine)
  - Explain what each deduction means
  - List ALL caveats
  - End with "This is an indicative estimate, not a coverage guarantee"

PROMPT 4: CHAT (Q&A)
────────────────────
Role: Answer a user's question about their policy.
Input: User question + top-5 retrieved chunks + structured facts
Output: Direct answer with clause citations
Temperature: 0.3
Guardrails:
  - Only answer from provided context — never from general knowledge
  - If answer is not in the retrieved chunks, say so explicitly
  - Cite clause numbers for every factual claim
  - Distinguish between "the policy says X" and "this means Y for you"
```

### 10.3 Hallucination Prevention

```
┌───────────────────────────────────────────────────────┐
│              HALLUCINATION PREVENTION STACK            │
│                                                       │
│  Layer 1: Constrained prompts                         │
│    → LLM only sees retrieved evidence, not full       │
│      training knowledge                               │
│                                                       │
│  Layer 2: Deterministic calculations                  │
│    → Financial numbers computed by Python, not LLM    │
│                                                       │
│  Layer 3: Evidence grounding                          │
│    → Every claim must reference a specific clause     │
│                                                       │
│  Layer 4: Uncertainty signals                         │
│    → Extraction confidence scores (0.0 - 1.0)        │
│    → Scenario results marked as "indicative"          │
│    → Low-confidence extractions flagged in UI         │
│                                                       │
│  Layer 5: Output validation                           │
│    → Check: does the response mention clauses         │
│      that actually exist in the retrieved context?    │
│    → Check: are numerical claims consistent with      │
│      rules engine output?                             │
└───────────────────────────────────────────────────────┘
```

---

## 11. API Design

### 11.1 Endpoint Specification

```
BASE URL: /api/v1

═══════════════════════════════════════════
FAMILY MANAGEMENT
═══════════════════════════════════════════

POST   /family
       Create a new family profile.
       Body: { name: str }
       Returns: { family_id, name, created_at }

POST   /family/{family_id}/members
       Add a family member.
       Body: {
           name: str,
           relationship: "self" | "spouse" | "child" | "parent_1" | "parent_2",
           age: int,
           city: str (optional),
           known_conditions: [str] (optional),
           annual_income: float (optional)
       }
       Returns: { member_id, ... }

GET    /family/{family_id}
       Get family profile with all members.
       Returns: { family, members: [...] }


═══════════════════════════════════════════
POLICY INGESTION
═══════════════════════════════════════════

POST   /family/{family_id}/policies/upload
       Upload a policy PDF for a family member.
       Content-Type: multipart/form-data
       Fields:
           file: PDF file
           member_id: str
           policy_type: "health" | "life"
       Returns: { policy_id, status: "processing" }

       This triggers the async ingestion pipeline:
       Extract → Clean → Chunk → Embed → Extract Facts → Evaluate Rules

GET    /policies/{policy_id}/status
       Check ingestion status.
       Returns: {
           status: "pending" | "processing" | "completed" | "failed",
           progress: {
               steps_completed: int,
               total_steps: int,
               current_step: str
           },
           error: str (if failed)
       }

GET    /policies/{policy_id}/facts
       Get extracted structured facts.
       Returns: {
           policy_facts: { sum_insured, copay, ... },
           exclusions: [...],
           sublimits: [...],
           extraction_confidence: float
       }


═══════════════════════════════════════════
PROTECTION ANALYSIS
═══════════════════════════════════════════

GET    /family/{family_id}/protection
       Get the Family Protection Dashboard data.
       Returns: {
           overall_score: int (0-100),
           members: [
               {
                   member_id, name, relationship,
                   health_cover: { sum_insured, status },
                   life_cover: { sum_assured, status },
                   protection_status: "strong" | "moderate" | "gap_detected"
               }
           ],
           flags: [
               {
                   flag_id, severity, flag_type,
                   title, description,
                   member_name, policy_name,
                   evidence_clauses: [str],
                   calculated_data: {}
               }
           ],
           score_breakdown: {
               health_coverage_exists: int,
               life_coverage_exists: int,
               sum_insured_adequacy: int,
               ...
           }
       }


═══════════════════════════════════════════
SCENARIO SIMULATION
═══════════════════════════════════════════

POST   /family/{family_id}/scenarios
       Run a "What if?" scenario simulation.
       Body: {
           scenario_text: str
           (e.g., "What if my father needs ₹7 lakh hospitalization?")
       }
       Returns: {
           scenario_id,
           scenario_params: { member, event, amount },
           financial_projection: {
               eligible_amount,
               sum_insured_cap,
               copay_deduction,
               estimated_insurer_payout,
               estimated_out_of_pocket
           },
           caveats: [str],
           explanation: str,
           evidence_clauses: [
               { clause: "4.2", text: "...", section: "Coverage" }
           ],
           confidence: "indicative"
       }


═══════════════════════════════════════════
POLICY Q&A (CHAT)
═══════════════════════════════════════════

POST   /family/{family_id}/chat
       Ask a question about the family's policies.
       Body: {
           question: str,
           policy_id: str (optional — if asking about a specific policy)
       }
       Returns: {
           answer: str,
           evidence: [
               { clause: "7.2", text: "...", section: "Waiting Period", policy: "..." }
           ],
           confidence: "high" | "medium" | "low",
           follow_up_suggestions: [str]
       }
```

### 11.2 Error Response Format

```json
{
    "error": {
        "code": "POLICY_EXTRACTION_FAILED",
        "message": "Unable to extract text from the uploaded PDF. The document may be scanned or image-based.",
        "details": {
            "pdf_page_count": 45,
            "extracted_text_length": 12,
            "likely_cause": "scanned_document"
        },
        "suggestion": "Please upload a digitally-generated PDF. Scanned documents are not supported in this version."
    }
}
```

---

## 12. Frontend Architecture

### 12.1 Page Structure

```
app/
├── page.tsx                    # Landing / Family Setup
├── layout.tsx                  # Root layout with navigation
│
├── dashboard/
│   └── page.tsx                # Family Protection Dashboard
│                                 (protection score, member cards, flags)
│
├── upload/
│   └── page.tsx                # Policy Upload flow
│                                 (drag-drop, progress, extraction preview)
│
├── policy/
│   └── [id]/
│       └── page.tsx            # Individual policy detail view
│                                 (facts, exclusions, sub-limits, clauses)
│
├── scenarios/
│   └── page.tsx                # "What If?" Scenario Simulator
│                                 (natural language input, financial projection,
│                                  evidence cards)
│
├── chat/
│   └── page.tsx                # Policy Q&A Chat
│                                 (conversational interface with citations)
│
└── components/
    ├── ProtectionScoreRing.tsx  # Circular progress for 74/100
    ├── MemberCard.tsx           # Per-member coverage summary
    ├── FlagCard.tsx             # Protection gap alert card
    ├── EvidenceCard.tsx         # Policy clause citation card
    ├── ScenarioResult.tsx       # Financial projection display
    ├── PolicyUploader.tsx       # Drag-drop PDF upload
    ├── ChatMessage.tsx          # Q&A message bubble with citations
    └── ConfidenceBadge.tsx      # High/Medium/Low confidence indicator
```

### 12.2 Key UI Flows

**Flow 1: First-Time Setup (2 screens)**

```
Screen 1: Family Profile
┌──────────────────────────────────────┐
│  👨‍👩‍👧 Set Up Your Family              │
│                                      │
│  Family Name: [Sharma Family     ]   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ + Add Family Member          │    │
│  │                              │    │
│  │  Name: [Rahul            ]   │    │
│  │  Relationship: [Self ▼   ]   │    │
│  │  Age: [32                ]   │    │
│  │  City: [Pune             ]   │    │
│  └──────────────────────────────┘    │
│                                      │
│  Members added:                      │
│  ✓ Rahul (Self, 32)                  │
│  ✓ Priya (Spouse, 30)               │
│  ✓ Arya (Child, 3)                  │
│  ✓ Ramesh (Parent, 63)              │
│                                      │
│  [Continue to Upload Policies →]     │
└──────────────────────────────────────┘

Screen 2: Policy Upload
┌──────────────────────────────────────┐
│  📄 Upload Insurance Policies        │
│                                      │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │                              │    │
│  │   Drop PDF here or click     │    │
│  │   to upload                  │    │
│  │                              │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                      │
│  For: [Ramesh (Parent) ▼]            │
│  Type: [Health Insurance ▼]          │
│                                      │
│  Uploaded:                           │
│  ✓ Rahul_Health_ICICI.pdf            │
│  ⏳ Ramesh_Health_StarHealth.pdf      │
│    Processing... (Step 3/8)          │
│                                      │
│  [View Protection Dashboard →]       │
└──────────────────────────────────────┘
```

**Flow 2: Protection Dashboard**

```
┌──────────────────────────────────────────────────────┐
│  🛡️ Sharma Family Protection                         │
│                                                      │
│  ┌─────────────────┐                                 │
│  │                  │                                 │
│  │    74 / 100      │  Overall Protection Score       │
│  │    ◕            │  "Moderate — gaps detected"     │
│  │                  │                                 │
│  └─────────────────┘                                 │
│                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Rahul  │ │ Priya  │ │  Arya  │ │ Ramesh │        │
│  │ 🟢     │ │ 🟡     │ │ 🟢     │ │ 🔴     │        │
│  │₹10L H  │ │₹5L H   │ │₹5L H   │ │₹5L H   │        │
│  │₹1Cr L  │ │₹25L L  │ │  — L   │ │  — L   │        │
│  └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                      │
│  ⚠️ Protection Gaps (3)                               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 🔴 CRITICAL                                   │    │
│  │ Parent health coverage may leave significant  │    │
│  │ out-of-pocket exposure                        │    │
│  │                                               │    │
│  │ Ramesh's ₹5L policy with 20% co-pay and     │    │
│  │ sub-limits may not cover high-cost treatment  │    │
│  │                                               │    │
│  │ 📄 Evidence: Clause 4.2, 8.1                  │    │
│  │ [See Details] [Run Scenario →]                │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 🟡 WARNING                                    │    │
│  │ Spouse's life coverage may be low relative    │    │
│  │ to household liabilities                      │    │
│  │ ...                                           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [🔮 Run "What If?" Scenario]  [💬 Ask About Policy] │
└──────────────────────────────────────────────────────┘
```

### 12.3 State Management

```
Frontend State (React Context + useState)
│
├── FamilyContext
│   ├── family: { id, name }
│   ├── members: FamilyMember[]
│   └── isSetupComplete: boolean
│
├── PolicyContext
│   ├── policies: Policy[]
│   ├── uploadQueue: UploadItem[]
│   └── ingestionStatus: Map<policyId, status>
│
├── ProtectionContext
│   ├── overallScore: number
│   ├── memberScores: Map<memberId, score>
│   ├── flags: ProtectionFlag[]
│   └── isLoading: boolean
│
└── ChatContext
    ├── messages: ChatMessage[]
    └── isStreaming: boolean
```

---

## 13. Deployment Architecture

### 13.1 Infrastructure Topology

```
┌──────────────────────────────┐
│         VERCEL (Free)        │
│                              │
│  Next.js Frontend            │
│  ├── Static pages (SSG)      │
│  ├── API route proxy         │
│  │   └── /api/* → Railway    │
│  └── Edge functions          │
│                              │
│  Domain: policy-intel.vercel │
│  .app                        │
└─────────────┬────────────────┘
              │ HTTPS
              ▼
┌──────────────────────────────┐
│       RAILWAY (Free trial)   │
│                              │
│  Docker Container            │
│  ├── FastAPI app (port 8000) │
│  ├── ChromaDB (in-process)   │
│  ├── SQLite (file-based)     │
│  ├── Sentence-Transformers   │
│  │   (model loaded at start) │
│  └── PDF uploads (temp dir)  │
│                              │
│  URL: *.railway.app          │
└─────────────┬────────────────┘
              │ HTTPS
              ▼
┌──────────────────────────────┐
│     EXTERNAL APIs (Free)     │
│                              │
│  Google Gemini API           │
│  └── 15 RPM / 1M TPD        │
│                              │
│  Groq API (fallback)         │
│  └── 30 RPM                  │
└──────────────────────────────┘
```

### 13.2 Dockerfile (Railway)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download embedding model at build time (not at runtime)
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/chroma /app/data/sqlite

# Expose port
EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 13.3 Environment Variables

```bash
# ── LLM Providers ──
GEMINI_API_KEY=                    # Google AI Studio (free)
GROQ_API_KEY=                      # Groq Cloud (free)
PRIMARY_LLM=gemini                 # "gemini" or "groq"

# ── Paths ──
SQLITE_PATH=/app/data/sqlite/policy_intel.db
CHROMA_PATH=/app/data/chroma
UPLOAD_DIR=/app/data/uploads

# ── App Config ──
MAX_PDF_SIZE_MB=10
MAX_CHUNKS_PER_POLICY=500
EMBEDDING_MODEL=all-MiniLM-L6-v2
CORS_ORIGINS=https://policy-intel.vercel.app

# ── Rate Limiting ──
GEMINI_RPM_LIMIT=14                # Stay under 15 RPM free tier
GROQ_RPM_LIMIT=28                  # Stay under 30 RPM free tier
```

### 13.4 Railway Free Tier Considerations

| Constraint | Mitigation |
|---|---|
| $5 trial credit (no credit card) | Monitor usage; demo-only traffic keeps costs minimal |
| 512 MB RAM (starter) | MiniLM model is ~80MB; ChromaDB in-process is lightweight; SQLite is minimal |
| Ephemeral disk (restarts lose data) | Acceptable for MVP demo; document this limitation |
| Sleep after inactivity | Cold start adds ~15s (model loading); pre-warm before demos |

---

## 14. Error Handling & Resilience

### 14.1 Error Categories and Responses

```python
# Hierarchical error handling strategy

ERROR_TAXONOMY = {

    # ── PDF Processing Errors ──
    "PDF_EMPTY": {
        "status": 422,
        "user_message": "The uploaded file appears to be empty or corrupted.",
        "action": "Ask user to re-upload"
    },
    "PDF_SCANNED": {
        "status": 422,
        "user_message": "This appears to be a scanned document. "
                       "Currently, only digitally-generated PDFs are supported.",
        "action": "Reject gracefully"
    },
    "PDF_TOO_LARGE": {
        "status": 413,
        "user_message": "File size exceeds the 10 MB limit.",
        "action": "Reject with size guidance"
    },
    "PDF_NOT_INSURANCE": {
        "status": 422,
        "user_message": "This document doesn't appear to be an insurance policy. "
                       "Please upload a health or life insurance policy document.",
        "action": "Reject with guidance"
    },

    # ── LLM Errors ──
    "LLM_RATE_LIMITED": {
        "status": 429,
        "user_message": "The system is experiencing high demand. "
                       "Please try again in a moment.",
        "action": "Retry with fallback provider → queue if both fail"
    },
    "LLM_EXTRACTION_FAILED": {
        "status": 500,
        "user_message": "We couldn't fully analyze this policy section. "
                       "Some details may be missing.",
        "action": "Continue with partial extraction; flag low confidence"
    },

    # ── RAG Errors ──
    "NO_RELEVANT_CHUNKS": {
        "status": 200,  # Not an error — just no results
        "user_message": "I couldn't find information about that in your "
                       "uploaded policies. Could you rephrase your question?",
        "action": "Return graceful empty state"
    }
}
```

### 14.2 Graceful Degradation Strategy

```
Full system operational:
  RAG + Rules + LLM = Complete protection intelligence

LLM unavailable (rate limited):
  RAG + Rules = Show flags with rule-based descriptions (no LLM explanation)
  Queue LLM explanation for later

RAG returns low-quality results:
  Rules engine still works on structured facts
  Chat responds: "I'm not confident in this answer based on the uploaded documents"

Extraction partially fails:
  Store what was extracted
  Flag missing fields
  Dashboard shows partial data with "some details could not be extracted" banner
```

---

## 15. Security Considerations (MVP Scope)

Even at MVP/demo grade, certain baseline protections are non-negotiable for insurance data:

| Concern | MVP Approach |
|---|---|
| Data in transit | HTTPS enforced (Vercel + Railway provide this by default) |
| Uploaded PDFs | Stored temporarily; deleted after processing completes; never shared |
| API access | CORS restricted to frontend domain; no public API documentation exposed |
| PII in policy text | Stays within the processing pipeline; never logged in full |
| LLM data sharing | Gemini/Groq API calls — review provider data retention policies |
| No auth (MVP) | Acknowledged as demo limitation; single-user assumed |
| SQLite | No encryption (acceptable for demo; flag for production) |

**Production upgrade path:** Add JWT auth, encrypt SQLite, use a managed DB, add audit logging, implement data retention policies, and conduct a proper security review before any real user data flows through the system.

---

## 16. Observability & Logging

### 16.1 Structured Logging

```python
# Minimum viable logging for debugging and demo

LOGGING_EVENTS = {
    # ── Pipeline tracking ──
    "policy.upload.started":     { "policy_id", "file_size", "member_id" },
    "policy.extraction.success": { "policy_id", "text_length", "page_count" },
    "policy.chunking.complete":  { "policy_id", "chunk_count", "avg_chunk_size" },
    "policy.embedding.complete": { "policy_id", "chunks_embedded" },
    "policy.facts.extracted":    { "policy_id", "facts_count", "avg_confidence" },
    "policy.rules.evaluated":   { "policy_id", "flags_generated", "score" },

    # ── LLM tracking ──
    "llm.request":              { "provider", "prompt_type", "tokens_in" },
    "llm.response":             { "provider", "tokens_out", "latency_ms" },
    "llm.fallback":             { "from_provider", "to_provider", "reason" },
    "llm.error":                { "provider", "error_type", "retry_count" },

    # ── RAG tracking ──
    "rag.query":                { "query_text", "results_count", "top_score" },
    "rag.no_results":           { "query_text", "filters_applied" },
}
```

---

## 17. Development Plan (72-Hour Sprint)

### 17.1 Hour-by-Hour Breakdown

```
═══════════════════════════════════════════════════════
PHASE 1: FOUNDATION (Hours 0–8)
═══════════════════════════════════════════════════════
  [0-2]   Project scaffolding
          - Initialize FastAPI backend + Next.js frontend
          - Set up project structure (as specified in §3.1)
          - Configure environment variables
          - Initialize SQLite with schema (as specified in §5.1)

  [2-4]   Sample data preparation
          - Source 2-3 real (publicly available) insurance policy PDFs
          - Manually annotate expected extraction results (ground truth)
          - Create demo family profile data

  [4-8]   PDF processing pipeline
          - Implement PyMuPDF text extraction
          - Build text cleaner
          - Build section detector with known-section matching
          - Test against sample PDFs
          - Validate: clean text output from 2-3 sample policies

═══════════════════════════════════════════════════════
PHASE 2: INTELLIGENCE LAYER (Hours 8–30)
═══════════════════════════════════════════════════════
  [8-14]  Chunking pipeline
          - Implement structure-aware chunker
          - Implement size guard (merge small, split large)
          - Implement metadata enricher
          - Test: verify chunks have correct section/clause metadata

  [14-20] RAG setup
          - Initialize ChromaDB collection
          - Implement embedding pipeline (MiniLM)
          - Implement retriever with metadata filtering
          - Implement context builder
          - Test: query "what is the co-pay" and verify correct clause returned

  [20-26] Structured extraction
          - Build LLM extraction prompt
          - Implement Gemini/Groq client
          - Build extraction → Pydantic validation → SQLite pipeline
          - Test: extracted facts match manually annotated ground truth

  [26-30] Rules engine
          - Implement coverage gap rules
          - Implement sum insured benchmark rules
          - Implement co-pay exposure rules
          - Implement waiting period rules
          - Implement protection score calculator
          - Test: rules generate expected flags for sample policies

═══════════════════════════════════════════════════════
PHASE 3: API + INTEGRATION (Hours 30–48)
═══════════════════════════════════════════════════════
  [30-36] FastAPI endpoints
          - POST /family + POST /members
          - POST /upload (with ingestion pipeline trigger)
          - GET /protection (dashboard data)
          - POST /scenarios (scenario simulation)
          - POST /chat (policy Q&A)
          - Error handling middleware

  [36-42] Scenario simulator
          - Implement scenario parameter parser (LLM-based)
          - Wire scenario calculator to rules engine
          - Build explanation generator
          - Test: "₹7L hospitalization for parent" returns correct projection

  [42-48] Policy chat
          - Build Q&A orchestration (retrieve → check facts → generate)
          - Implement evidence citation in responses
          - Test: 5-6 representative questions against sample policies

═══════════════════════════════════════════════════════
PHASE 4: FRONTEND + POLISH (Hours 48–72)
═══════════════════════════════════════════════════════
  [48-54] Core UI screens
          - Family setup screen (form)
          - Policy upload screen (drag-drop + progress)
          - Protection dashboard (score ring, member cards, flag cards)

  [54-60] Feature screens
          - Scenario simulator screen (input + result + evidence)
          - Policy chat screen (conversational UI with citations)
          - Individual policy detail view

  [60-66] Integration + deployment
          - Connect frontend to FastAPI endpoints
          - Deploy backend to Railway
          - Deploy frontend to Vercel
          - End-to-end test: upload → dashboard → scenario → chat

  [66-72] Demo polish
          - Loading states and progress indicators
          - Error states and empty states
          - Pre-load demo data (for when live upload isn't reliable)
          - Record demo walkthrough
          - Write README.md with architecture summary
```

### 17.2 Critical Path

The following items are on the critical path — if any of these slip, the demo breaks:

```
1. PDF text extraction must work on sample policies      → Gate: Hour 8
2. Chunking must produce meaningful, metadata-rich chunks → Gate: Hour 14
3. RAG must return relevant clauses for basic queries     → Gate: Hour 20
4. Extraction must produce valid structured facts         → Gate: Hour 26
5. Rules engine must generate at least 2-3 correct flags  → Gate: Hour 30
6. API endpoints must return dashboard + scenario data    → Gate: Hour 42
7. Frontend must render dashboard with real data          → Gate: Hour 60
```

If any gate is missed by more than 4 hours, cut scope from the frontend (simplify UI) to protect backend intelligence quality.

---

## 18. Architecture Decision Records

### ADR-001: SQLite over PostgreSQL

**Decision:** Use SQLite for structured policy data storage.

**Context:** The system needs relational storage for extracted policy facts, family profiles, and protection flags. PostgreSQL is the standard choice for production applications.

**Rationale:** SQLite is embedded (no server setup), zero-config, fast for single-user workloads, and ships with Python. For a single-user MVP demo, PostgreSQL adds deployment complexity (managed DB service, connection pooling, schema migrations) with no functional benefit. The SQLite → PostgreSQL migration path is straightforward via SQLAlchemy ORM.

**Consequences:** No concurrent writes (acceptable for single-user demo). No network access to DB (acceptable — backend and DB are co-located).

---

### ADR-002: ChromaDB over Pinecone

**Decision:** Use ChromaDB (local/embedded) for vector storage.

**Context:** The RAG pipeline needs a vector database for embedding storage and similarity search.

**Rationale:** ChromaDB runs in-process with no external service dependency, has no usage limits, no API keys, and no cost. Pinecone offers a free tier but adds network latency, external dependency, and potential rate limits. For a prototype with 500-2000 chunks, ChromaDB performance is more than adequate.

**Consequences:** Data is ephemeral (lost on Railway container restart). Acceptable for demo; would migrate to a persistent vector store for production.

---

### ADR-003: Deterministic Rules Engine over LLM-Only

**Decision:** Financial calculations and gap detection use a Python rules engine, not the LLM.

**Context:** The system needs to detect protection gaps and calculate financial exposure. Using an LLM for everything would be simpler to build.

**Rationale:** LLMs hallucinate numbers. In a financial/insurance context, a hallucinated co-pay calculation could mislead a user about their real exposure. Deterministic rules always produce the same output for the same input, are testable, auditable, and explainable. The LLM is reserved for what it's good at: natural language explanation and evidence synthesis.

**Consequences:** More code to write (rules are explicit, not prompt-driven). But the tradeoff is correctness in a high-stakes domain — the right engineering decision.

---

### ADR-004: LLM Provider Abstraction

**Decision:** Build an abstraction layer over LLM providers with automatic fallback.

**Context:** The system depends on free-tier LLM APIs (Gemini, Groq), which have rate limits.

**Rationale:** Free-tier rate limits will be hit during development and demos. A provider abstraction with automatic Gemini → Groq fallback ensures the system remains functional. The abstraction also makes it trivial to add new providers or swap to a local model later.

**Consequences:** Slight increase in code complexity. But prevents demo-breaking failures when a single provider is rate-limited.

---

### ADR-005: Structure-Aware Chunking over Fixed-Size

**Decision:** Chunk policy documents by section/clause structure, not fixed token windows.

**Context:** RAG quality depends heavily on chunk quality. Insurance policies have cross-referential structures where meaning spans multiple sections.

**Rationale:** Fixed-size chunking at 500 tokens can split a coverage clause mid-sentence or separate a condition from the coverage it modifies. Structure-aware chunking preserves semantic units (a complete clause, a full exclusion definition) and attaches metadata (section type, clause number) that enables filtered retrieval. The metadata filter "only search in exclusions" dramatically improves retrieval precision.

**Consequences:** Requires building a section detector, which adds ~4 hours of development. But this is the single highest-leverage investment in system quality.

---

*Document Version: 1.0*
*Last Updated: August 2026*
*Author: Ayantika Pyne*
*Project: Policy Intelligence — Hybrid RAG + Deterministic Reasoning Architecture*
*Status: Pre-Implementation Design*
