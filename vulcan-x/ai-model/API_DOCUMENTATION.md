# 📡 Vulcan-X API Documentation

> Genuine provider inference was subsequently verified end-to-end on 13 November 2026; see [execution evidence](../Backend/NASA-Project-Back-End/docs/integration/openrouter-inference-verification-2026-11-13.md). The earlier “not verified” statement below describes the audit before credentials were supplied. Scientific/deployment gates remain unchanged.

> **Current integration contract — 13 November 2026:** This document's legacy simulator examples/formulas below are development-only and unvalidated, not scientific measurements, approved protocols, or captured provider responses. In production `/test` and key-status/reset are hidden (404); all legacy simulator POST paths are gated (422 `HABITAT_FIXTURE_NOT_APPROVED`). Knowledge now requires real provider synthesis, returns safe 503/502/504 failures without local-text fallback, and reports `generation: { mode: "ProviderInference", provider: "openrouter", model: "<actual returned model>" }`. No genuine inference was verified in this environment. See the [current audit](../Backend/NASA-Project-Back-End/docs/integration/integration-audit-2026-11-13.md) and [README](README.md) before using these historical examples.

> **NASA Space Apps Challenge 2026** — *"Flame in Freefall: AI-Powered Fire Safety Insights"*

**Base URL:** `http://localhost:4000`  
**Runtime:** Bun + Hono (TypeScript)  
**AI Provider:** OpenRouter (5-Key Rotation Pool)  
**Model:** `OPENROUTER_MODEL` / per-slot configuration; no model execution verified here.

---

## Table of Contents

