# 🔥 Vulcan-X: AI Engine & Combustion Backend

> **2026 NASA Space Apps Challenge**  
> **Challenge:** *"Flame in Freefall: AI-Powered Fire Safety Insights"*  
> **Runtime:** [Bun](https://bun.sh) with TypeScript & Hono  
> **Architecture:** Clean Architecture (Separated Controllers, Services, Routes, Data Layers)

---

## 🚀 Overview

### Integration and execution boundaries

This service is a private upstream of ASP.NET Core, not a browser API. It binds to loopback by default (`VULCANX_BIND_HOST=127.0.0.1`). Container deployments must select an explicitly private interface/network; do not publish diagnostics, `/test`, key-status, or key-reset through the frontend/backend allowlist.

### Vercel routing

Use the **Bun framework preset** with Root Directory `vulcan-x/ai-model`.
`vercel.json` pins the preset and Bun runtime; `server.ts` starts the single
`Bun.serve()` handler. Do not add a separate file-based `api/index.ts` adapter:
it competes with the native server's `/api/*` routes and can leave health
checks working while `/api/v1/ai/query` returns Vercel's `NOT_FOUND`.

After deployment, verify `/health/live` and `/api/v1/datasets` return 200.
A POST of `{}` to `/api/v1/ai/query` must return the application's 400 JSON
validation response, not a platform 404; this check does not call the AI provider.
Provider readiness alone is not proof of successful inference. Verify one
explicit educational Knowledge request end to end before claiming AI availability.

Genuine direct OpenRouter inference and a browser → Next.js → .NET 8 → Bun → OpenRouter → SQL → browser round-trip were verified on 13 November 2026 using the unchanged configured model. See [actual model, query ID, answer-hash and regression evidence](../Backend/NASA-Project-Back-End/docs/integration/openrouter-inference-verification-2026-11-13.md). Credentials remain owner-managed in the ignored local `.env`, never bundled with this repository.

Knowledge uses locally indexed corpus excerpts and NASA link intelligence as context for OpenRouter synthesis. Generation defaults to a 45-second cancellation budget (`KNOWLEDGE_TIMEOUT_MS`), allowing a complete 40-second provider attempt within the 55-second provider / 60-second backend / 75-second frontend budgets. **There is no deterministic Knowledge fallback:** missing/exhausted credentials return 503, invalid final output returns 502, and the generation deadline returns 504. Caller cancellation is propagated. A successful response includes the actual returned model identity in `generation`; this is provider-reported provenance, not scientific validation. Its `sources` contain retrieved URLs, not proof that a model cited or verified them. The backend matches approved URLs or legacy titles without guessing ambiguous records; unmatched URLs remain unverified.

Provider operations accept caller cancellation without rotating keys on cancellation. Per-key attempts are bounded at 40 seconds and the overall provider operation at 55 seconds; the ASP.NET AI budget defaults to 60 seconds and Next.js to 75 seconds. Hazard explanation requests additionally cancel actual provider work after 8 seconds instead of leaving a losing promise running. No numerical simulation formula or scientific validation claim was added by the Milestone 6 changes.

Run `bun install --frozen-lockfile` and `bun test`. Cancellation tests use a controlled fake transport, not paid inference. For complete SQL/browser evidence and remaining scientific/deployment gates, see `../Backend/NASA-Project-Back-End/docs/integration/milestone-5-6-report.md`.

**Vulcan-X** is an AI-powered combustion data analytics and fire safety engine designed to interpret NASA **Physical Science Informatics (PSI)** combustion experiments (including **BASS, Saffire, ACME, FLEX, and CFI**). 

This is a research/educational project, **not an operational safety system**. No protection, certified material performance, peer review, or validated numerical model is claimed.

In production (`NODE_ENV=production`), `/test` and key-management endpoints return 404, and the three legacy scientific simulator paths return 422 `HABITAT_FIXTURE_NOT_APPROVED`. They contain unvalidated formulas and must not be used as live scientific results. The separately labeled frontend educational simulator is unaffected. Default backend raw simulator endpoints also share the disabled scientific-submission gate.

---

## 🛠️ Architecture & Features

```
vulcan-x/ai-model/
├── src/
│   ├── config/
│   │   └── env.ts                     # Server-only configuration & 5 key slots
│   ├── data/
│   │   └── official_nasa_corpus.ts    # Source-bound NASA RAG chunks
│   ├── types/
│   │   └── index.ts                   # Strict TypeScript schemas & interfaces
│   ├── services/
│   │   ├── aiProviderService.ts       # OpenRouter rotation, deadlines & final-output validation
│   │   ├── ragService.ts              # NASA PSI RAG retrieval & citation pipeline
│   │   └── physicsSimulatorService.ts # Microgravity combustion stress-test physics
│   ├── controllers/
│   │   ├── aiController.ts            # Knowledge query & key-status controller
│   │   └── simulatorController.ts     # Physics simulation controller
│   ├── routes/
│   │   ├── aiRoutes.ts
│   │   ├── simulatorRoutes.ts
│   │   └── index.ts                   # Main route aggregator
│   └── index.ts                       # Server bootstrap & Bun.serve handler
├── tests/
│   └── api.test.ts                    # Bun test suite
├── .env.example                       # Key rotation configuration template
├── package.json
└── tsconfig.json
```

---

## 🔑 Critical Feature: 5 OpenRouter API Key Rotation & Failover Pool

Provider rotation is best effort; it does not guarantee uptime:
- The system manages **5 OpenRouter API key slots** (`OPENROUTER_API_KEY_1` through `OPENROUTER_API_KEY_5`).
- Uses strictly **OpenRouter** (`https://openrouter.ai/api/v1`) with recommended headers (`HTTP-Referer`, `X-Title`).
- **Automatic Failover:** When an active OpenRouter key triggers **HTTP 429 (Rate Limit)**, **Quota/Credits Exhaustion (402/403)**, or network timeout:
  1. The key is flagged and temporarily cooled down.
  2. The service seamlessly rotates to the next OpenRouter key in the pool.
   3. If no usable provider remains, Knowledge returns a safe error, not a fake successful answer.
- No zero-hallucination or scientific-validation guarantee is made.

---

## 📡 REST API Documentation

### 1. Knowledge & RAG Query
Queries source-bound official NASA excerpts. Each retrieved chunk includes `text_content`, `source_url`, `citation_title`, and `category`; unsupported questions explicitly abstain instead of using a generated fallback.

- **Route:** `POST /api/v1/ai/query`
- **Request Body:**
  ```json
  {
    "question": "How does reduced pressure and 34% oxygen affect flame spread in a lunar base?",
    "environment": "lunar_base"
  }
  ```
  *(Supported environments: `lunar_base`, `mars_rover`, `iss`, `earth`)*

- **Response:**
  ```json
  {
    "success": true,
    "answer": "<actual final provider text; not a captured response>",
    "sources": [],
    "retrieved_chunks": [],
    "emergency_playbook": [],
    "risk_level": "Low",
    "generation": { "mode": "ProviderInference", "provider": "openrouter", "model": "<actual provider-returned model ID>" }
  }
  ```

---

### 2. Habitat Simulation & Stress-Test
Legacy development-only formula experiment. **Not validated against NASA-STD-6001B.** Production responds 422 before computation; do not enable live scientific submission without approved inputs and a validated adapter.

- **Route:** `POST /api/v1/simulator/stress-test`
- **Request Body:**
  ```json
  {
    "habitat": "lunar",
    "oxygen_concentration": 30.0,
    "pressure_psi": 10.2,
    "material_type": "PMMA Acrylic"
  }
  ```
  *(Supported habitats: `lunar`, `mars`, `iss`)*

- **Response:**
  ```json
  {
    "success": true,
    "simulation_result": {
      "ignition_speed_multiplier": 2.68,
      "safety_status": "Critical",
      "recommendation": "<legacy development-only illustrative output; not an operational procedure>"
    }
  }
  ```

---

### 3. Key Rotation Pool Diagnostics
Development-only status for five key slots. Hidden in production and never proxied to the browser.

- **Route:** `GET /api/v1/ai/key-status`
- **Response:**
  ```json
  {
    "success": true,
    "totalKeys": 5,
    "activeKeyIndex": 1,
    "keys": [
      {
        "index": 1,
        "provider": "openrouter",
        "maskedKey": "NOT_CONFIGURED",
        "status": "ACTIVE",
        "failCount": 0,
        "successCount": 14
      }
    ]
  }
  ```

---

### 4. Datasets Catalog & Health Checks
- **Datasets:** `GET /api/v1/datasets` - Lists all onboard NASA PSI investigations.
- **Health:** `GET /health` - Service uptime and operational status.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd vulcan-x/ai-model
bun install
```

### 2. Configure Environment Keys
Copy `.env.example` to ignored `.env` and configure an authorized OpenRouter key (`OPENROUTER_API_KEY` or `OPENROUTER_API_KEY_1`…`_5`) and `OPENROUTER_MODEL`. No credentials are bundled. The configured default model is not evidence that it was invoked.
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
bun run dev
```
The server will start on `http://localhost:4000`.

### 4. Run Automated Test Suite
```bash
bun test
```
API contract tests inject a technical provider fixture; cancellation/error tests use controlled transport. None is live inference evidence. Current cross-service results and remaining external gates: [integration audit](../Backend/NASA-Project-Back-End/docs/integration/integration-audit-2026-11-13.md).
