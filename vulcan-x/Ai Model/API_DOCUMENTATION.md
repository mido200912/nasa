# 📡 Vulcan-X API Documentation

> **NASA Space Apps Challenge 2026** — *"Flame in Freefall: AI-Powered Fire Safety Insights"*

**Base URL:** `http://localhost:4000`  
**Runtime:** Bun + Hono (TypeScript)  
**AI Provider:** OpenRouter (5-Key Rotation Pool)  
**Model:** `nvidia/nemotron-3.5-lightning:free`

---

## Table of Contents

- [Authentication & Configuration](#authentication--configuration)
- [Endpoints Overview](#endpoints-overview)
- [1. Root Info](#1-root-info)
- [2. Health Check](#2-health-check)
- [3. Test Dashboard](#3-test-dashboard)
- [4. AI Knowledge & RAG Query](#4-ai-knowledge--rag-query)
- [5. Key Pool Status](#5-key-pool-status)
- [6. Key Pool Reset](#6-key-pool-reset)
- [7. Habitat Stress-Test Simulator](#7-habitat-stress-test-simulator)
- [8. Planetary & Habitat 3D Hazard Evaluation](#8-planetary--habitat-3d-hazard-evaluation)
- [9. NASA PSI Datasets Catalog](#9-nasa-psi-datasets-catalog)
- [Error Responses](#error-responses)
- [Environment Variables](#environment-variables)

---

## Authentication & Configuration

This API does **not** require client-side authentication. The OpenRouter API keys are configured server-side via environment variables (`.env` file).

The system manages **5 OpenRouter API keys** with automatic failover. If a key hits a rate limit (429), quota error (402/403), or any error, the system automatically rotates to the next available key.

---

## Endpoints Overview

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Project info & endpoint listing |
| `GET` | `/health` | Backend health check |
| `GET` | `/test` | Interactive HTML test dashboard |
| `POST` | `/api/v1/ai/query` | AI-powered RAG knowledge query |
| `GET` | `/api/v1/ai/key-status` | API key pool diagnostics |
| `POST` | `/api/v1/ai/key-reset` | Reset all key pool statuses |
| `POST` | `/api/v1/simulator/stress-test` | Habitat fire safety simulation |
| `POST` | `/api/v1/simulator/hazard-evaluation` | 3D canvas planetary hazard parameters |
| `GET` | `/api/v1/datasets` | NASA PSI datasets catalog |

---

## 1. Root Info

**`GET /`**

Returns project metadata and available endpoints.

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

Returns backend health status, uptime, and timestamp.

### Response `200 OK`

```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2026-11-11T18:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"healthy"` when server is running |
| `uptime` | `number` | Process uptime in seconds |
| `timestamp` | `string` | ISO 8601 timestamp |

### cURL

```bash
curl http://localhost:4000/health
```

---

## 3. Test Dashboard

**`GET /test`**

Serves the interactive HTML test bench (`test.html`) for visually testing all API endpoints. Also accessible via `GET /demo` (redirects to `/test`).

### Response `200 OK`

Returns `text/html` content with the Vulcan-X interactive dashboard including:
- AI Knowledge & RAG Query form
- Habitat Stress-Test Simulator form
- 5-Key Pool live visualizer with Reset button
- Quick preset buttons for common queries

---

## 4. AI Knowledge & RAG Query

**`POST /api/v1/ai/query`**

Queries the NASA PSI knowledge base using a RAG (Retrieval-Augmented Generation) pipeline. Searches relevant combustion research documents, then sends context-grounded prompt to OpenRouter AI for scientific analysis.

### Request Body

```json
{
  "question": "How does elevated oxygen affect flame spread in lunar habitats?",
  "environment": "lunar_base"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | `string` | ✅ | Research question (min 1 character) |
| `environment` | `string` | ✅ | One of: `"lunar_base"`, `"mars_rover"`, `"iss"`, `"earth"` |

### Success Response `200 OK`

```json
{
  "success": true,
  "answer": "Based on NASA PSI BASS and Saffire investigations, elevated oxygen concentrations (30-34% O2) in lunar habitats significantly accelerate flame spread rates...",
  "sources": [
    "BASS (Burning and Suppression of Solids) (Ferkul, P. V.)",
    "Saffire (Spacecraft Fire Safety Experiment) (Urban, D.)"
  ],
  "risk_level": "High"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` on success |
| `answer` | `string` | AI-generated scientific answer grounded in NASA PSI data |
| `sources` | `string[]` | Array of NASA PSI investigation citations used |
| `risk_level` | `string` | Risk assessment: `"Low"`, `"Medium"`, or `"High"` |

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the cool flame phenomenon in FLEX experiments?", "environment": "iss"}'
```

---

## 5. Key Pool Status

**`GET /api/v1/ai/key-status`**

Returns live diagnostics for the 5-key OpenRouter rotation pool, including each key's status, success/fail counts, and cooldown timers.

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
      "successCount": 5,
      "lastUsedAt": "2026-11-11T18:20:30.000Z",
      "cooldownUntil": null
    },
    {
      "index": 2,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...1ce1",
      "status": "STANDBY",
      "failCount": 0,
      "successCount": 0
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `totalKeys` | `number` | Total key slots (5) |
| `activeKeyIndex` | `number` | Currently active slot index (1-5) |
| `keys` | `KeySlotInfo[]` | Array of key slot info objects |

**KeySlotInfo:**

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Slot number (1-5) |
| `provider` | `string` | Always `"openrouter"` |
| `maskedKey` | `string` | Masked API key or `"NOT_CONFIGURED"` |
| `status` | `string` | `"ACTIVE"`, `"STANDBY"`, `"RATE_LIMITED"`, or `"ERROR"` |
| `failCount` | `number` | Consecutive failure count (resets to 0 on success) |
| `successCount` | `number` | Total successful requests |
| `lastUsedAt` | `string?` | ISO 8601 timestamp of last use |
| `cooldownUntil` | `string?` | ISO 8601 timestamp when cooldown ends |

### cURL

```bash
curl http://localhost:4000/api/v1/ai/key-status
```

---

## 6. Key Pool Reset

**`POST /api/v1/ai/key-reset`**

Resets all key pool statuses: clears fail counts, cooldowns, errors, and restores keys to their initial state (first valid key = ACTIVE, rest = STANDBY).

### Request Body

No body required.

### Response `200 OK`

```json
{
  "success": true,
  "message": "Key pool has been fully reset",
  "totalKeys": 5,
  "activeKeyIndex": 1,
  "keys": [
    {
      "index": 1,
      "provider": "openrouter",
      "maskedKey": "sk-or-v...4d31",
      "status": "ACTIVE",
      "failCount": 0,
      "successCount": 0
    }
  ]
}
```

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/ai/key-reset
```

---

## 7. Habitat Stress-Test Simulator

**`POST /api/v1/simulator/stress-test`**

Simulates fire hazard conditions for a space habitat using physics-based calculations and AI-enriched recommendations. The simulation considers gravity effects, oxygen concentration, cabin pressure, and material flammability.

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
| `habitat` | `string` | ✅ | One of: `"lunar"`, `"mars"`, `"iss"` |
| `oxygen_concentration` | `number` | ✅ | O2 percentage (0-100) |
| `pressure_psi` | `number` | ✅ | Cabin pressure in psi (must be positive) |
| `material_type` | `string` | ✅ | Material name (min 1 character) |

**Recognized Materials:** PMMA/Acrylic, Cotton, Delrin, Polyethylene, Silicone, Polycarbonate, Nomex, Kapton, Teflon/PTFE, Titanium/Metal. Unknown materials default to coefficient 1.0.

### Success Response `200 OK`

```json
{
  "success": true,
  "simulation_result": {
    "ignition_speed_multiplier": 4.25,
    "safety_status": "Critical",
    "recommendation": "CRITICAL COMBUSTION HAZARD in Lunar Base: Flame spread multiplier is elevated to 4.25x under 30% O2 at 10.2 psi. Material 'PMMA Acrylic' exceeds NASA-STD-6001 Test 1 safety threshold..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` on success |
| `simulation_result.ignition_speed_multiplier` | `number` | Flame spread multiplier relative to Earth 1g sea-level (2 decimal places) |
| `simulation_result.safety_status` | `string` | `"Safe"`, `"Warning"`, or `"Critical"` |
| `simulation_result.recommendation` | `string` | AI-enriched safety recommendation with NASA protocols |

### Physics Model

| Factor | Formula |
|--------|---------|
| **Gravity** | Lunar: ×1.25, ISS: ×1.15, Mars: ×1.08 |
| **Oxygen** | `(O2% / 20.95)^1.65` (O2 clamped to 12-60%) |
| **Pressure** | `(14.7 / pressure_psi)^0.22` (clamped to 4-20 psi) |
| **Final** | `gravity × oxygen × pressure × material_coefficient` |

### Safety Classification

| Status | Condition |
|--------|-----------|
| **Critical** | Multiplier ≥ 2.2 OR O2 ≥ 34% OR (material ≥ 1.4 AND O2 ≥ 28%) |
| **Warning** | Multiplier ≥ 1.05 OR O2 > 23.5% OR (material ≥ 1.2 AND multiplier ≥ 0.95) |
| **Safe** | All other conditions |

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/simulator/stress-test \
  -H "Content-Type: application/json" \
  -d '{"habitat": "lunar", "oxygen_concentration": 30.0, "pressure_psi": 10.2, "material_type": "PMMA Acrylic"}'
```

---

## 8. Planetary & Habitat 3D Hazard Evaluation

**`POST /api/v1/simulator/hazard-evaluation`**  
*(Alias: `POST /api/v1/simulator/physics-engine`)*

Evaluates the exact fire hazard based on planetary environment physics (Lunar Base 0.166g, Mars 0.38g, ISS 0g, Earth 1g), oxygen mole fraction, pressure, and material combustibility. Outputs exact 3D canvas trigger parameters (geometry type, spread velocity, particle explosion density, hex color, flashing alert) and an authoritative NASA PSI scientific explanation.

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
| `pressure_psi` | `number` | ✅ | Cabin pressure in psi (positive number, e.g. 8.2 - 14.7 psi) |
| `material_type` | `string` | ✅ | Material name (e.g. `"PMMA Acrylic"`, `"Nomex Aramid"`, `"Kapton"`, `"Cotton"`) |

### Success Response `200 OK`

```json
{
  "success": true,
  "simulation_metadata": {
    "target_planet_or_habitat": "lunar_base",
    "gravity_g": 0.166,
    "hazard_score_percentage": 88.5,
    "safety_status": "CRITICAL_HAZARD"
  },
  "visual_3d_trigger_params": {
    "render_flame": true,
    "flame_geometry_type": "spherical_blue_core",
    "flame_spread_velocity_mm_s": 5.2,
    "risk_color_hex": "#FF3333",
    "particle_explosion_density": 1500,
    "warning_flash_ui": true
  },
  "scientific_explanation": "In a lunar habitat environment with 32% oxygen and 0.166g gravity, PMMA acrylic exhibits rapid spherical flame propagation without buoyant plume detachment, drastically increasing localized thermal buildup."
}
```

### Response Fields Breakdown

#### `simulation_metadata`
| Field | Type | Description |
|-------|------|-------------|
| `target_planet_or_habitat` | `string` | Normalized environment ID (`"lunar_base"`, `"mars_rover"`, `"iss"`, `"earth"`) |
| `gravity_g` | `number` | Gravity constant: Lunar = 0.166, Mars = 0.38, ISS = 0.0, Earth = 1.0 |
| `hazard_score_percentage` | `number` | Composite hazard index from 0.0% to 100.0% |
| `safety_status` | `string` | `"NOMINAL"`, `"ELEVATED_RISK"`, or `"CRITICAL_HAZARD"` |

#### `visual_3d_trigger_params` (Drives 3D Canvas)
| Field | Type | Description |
|-------|------|-------------|
| `render_flame` | `boolean` | `true` if ignition/combustion can initiate and sustain |
| `flame_geometry_type` | `string` | 3D flame mesh/shader geometry: `"spherical_blue_core"`, `"hemispherical_spread"`, `"buoyant_plume"`, `"smoldering_surface"`, `"ventilation_driven_trail"`, `"micro_droplet_cool_flame"`, `"none"` |
| `flame_spread_velocity_mm_s` | `number` | Physical flame front propagation speed across the solid surface in mm/s |
| `risk_color_hex` | `string` | Hex color code for 3D lights and particles: `#10B981` (Safe), `#F59E0B` (Warning), `#FF3333` (Critical) |
| `particle_explosion_density` | `number` | Density of 3D smoke/spark emitter particles (90 to 2000+) |
| `warning_flash_ui` | `boolean` | Flag to trigger red flashing HUD warning indicators in the 3D cockpit |

#### `scientific_explanation`
Peer-reviewed aerospace combustion synthesis connecting NASA PSI investigations (BASS, Saffire, ACME, FLEX) with the exact gravity, oxygen, pressure, and material parameters.

### cURL

```bash
curl -X POST http://localhost:4000/api/v1/simulator/hazard-evaluation \
  -H "Content-Type: application/json" \
  -d '{"target_planet_or_habitat": "lunar_base", "oxygen_concentration": 32.0, "pressure_psi": 9.5, "material_type": "PMMA Acrylic"}'
```

---

## 9. NASA PSI Datasets Catalog

**`GET /api/v1/datasets`**

Returns the full catalog of NASA Physical Science Informatics (PSI) combustion research documents used by the RAG knowledge base.

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
      "citation": "Ferkul, P. V., & T'ien, J. S. ..."
    },
    {
      "id": "PSI-SAFFIRE-01",
      "investigation": "Saffire (Spacecraft Fire Safety Experiment)",
      "title": "Large-Scale Spacecraft Fire Growth and Suppression in Microgravity",
      "environment": ["iss"],
      "gravity_condition": "Microgravity (0g)",
      "citation": "Urban, D., ..."
    }
  ]
}
```

**Available Investigations (8 documents):**

| ID | Investigation | Environment |
|----|--------------|-------------|
| `PSI-BASS-01` | BASS (Burning and Suppression of Solids) | ISS, Lunar, Mars |
| `PSI-SAFFIRE-01` | Saffire (Spacecraft Fire Safety) | ISS |
| `PSI-ACME-01` | ACME (Advanced Combustion via Microgravity) | ISS, Mars |
| `PSI-FLEX-01` | FLEX (Flame Extinguishment) | ISS |
| `PSI-CFI-01` | CFI (Cool Flames Investigation) | ISS |
| `PSI-STD-6001` | NASA-STD-6001 (Material Safety Standard) | All |
| `PSI-EARTH-01` | Earth Dual-Use Applications | Earth |
| `PSI-MARS-01` | Mars Habitat Fire Safety | Mars |

### cURL

```bash
curl http://localhost:4000/api/v1/datasets
```

---

## Error Responses

All endpoints return consistent error responses:

### Validation Error `400`

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

### Invalid/Missing JSON Body `400`

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
  "error": "An internal error occurred while processing the AI query",
  "message": "Detailed error message"
}
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=4000
NODE_ENV=development

# OpenRouter Model
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# 5 OpenRouter API Keys (Rotation Pool)
OPENROUTER_API_KEY_1=sk-or-v1-your-key-1
OPENROUTER_API_KEY_2=sk-or-v1-your-key-2
OPENROUTER_API_KEY_3=sk-or-v1-your-key-3
OPENROUTER_API_KEY_4=sk-or-v1-your-key-4
OPENROUTER_API_KEY_5=sk-or-v1-your-key-5

# Key Cooldown (ms) - Time to wait before retrying a rate-limited key
KEY_COOLDOWN_MS=60000
```

### Key Rotation Behavior

1. All 5 keys share the same OpenRouter model
2. On **429 (rate limit)** or **402/403 (quota)**: Key enters cooldown for `KEY_COOLDOWN_MS` (default: 60s), system rotates to next key
3. On **other errors**: Key enters 15-second quick cooldown, rotates to next key
4. On **success**: Active key's `failCount` resets to 0, other keys restore to `STANDBY`
5. If **all 5 keys fail**: System falls back to deterministic NASA-PSI Scientific Engine (zero-hallucination hardcoded response)

---

## Quick Start

```bash
# Install dependencies
bun install

# Create .env file with your OpenRouter keys
cp .env.example .env

# Start development server
bun run dev

# Open test dashboard
# http://localhost:4000/test

# Run tests
bun test
```

---

> Built for the **2026 NASA Space Apps Challenge** — *Flame in Freefall: AI-Powered Fire Safety Insights*