- [Authentication & Configuration](#authentication--configuration)
- [Endpoints Overview](#endpoints-overview)
- [1. Root Info](#1-root-info)
- [2. Health Check](#2-health-check)
- [3. Interactive Test Bench & 3D WebGL Canvas](#3-interactive-test-bench--3d-webgl-canvas)
- [4. AI Knowledge & RAG Query](#4-ai-knowledge--rag-query)
- [5. Key Pool Status](#5-key-pool-status)
- [6. Key Pool Reset](#6-key-pool-reset)
- [7. Habitat Stress-Test Simulator](#7-habitat-stress-test-simulator)
- [8. Planetary & Habitat 3D Hazard Evaluation](#8-planetary--habitat-3d-hazard-evaluation)
  - [Planetary Physics Reference (NASA PSI)](#planetary-physics-reference-nasa-psi)
  - [Flame Geometry Types Reference](#flame-geometry-types-reference)
  - [Material Flammability Indices (NASA-STD-6001B)](#material-flammability-indices-nasa-std-6001b)
  - [Frontend 3D Canvas Integration Guide](#frontend-3d-canvas-integration-guide)
- [9. NASA PSI Datasets Catalog](#9-nasa-psi-datasets-catalog)
- [Error Responses](#error-responses)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)

---

## Authentication & Configuration

This API does **not** require client-side authentication headers. The OpenRouter API keys are securely managed server-side via environment variables (`.env`).

### 5-Key Failover Pool Architecture
The system orchestrates a pool of **5 OpenRouter API keys** with transparent rotation and failover:
1. **Load Distribution:** Requests utilize the active slot (Slot #1 by default).
2. **Automatic Failover:** On HTTP `429` (Rate Limited) or `402/403` (Quota/Credit Limit), the slot enters a 60-second cooldown (`KEY_COOLDOWN_MS`), and the request automatically shifts to the next standby slot without failing client requests.
3. **Transient Error Handling:** On unexpected provider errors, the slot enters a 15-second quick retry cooldown.
4. **State Recovery:** When an API key succeeds, its `failCount` resets to 0 and other unblocked keys return to `STANDBY`.
5. **Explicit failure:** If all external slots are unavailable, Knowledge fails safely with 503. Local retrieval is not substituted for inference. No hallucination/availability guarantee is made.

---

## Endpoints Overview

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Project info, status & complete endpoint directory |
| `GET` | `/health` | Backend health check, uptime, and timestamp |
| `GET` | `/test` | Interactive HTML test dashboard with real-time 3D Three.js canvas |
| `POST` | `/api/v1/ai/query` | AI-powered RAG combustion query with scientific citations |
| `GET` | `/api/v1/ai/links` | Link Intelligence Catalog & URL Content Explorer (`?q=:keyword`) |
| `GET` | `/api/v1/ai/key-status` | 5-key failover pool health and diagnostic telemetry |
| `POST` | `/api/v1/ai/key-reset` | Reset all 5 key slot counters, cooldowns, and statuses |
| `POST` | `/api/v1/simulator/stress-test` | Habitat combustion stress-test with AI recommendations |
| `POST` | `/api/v1/simulator/hazard-evaluation` | Planetary 3D canvas trigger parameters & visual physics |
| `GET` | `/api/v1/datasets` | NASA PSI research catalog (12 source-bound chunks) |

---

## 1. Root Info

**`GET /`**

Returns project identity, edition, challenge name, and an indexed map of all available endpoints.

### Response `200 OK`

```json
{
  "name": "Vulcan-X AI & Combustion Backend Engine",
  "edition": "NASA Space Apps Challenge 2026",
  "challenge": "Flame in Freefall: AI-Powered Fire Safety Insights",
  "status": "operational",
  "endpoints": {
    "ai_query": "POST /api/v1/ai/query",
    "key_status": "GET /api/v1/ai/key-status",
    "simulator_stress_test": "POST /api/v1/simulator/stress-test",
    "hazard_evaluation": "POST /api/v1/simulator/hazard-evaluation",
    "datasets": "GET /api/v1/datasets",
    "health": "GET /health"
  }
}
```

### cURL

```bash
curl http://localhost:4000/
```

---

## 2. Health Check

**`GET /health`**

Monitors backend service health, process uptime, and system timestamp.

### Response `200 OK`

```json
{
  "status": "healthy",
  "uptime": 248.152,
  "timestamp": "2026-11-11T20:45:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"healthy"` when operational |
| `uptime` | `number` | Process uptime in seconds |
| `timestamp` | `string` | ISO 8601 timestamp |

### cURL

```bash
curl http://localhost:4000/health
```

---

## 3. Interactive Test Bench & 3D WebGL Canvas

**`GET /test`** *(Alias: `GET /demo`)*

Serves the standalone, browser-ready interactive dashboard (`test.html`). It includes:
- **5-Key Pool Live Visualizer:** Real-time key slot indicators, success/fail counters, and a manual **🔄 Reset Keys** action.
- **RAG Query Bench:** Research question input, habitat environment presets, and citation viewer.
- **Habitat Stress-Test Bench:** Oxygen slider (15-45%), pressure slider (5-15 psi), material selectors, and AI-enriched protocol recommendations.
- **3D Microgravity & Habitat Combustion Visualizer:** Integrated **Three.js WebGL canvas** featuring a cylindrical test chamber (NASA-STD-6001), sample plate, dynamic flame mesh (morphing between spherical blue cores, ventilation trails, and plumes), thousands of particle sparks, real-time lighting flickers, and orbit controls.

---

## 4. AI Knowledge & RAG Query

**`POST /api/v1/ai/query`**

Executes a Retrieval-Augmented Generation (RAG) pipeline over NASA PSI research investigations (BASS, Saffire, ACME, FLEX, CFI, NASA-STD-6001B). Matches semantic keywords, scores environmental relevance, and prompts OpenRouter for an authoritative zero-hallucination analysis.

### Request Body

```json
{
  "question": "How does 34% oxygen at 8.2 psi accelerate PMMA solid fuel flame spread in a lunar habitat?",
  "environment": "lunar_base"
}
```

| Field | Type | Required | Allowed Values / Description |
|-------|------|----------|------------------------------|
| `question` | `string` | ✅ | Research inquiry (min 1 character) |
| `environment` | `string` | ✅ | `"lunar_base"`, `"mars_rover"`, `"iss"`, `"earth"` |

### Success Response `200 OK`

```json
{
  "success": true,
  "answer": "Based on NASA Physical Science Informatics (PSI) combustion research (including BASS, Saffire, and ACME investigations):\n\n1. Combustion Dynamics: In microgravity and exploration atmospheres, the absence of natural buoyant convection modifies flame propagation. Low-speed ventilation sustains flame spread rather than extinguishing it.\n2. Material Safety: Under elevated oxygen conditions (e.g. 30%-34% O2 in lunar atmospheres), PMMA acrylic exhibits accelerated flame spread multipliers exceeding 2.5x.\n3. Suppression Protocols: Automatic ventilation isolation, followed by inert gas suppression (CO2 / N2) with sufficient dwell time (>15 min) is required.",
  "sources": [
    "BASS (Burning and Suppression of Solids) (Ferkul, P. V.)",
    "Saffire (Spacecraft Fire Safety Experiment) (Urban, D.)",
    "NASA-STD-6001 Flammability Testing Standard"
  ],
  "risk_level": "High"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` on success |
| `answer` | `string` | AI-generated scientific analysis grounded in NASA PSI data |
| `sources` | `string[]` | Specific investigation titles and principal investigator citations |
| `risk_level` | `string` | Risk categorization: `"Low"`, `"Medium"`, or `"High"` |

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the cool flame phenomenon in NASA FLEX experiments?", "environment": "iss"}'
```

---

## 4.1. Link Intelligence & URL Content Explorer

**`GET /api/v1/ai/links`**  
**`GET /api/v1/ai/links?q=:searchQuery`**

Provides deep, structured insight into every official NASA source link in the knowledge base. It extracts and groups intelligence behind each URL, including key findings, categorized scientific summaries, searchable tags, and related environments.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | No | Optional keyword, facility, or mission name (e.g., `apollo`, `glenn`, `oxygen`, `spinoff`, `mir`). |

### Response `200 OK`

```json
{
  "success": true,
  "count": 5,
  "query": "apollo",
  "links": [
    {
      "url": "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1",
      "title": "Apollo 1 AS-204",
      "category": "historical_incident",
      "summary": "Analysis of the catastrophic 1967 Apollo 1 pad fire caused by a high-pressure 100% oxygen atmosphere and electrical arcing. Critical engineering redesigns following Apollo 1, including rapid-opening hatches and strict combustible material restrictions.",
      "key_findings": [
        "Pure oxygen at elevated pressures turns normally fire-resistant materials highly flammable and dramatically accelerates flame propagation.",
        "Pressure vessel rupture resulted from rapid gas heating and subsequent toxic gas release.",
        "Internal hatch design prevented the crew from executing an emergency escape in time.",
        "Replacement of slow multi-piece hatches with an outward-opening quick-release hatch operable in under 3 seconds.",
        "Atmosphere changed from 100% O2 on the launch pad to a nitrogen-oxygen mix (60/40) during pre-launch operations.",
        "Institution of stringent NASA-STD-6001 flammability testing for all flight items."
      ],
      "keywords": [
        "Apollo 1", "pure oxygen", "pressure", "fire spread", "escape", "toxic smoke", "capsule rupture", "hatch", "egress", "combustibles", "lessons learned"
      ],
      "environments": ["iss", "lunar_base", "mars_rover"],
      "chunk_ids": ["incident-apollo-1", "incident-apollo-1-lessons"]
    }
  ]
}
```

### cURL

```bash
# Retrieve all links with summarized intelligence
curl http://localhost:4000/api/v1/ai/links

# Search for specific link information
curl "http://localhost:4000/api/v1/ai/links?q=glenn"
```

---

## 5. Key Pool Status

**`GET /api/v1/ai/key-status`**

Exposes live diagnostics for the 5-key OpenRouter rotation pool. Useful for frontend health monitors and admin dashboards.

### Response `200 OK`

```json
{
  "success": true,
  "totalKeys": 5,
  "activeKeyIndex": 1,
  "keys": [
    {
      "index": 1,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...4d31",
      "status": "ACTIVE",
      "failCount": 0,
      "successCount": 12,
      "lastUsedAt": "2026-11-11T20:42:15.000Z"
    },
    {
      "index": 2,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...1ee1",
      "status": "STANDBY",
      "failCount": 0,
      "successCount": 0
    },
    {
      "index": 3,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...d080",
      "status": "STANDBY",
      "failCount": 0,
      "successCount": 0
    },
    {
      "index": 4,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...d06d",
      "status": "STANDBY",
      "failCount": 0,
      "successCount": 0
    },
    {
      "index": 5,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...60b4",
      "status": "STANDBY",
      "failCount": 0,
      "successCount": 0
    }
  ]
}
```

---

## 6. Key Pool Reset

**`POST /api/v1/ai/key-reset`**

Flushes all accumulated errors, fail counters, and active cooldown timers across all 5 key slots, restoring Slot #1 to `ACTIVE` and subsequent slots to `STANDBY`.

### Request Body
None required.

### Response `200 OK`

```json
{
  "success": true,
  "message": "Key pool has been fully reset",
  "totalKeys": 5,
  "activeKeyIndex": 1,
  "keys": [ /* 5 cleared slot objects */ ]
}
```

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/ai/key-reset
```

---

## 7. Habitat Stress-Test Simulator

**`POST /api/v1/simulator/stress-test`**

Calculates ignition and flame propagation multipliers using empirical NASA exploration atmosphere formulas, enriched by AI-generated aerospace protocol countermeasures.

### Request Body

```json
{
  "habitat": "lunar",
  "oxygen_concentration": 30.0,
  "pressure_psi": 10.2,
  "material_type": "PMMA Acrylic"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `habitat` | `string` | ✅ | `"lunar"`, `"mars"`, or `"iss"` |
| `oxygen_concentration` | `number` | ✅ | Cabin oxygen % (0.0 to 100.0) |
| `pressure_psi` | `number` | ✅ | Cabin pressure in psi (> 0) |
| `material_type` | `string` | ✅ | Material name (e.g. `"PMMA Acrylic"`, `"Nomex"`, `"Kapton"`) |

### Success Response `200 OK`

```json
{
  "success": true,
  "simulation_result": {
    "ignition_speed_multiplier": 4.25,
    "safety_status": "Critical",
    "recommendation": "CRITICAL COMBUSTION HAZARD in Lunar Base: Flame spread multiplier is elevated to 4.25x under 30% O2 at 10.2 psi. Material 'PMMA Acrylic' exceeds NASA-STD-6001 Test 1 safety threshold for this atmosphere. Immediate Protocol: (1) Replace with Kapton, Nomex, or PTFE fluoropolymers. (2) Interlock cabin ventilation to automatically shut down within 5 seconds of smoke trigger to deprive oxidizer transport (NASA BASS protocol). (3) Arm rapid nitrogen dilution or fine water mist suppression system."
  }
}
```

---

## 8. Planetary & Habitat 3D Hazard Evaluation

**`POST /api/v1/simulator/hazard-evaluation`**  
*(Alias: `POST /api/v1/simulator/physics-engine`)*

Core planetary physics evaluation service designed specifically to drive real-time **3D simulation canvases (Three.js, WebGL, Babylon.js)**. Computes flame velocity, particle density, 3D geometry mesh type, risk color hex, flashing alert HUD states, and concise scientific explanations.

### Request Body

```json
{
  "target_planet_or_habitat": "lunar_base",
  "oxygen_concentration": 32.0,
  "pressure_psi": 9.5,
  "material_type": "PMMA Acrylic"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target_planet_or_habitat` | `string` | ✅ | `"lunar_base"` (or `"lunar"`), `"mars_rover"` (or `"mars"`), `"iss"`, `"earth"` |
| `oxygen_concentration` | `number` | ✅ | Cabin oxygen percentage (0.0 - 100.0%) |
| `pressure_psi` | `number` | ✅ | Cabin pressure in psi (positive, e.g. 8.2 - 14.7 psi) |
| `material_type` | `string` | ✅ | Material identifier (e.g. `"PMMA Acrylic"`, `"Nomex Aramid"`, `"Kapton"`, `"Cotton"`) |

### Success Response `200 OK`

```json
{
  "success": true,
  "simulation_metadata": {
    "target_planet_or_habitat": "lunar_base",
    "gravity_g": 0.166,
    "hazard_score_percentage": 99.9,
    "safety_status": "CRITICAL_HAZARD"
  },
  "visual_3d_trigger_params": {
    "render_flame": true,
    "flame_geometry_type": "spherical_blue_core",
    "flame_spread_velocity_mm_s": 19.7,
    "risk_color_hex": "#FF3333",
    "particle_explosion_density": 1623,
    "warning_flash_ui": true
  },
  "scientific_explanation": "In a lunar habitat environment with 32% oxygen and 0.166g gravity, PMMA Acrylic exhibits rapid spherical flame propagation without buoyant plume detachment, drastically increasing localized thermal buildup."
}
```

---

### Planetary Physics Reference (NASA PSI)

| Habitat / Planet | Key | Gravity ($g$) | Atmosphere Baseline | Dominant Combustion Phenomenon |
|------------------|-----|---------------|---------------------|--------------------------------|
| **Lunar Base** | `lunar_base` | `0.166g` | 30-34% $\text{O}_2$, 8.2-10.2 psi | Absence of buoyant plume detachment; expanding spherical blue-core flames; ~40% faster surface spread. |
| **Mars Habitat / Rover** | `mars_rover` | `0.38g` | Moderate pressure, high $\text{CO}_2$ | Partial buoyancy; hemispherical reaction zones; intense localized flash hazards at $\text{O}_2$ leak points. |
| **ISS Microgravity** | `iss` | `0.0g` | 21% $\text{O}_2$, 14.7 psi | Zero natural buoyancy; combustion relies on forced ventilation airflow (0.05-0.2 m/s), creating elongated cylindrical boundary flames. |
| **Earth Ground Facility** | `earth` | `1.0g` | 20.95% $\text{O}_2$, 14.7 psi | Upward buoyant plume convection; standard terrestrial teardrop flame geometry. |

---

### Flame Geometry Types Reference

The `flame_geometry_type` field dictates which 3D mesh, shader, or particle distribution to render in the simulator:

| Geometry Type String | Physical Description | Visual 3D Representation |
|----------------------|----------------------|--------------------------|
| `"spherical_blue_core"` | Microgravity & Lunar ($0g$ to $0.166g$) spherical flame with intense soot-free chemiluminescent blue inner core and outer amber halo. | 3D concentric glowing spheres; inner cyan/blue mesh + outer pulsing translucent sphere. |
| `"hemispherical_spread"` | Low-gravity dome flame expanding uniformly on a flat solid fuel bed ($0.38g$). | Flattened dome geometry expanding radially across the X-Z plane. |
| `"ventilation_driven_trail"` | Forced airflow-driven flame aboard ISS ($0g$). Flame extends along the ventilation vector. | Elongated horizontal teardrop/cylinder stretched along the flow axis. |
| `"buoyant_plume"` | Terrestrial 1g gravity-driven combustion with upward thermal buoyancy. | Vertical rising flickering teardrop mesh with buoyant tip displacement. |
| `"smoldering_surface"` | Flameless surface combustion with glowing embers (e.g. Cotton Cellulose at low oxygen). | Flat glowing embers disc on the material plate without open flame volume. |
| `"micro_droplet_cool_flame"` | NASA FLEX low-temperature combustion phenomenon. | Dim blue micro-spherical halo with minimal radiative heat signature. |
| `"none"` | Non-flammable condition (materials like PTFE/Titanium under nominal atmosphere). | No flame mesh rendered; only faint thermal haze or dust particles. |

---

### Material Flammability Indices (NASA-STD-6001B)

Empirical combustibility factors used to compute `flame_spread_velocity_mm_s` and `hazard_score_percentage`:

| Material Category | Examples / Aliases | Flammability Factor | Risk Profile |
|-------------------|-------------------|---------------------|--------------|
| **PMMA / Acrylic** | `PMMA Acrylic`, `Plexiglass`, `Lucite` | `1.85` | Extremely hazardous; vigorous burning in $\text{O}_2 > 25\%$. |
| **Delrin / POM** | `Polyoxymethylene`, `Acetal` | `1.75` | Severe flame spread; molten dripping hazard. |
| **Cellulose / Cotton** | `Cotton Fabric`, `Paper`, `Cellulose` | `1.50` | Readily ignitable; severe deep-seated smoldering risk. |
| **Polyethylene / Polyolefins** | `PE`, `Polypropylene` | `1.45` | Rapid melt spread; high smoke yield. |
| **Silicone Elastomers** | `Silicone Rubber`, `Sealant` | `1.30` | Burns vigorously in enriched oxygen atmospheres. |
| **Polycarbonate** | `Lexan`, `PC Sheet` | `0.90` | Self-extinguishing at 21% $\text{O}_2$; flammable $> 26\%$. |
| **Nomex / Aramid** | `Nomex Aramid`, `Kevlar` | `0.38` | Aerospace flame-retardant suit standard; char-forming. |
| **Kapton / Polyimide** | `Kapton Film`, `Thermal MLI` | `0.30` | High thermal stability; spacecraft thermal blanket standard. |
| **PTFE / Teflon** | `Teflon`, `Fluoropolymer` | `0.18` | Exceptional oxygen index ($\text{LOI} > 95\%$); space safe. |
| **Aerospace Metals** | `Titanium`, `Aluminum`, `Stainless Steel`| `0.05` | Structural non-combustible baseline. |

---

### Frontend 3D Canvas Integration Guide

Frontend developers can consume `POST /api/v1/simulator/hazard-evaluation` in Three.js or Babylon.js:

```typescript
// Sample Three.js integration snippet
async function onSimulationTrigger(requestPayload) {
  const response = await fetch('http://localhost:4000/api/v1/simulator/hazard-evaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  const { simulation_metadata, visual_3d_trigger_params } = await response.json();

  // 1. Toggle flame mesh visibility & color
  flameMesh.visible = visual_3d_trigger_params.render_flame;
  flameMaterial.color.set(visual_3d_trigger_params.risk_color_hex);
  pointLight.color.set(visual_3d_trigger_params.risk_color_hex);

  // 2. Scale flame by spread velocity
  const velocityScale = visual_3d_trigger_params.flame_spread_velocity_mm_s * 0.1;
  flameMesh.scale.set(velocityScale, velocityScale, velocityScale);

  // 3. Update particle emitter density
  particleEmitter.count = visual_3d_trigger_params.particle_explosion_density;

  // 4. Trigger HUD flashing alert
  if (visual_3d_trigger_params.warning_flash_ui) {
    cockpitHUD.triggerRedFlashAlert();
  }
}
```

---

## 9. NASA PSI Datasets Catalog

**`GET /api/v1/datasets`**

Provides the complete index of Physical Science Informatics (PSI) research datasets powering the Vulcan-X combustion engine:

### Response `200 OK`

```json
{
  "success": true,
  "count": 8,
  "datasets": [
    {
      "id": "PSI-BASS-01",
      "investigation": "BASS (Burning and Suppression of Solids)",
      "title": "Solid Fuel Extinction and Flame Spread in Forced Microgravity Flows",
      "environment": ["iss", "lunar_base", "mars_rover"],
      "gravity_condition": "Microgravity (0g)",
      "citation": "Ferkul, P. V., & T'ien, J. S. (NASA PSI BASS)"
    },
    {
      "id": "PSI-SAFFIRE-01",
      "investigation": "Saffire (Spacecraft Fire Safety Experiment)",
      "title": "Large-Scale Spacecraft Fire Growth and Suppression in Microgravity",
      "environment": ["iss"],
      "gravity_condition": "Microgravity (0g)",
      "citation": "Urban, D., et al. (NASA/TM-20210018442)"
    },
    {
      "id": "PSI-ACME-01",
      "investigation": "ACME (Advanced Combustion via Microgravity Experiments)",
      "title": "Laminar Gaseous Flame Spread in G-Jitter and Microgravity Environments",
      "environment": ["iss", "mars_rover"],
      "gravity_condition": "Microgravity (0g) & Mars (0.38g)",
      "citation": "Sunderland, P. B., et al. (NASA PSI ACME)"
    },
    {
      "id": "PSI-FLEX-01",
      "investigation": "FLEX & FLEX-2 (Flame Extinguishment Experiment)",
      "title": "Droplet Combustion and Low-Temperature Cool Flame Extinction",
      "environment": ["iss"],
      "gravity_condition": "Microgravity (0g)",
      "citation": "Williams, F. A., & Dryer, F. L. (NASA PSI FLEX)"
    },
    {
      "id": "PSI-CFI-01",
      "investigation": "CFI (Cool Flames Investigation)",
      "title": "Low-Temperature Combustion Phenomena in Droplet and Gaseous Mixtures",
      "environment": ["iss"],
      "gravity_condition": "Microgravity (0g)",
      "citation": "Dryer, F. L., et al. (NASA PSI CFI)"
    },
    {
      "id": "PSI-STD-6001",
      "investigation": "NASA-STD-6001B Flammability Assessment Standard",
      "title": "Flammability, Odor, Offgassing, and Compatibility Requirements for Materials in Spacecraft",
      "environment": ["iss", "lunar_base", "mars_rover", "earth"],
      "gravity_condition": "All Gravitational Regimes",
      "citation": "NASA Technical Standard NASA-STD-6001B"
    },
    {
      "id": "PSI-EARTH-01",
      "investigation": "Earth Dual-Use: Space-Grade Smoke & Fire Suppression Telemetry",
      "title": "Terrestrial Spinoff of Microgravity Flame Diagnostics for Firefighters",
      "environment": ["earth"],
      "gravity_condition": "Earth Normal Gravity (1g)",
      "citation": "NASA Spinoff Technology Transfer Program"
    },
    {
      "id": "PSI-MARS-01",
      "investigation": "Mars Surface Habitat Fire Safety Architecture",
      "title": "Low-Pressure Carbon Dioxide and Enriched Oxygen Combustion in 0.38g",
      "environment": ["mars_rover"],
      "gravity_condition": "Mars Gravity (0.38g)",
      "citation": "NASA Exploration Systems Development Directorate"
    }
  ]
}
```

---

## Error Responses

The backend enforces uniform error schemas with clear status codes:

### Validation Error `400 Bad Request`

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Question cannot be empty",
    "Invalid enum value. Expected 'lunar_base' | 'mars_rover' | 'iss' | 'earth'"
  ]
}
```

### Missing or Malformed JSON `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid or missing JSON body in request"
}
```

### Internal Server Error `500`

```json
{
  "success": false,
  "error": "An internal error occurred during planetary hazard evaluation",
  "message": "Detailed error message"
}
```

---

## Environment Variables

Configure your `.env` file in `vulcan-x/ai-model/.env`:

```env
# Server
PORT=4000
NODE_ENV=development

# OpenRouter Free Reasoning Model
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# 5 OpenRouter API Keys (Failover Rotation Pool)
OPENROUTER_API_KEY_1=sk-or-v1-your-key-1
OPENROUTER_API_KEY_2=sk-or-v1-your-key-2
OPENROUTER_API_KEY_3=sk-or-v1-your-key-3
OPENROUTER_API_KEY_4=sk-or-v1-your-key-4
OPENROUTER_API_KEY_5=sk-or-v1-your-key-5

# Key Cooldown (ms) - Time to hold a rate-limited key before retry
KEY_COOLDOWN_MS=60000
```

---

## Quick Start

```bash
# 1. Navigate to AI Model directory
cd vulcan-x/ai-model

# 2. Install dependencies via Bun
bun install

# 3. Start development server with auto-reload
bun run dev

# 4. Open the interactive 3D test bench in your browser
# URL: http://localhost:4000/test

# 5. Run test suite
bun test
```

---

> Built for the **2026 NASA Space Apps Challenge** — *Flame in Freefall: AI-Powered Fire Safety Insights*
