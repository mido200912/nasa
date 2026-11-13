---
name: nasa-link-navigator
description: Deeply navigates, inspects, and extracts structured scientific knowledge and findings from official NASA combustion science and fire safety URLs.
---

# NASA Link Navigator Skill

Use this skill whenever the AI model or user needs to:
1. Access, read, and extract facts directly from official NASA source links referenced in `official_nasa_corpus.ts` or `nasa_link_intelligence.json`.
2. Find granular data points, experiments (BASS, ACME, FLEX), historical incident investigations (Apollo 1, Apollo 13, Mir 1997), and Earth spinoff technologies (Scott Aviation SCBA, Brunswick Incipient Detectors, Project FIRES turnout attire).
3. Connect live web or cached NASA insights into the RAG search pipeline.

---

## Direct Data Access Pathways

The knowledge extracted from all official NASA URLs is stored in two synchronized locations in the project:
1. **Rich JSON Database**: [nasa_link_intelligence.json](file:///c:/Users/Elmodather/Downloads/nasa/vulcan-x/Ai%20Model/src/data/nasa_link_intelligence.json)
2. **Corpus Chunks**: [official_nasa_corpus.ts](file:///c:/Users/Elmodather/Downloads/nasa/vulcan-x/Ai%20Model/src/data/official_nasa_corpus.ts)
3. **API Endpoints**:
   - `GET http://localhost:4000/api/v1/ai/links` (All links & intelligence)
   - `GET http://localhost:4000/api/v1/ai/links?q=:search_term` (Fuzzy keyword search)

---

## Indexed NASA URLs & Key Knowledge Mapping

### 1. NASA Glenn Combustion Science
* **URL:** `https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/`
* **Experiments:**
  * **BASS (Burning and Suppression of Solids):** Microgravity solid fuel burning; proves low ventilation (0.05 - 0.2 m/s) delivers steady oxidizer and sustains smoldering.
  * **ACME (Advanced Combustion via Microgravity Experiments):** Gaseous laminar diffusion flames; zero buoyancy enables spherical flames and pristine soot kinetics.
  * **FLEX (Flame Extinguishment Experiment):** Discovered low-temperature "cool flame" phenomenon (~600-800 K) with liquid fuel droplets and quantified Limiting Oxygen Index (LOI) for inert suppressants (N2, CO2).
* **Key physics:** In $0g$, buoyancy is eliminated; oxygen transport relies purely on molecular diffusion unless forced ventilation is present.

### 2. A Researcher’s Guide to: Combustion Science
* **URL:** `https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/`
* **Payloads:** Combustion Integration Rack (CIR) in Destiny laboratory, Fluids and Combustion Facility (FCF).
* **Containment Protocol:** Dual or triple containment barriers required for all microgravity combustion experiments.

### 3. Apollo 1 (AS-204) Incident Investigation
* **URL:** `https://sma.nasa.gov/sma-disciplines/accllp/apollo-1`
* **Key Lessons:**
  * 100% pure oxygen at 16.7 psia turned nylon, velcro, and polyurethane rapidly combustible.
  * Pressure vessel burst under extreme internal gas expansion.
  * Inward-opening hatch required >90 seconds to unlock.
* **Redesigns:** Unified outward-opening hatch operable in <3 seconds; mixed-gas pad atmosphere (60% N2 / 40% O2); creation of NASA-STD-6001 materials screening.

### 4. Apollo 13 (CSM-109) Investigation
* **URL:** `https://sma.nasa.gov/sma-disciplines/accllp/apollo-13`
* **Key Lessons:**
  * 65V ground heater test damaged 28V thermostat switches, baking Teflon insulation.
  * Destratification fan activation sparked arc inside supercritical Oxygen Tank No. 2.
* **Redesigns:** Elimination of internal cryo fans; isolated 3rd oxygen tank; rigorous voltage compatibility checks.

### 5. Mir Space Station Fire (1997)
* **URL:** `https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/`
* **Key Lessons:**
  * Solid chemical oxygen generator (TGK candle) ignited out of control, throwing torch flames and molten aluminum.
  * Fire blocked egress to one of two Soyuz return vehicles.
  * Zero-g smoke dispersion filled all modules evenly instead of accumulating at the ceiling.
* **Redesigns:** Mandatory dual-egress routes isolated from life-support systems; accessible smoke hoods and respirators.

### 6. Earth Spinoff: Firefighter Air Tanks (Scott Aviation)
* **URL:** `https://spinoff.nasa.gov/node/9582`
* **Innovation:** Adapted filament-wound composite pressure vessels from rocket casings to replace heavy steel tanks, reducing SCBA weight from 33 lbs to 20 lbs (40% reduction).

### 7. Earth Spinoff: Brunswick Incipient Fire Detector
* **URL:** `https://spinoff.nasa.gov/node/9407`
* **Innovation:** Space Shuttle orbiter ionization chamber distinguishing sub-micron smoldering particles from dust and aerosol, eliminating false alarms in cleanrooms and server farms.

### 8. Earth Spinoff: Project FIRES Turnout Attire
* **URL:** `https://spinoff.nasa.gov/node/9918`
* **Innovation:** Integrated Apollo spacesuit thermal barrier fabrics (Nomex, Kevlar, PBI) and breathable moisture barriers into municipal turnout gear, slashing firefighter burn injuries by over 50%.

---

## How the AI Uses This Skill in Queries

When an incoming query mentions or relates to any topic above:
1. Use `GET /api/v1/ai/links?q=<term>` or inspect `nasa_link_intelligence.json`.
2. Extract the exact quantitative findings (`critical_data_point`, `root_causes_identified`, `engineering_redesigns_and_fixes`).
3. Return the verified NASA URL with specific section attribution to guarantee **zero hallucination**.

