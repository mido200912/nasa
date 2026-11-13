# 🔥 Vulcan-X: AI Engine & Combustion Backend

> **2026 NASA Space Apps Challenge**  
> **Challenge:** *"Flame in Freefall: AI-Powered Fire Safety Insights"*  
> **Runtime:** [Bun](https://bun.sh) with TypeScript & Hono  
> **Architecture:** Clean Architecture (Separated Controllers, Services, Routes, Data Layers)

---

## 🚀 Overview

### Integration and execution boundaries

This service is a private upstream of ASP.NET Core, not a browser API. It binds to loopback by default (`VULCANX_BIND_HOST=127.0.0.1`). Container deployments must select an explicitly private interface/network; do not publish diagnostics, `/test`, key-status, or key-reset through the frontend/backend allowlist.

Knowledge currently composes source-bound corpus excerpts; it does **not** call a provider merely because credentials exist. A successful Knowledge response is not proof of provider inference or scientific validation. Its `sources` currently contain source URLs; the backend's exact-title matcher may correctly retain these as unmatched/unverified raw labels.

Provider operations accept caller cancellation without rotating keys on cancellation. Per-key attempts are bounded at 40 seconds and the overall provider operation at 55 seconds; the ASP.NET AI budget defaults to 60 seconds and Next.js to 75 seconds. Hazard explanation requests additionally cancel actual provider work after 8 seconds instead of leaving a losing promise running. No numerical simulation formula or scientific validation claim was added by the Milestone 6 changes.

Run `bun install --frozen-lockfile` and `bun test`. Cancellation tests use a controlled fake transport, not paid inference. For complete SQL/browser evidence and remaining scientific/deployment gates, see `../Backend/NASA-Project-Back-End/docs/integration/milestone-5-6-report.md`.

**Vulcan-X** is an AI-powered combustion data analytics and fire safety engine designed to interpret NASA **Physical Science Informatics (PSI)** combustion experiments (including **BASS, Saffire, ACME, FLEX, and CFI**). 

The platform protects human spaceflight habitats (**ISS, Lunar Bases, Mars Rovers**) and translates microgravity combustion findings into terrestrial dual-use applications for municipal firefighters and high-oxygen facilities.

---

## 🛠️ Architecture & Features

```
vulcan-x/Ai Model/
├── src/
│   ├── config/
│   │   └── env.ts                     # Environment config & 6-API key slots
│   ├── data/
│   │   └── official_nasa_corpus.ts    # Source-bound NASA RAG chunks
│   ├── types/
│   │   └── index.ts                   # Strict TypeScript schemas & interfaces
│   ├── services/
│   │   ├── aiProviderService.ts       # 6-API Key Rotation & Resilient Fallback Engine
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

To guarantee uninterrupted uptime during hackathon evaluations and live demos:
- The system manages **5 OpenRouter API key slots** (`OPENROUTER_API_KEY_1` through `OPENROUTER_API_KEY_5`).
- Uses strictly **OpenRouter** (`https://openrouter.ai/api/v1`) with recommended headers (`HTTP-Referer`, `X-Title`).
- **Automatic Failover:** When an active OpenRouter key triggers **HTTP 429 (Rate Limit)**, **Quota/Credits Exhaustion (402/403)**, or network timeout:
  1. The key is flagged and temporarily cooled down.
  2. The service seamlessly rotates to the next OpenRouter key in the pool.
  3. The request completes without client-facing disruption.
- **Offline / Zero-Crash Fallback:** If all 5 keys are exhausted or unset, the engine activates a **NASA-PSI Deterministic Scientific Engine** that synthesizes grounded facts directly from the onboard NASA PSI repository with zero hallucination.

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
    "answer": "Under NASA exploration atmospheres (34% O2 at 8.2 psi)...",
    "sources": [
      "Saffire (Urban, D., Ruff, G. A., et al)",
      "BASS (Ferkul, P. V., & T'ien, J. S)"
    ],
    "risk_level": "High"
  }
  ```

---

### 2. Habitat Simulation & Stress-Test
Evaluates combustion acceleration and material safety against NASA-STD-6001B.

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
      "recommendation": "CRITICAL COMBUSTION HAZARD in Lunar Base: Flame spread multiplier is elevated to 2.68x under 30% O2 at 10.2 psi. Material 'PMMA Acrylic' exceeds NASA-STD-6001 Test 1 safety threshold. Protocol: Replace with Kapton/Nomex and interlock cabin ventilation to shutdown within 5s."
    }
  }
  ```

---

### 3. Key Rotation Pool Diagnostics
Inspect the health and rotation status of all 6 API key slots in real-time.

- **Route:** `GET /api/v1/ai/key-status`
- **Response:**
  ```json
  {
    "success": true,
    "totalKeys": 6,
    "activeKeyIndex": 1,
    "keys": [
      {
        "index": 1,
        "provider": "groq",
        "maskedKey": "gsk_...9a1b",
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
cd "vulcan-x/Ai Model"
bun install
```

### 2. Configure Environment Keys
Copy `.env.example` to `.env` and insert your API keys (e.g., Groq, Gemini, OpenAI):
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
All tests run with native Bun speed (`< 250ms`).
