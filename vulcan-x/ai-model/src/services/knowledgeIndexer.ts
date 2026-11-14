import type { RagChunk, EnvironmentType } from '../types';

/**
 * Builds a unified, high-recall knowledge corpus combining the baseline 12 chunks
 * with deep, granular factual chunks extracted strictly from the live-scraped NASA Link Intelligence.
 */
export function buildUnifiedKnowledgeCorpus(
  baselineChunks: RagChunk[],
  linkIntelligenceJson: any
): RagChunk[] {
  const deepChunks: RagChunk[] = [];
  const sources = linkIntelligenceJson?.sources || [];

  for (const src of sources) {
    const sourceId = src.source_id;
    const url = src.url;
    const facility = src.facility || 'NASA';

    // 1. Current Experiments (FM2, SoFIE, FLARE)
    if (Array.isArray(src.current_experiments)) {
      for (const exp of src.current_experiments) {
        const acronym = exp.acronym || '';
        const fullName = exp.full_name || '';
        const desc = exp.description || '';
        const op = exp.notable_operations || exp.test_subject || '';
        const obj = exp.objective || exp.significance || '';

        deepChunks.push({
          id: `link-${sourceId}-${acronym.toLowerCase()}`,
          text_content: `${fullName} (${acronym}): ${desc} ${op ? `Operational details: ${op}.` : ''} ${obj ? `Key objective: ${obj}.` : ''}`.trim(),
          source_url: url,
          citation_title: `${src.title} — ${acronym} (${fullName})`,
          category: src.category,
          keywords: [
            acronym,
            fullName.toLowerCase(),
            'microgravity',
            'flammability',
            'experiment',
            'nasa',
            ...(acronym === 'FM2' ? ['lunar', 'moon', '1/6g', 'centrifuge', 'sibal', 'fabric', 'قمر', 'قمري', 'تجارب'] : []),
            ...(acronym === 'SoFIE' ? ['solid fuel', 'ignition', 'extinction', 'nasa-std-6001', 'cristoforetti', 'unity', 'اشتعال', 'اخماد'] : []),
            ...(acronym === 'FLARE' ? ['flammability limits', 'jaxa', 'esa', 'dlr', 'cnes', 'reduced-g', 'حدود الاشتعال'] : []),
          ],
          environments: (acronym === 'FM2' ? ['lunar_base', 'earth'] : ['iss', 'lunar_base', 'earth']) as EnvironmentType[],
          summary: `${fullName} (${acronym}) microgravity research payload: ${desc}`,
          key_findings: [
            desc,
            ...(op ? [op] : []),
            ...(obj ? [obj] : []),
          ],
          related_topics: ['Microgravity Combustion', 'Spacecraft Fire Safety', 'Physical Sciences Program', facility],
        });
      }
    }

    // 2. Archived Experiments (ACME, BASS, DAFT, FLEX, Saffire, SAME, SLICE, SPICE)
    if (Array.isArray(src.archived_experiments)) {
      for (const exp of src.archived_experiments) {
        const acronym = exp.acronym || '';
        const fullName = exp.full_name || '';
        const desc = exp.description || '';
        const dataPoint = exp.critical_data_point || exp.key_insight || exp.relationship || '';

        // If BASS, ACME, or FLEX already exist in baseline chunks, enrich with specific experimental insights
        deepChunks.push({
          id: `link-${sourceId}-${acronym.toLowerCase()}-deep`,
          text_content: `${fullName} (${acronym}) Investigation: ${desc} ${dataPoint ? `Core insight: ${dataPoint}` : ''}`.trim(),
          source_url: url,
          citation_title: `${src.title} — ${acronym} Investigation`,
          category: src.category,
          keywords: [
            acronym,
            fullName.toLowerCase(),
            'combustion',
            'microgravity',
            ...(acronym === 'SAME' ? ['smoke', 'aerosol', 'detector', 'soot', 'hydrocarbons', 'polymers', 'دخان', 'سخام', 'كاشف'] : []),
            ...(acronym === 'DAFT' ? ['dust', 'aerosol', 'p-trak', 'same', 'غبار', 'مستشعر'] : []),
            ...(acronym === 'Saffire' ? ['saffire', 'spacecraft fire safety', 'large-scale', 'cygnus', 'حرائق الفضاء'] : []),
            ...(acronym === 'SLICE' ? ['slice', 'coflow', 'laminar', 'diffusion flames', 'numerical modeling'] : []),
            ...(acronym === 'SPICE' ? ['spice', 'smoke point', 'jet diffusion', 'lsp', 'sts-94'] : []),
          ],
          environments: ['iss', 'earth'] as EnvironmentType[],
          summary: `${fullName} microgravity combustion investigation: ${desc}`,
          key_findings: [
            desc,
            ...(dataPoint ? [dataPoint] : []),
          ],
          related_topics: ['Combustion Science', 'Microgravity Flame Physics', 'ISS Research'],
        });
      }
    }

    // 3. Facilities on ISS (CIR and MDCA)
    if (Array.isArray(src.facilities_on_iss)) {
      for (const fac of src.facilities_on_iss) {
        const facName = fac.name || '';
        const desc = fac.description || '';
        const chamber = fac.combustion_chamber_volume || '';
        const loc = fac.location || '';
        const launched = fac.launched ? `Launched ${fac.launched} (${fac.launch_vehicle || ''})` : '';

        deepChunks.push({
          id: `link-${sourceId}-${facName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          text_content: `${facName}: ${desc} ${chamber ? `Specifications: ${chamber}.` : ''} ${loc ? `Location: ${loc}.` : ''} ${launched}.`.trim(),
          source_url: url,
          citation_title: `${src.title} — ${facName}`,
          category: src.category,
          keywords: ['cir', 'mdca', 'fcf', 'facility', 'combustion integrated rack', 'destiny module', '100-liter', 'sts-126', 'مختبر', 'غرفه الاحتراق'],
          environments: ['iss'] as EnvironmentType[],
          summary: `${facName} space flight research facility: ${desc}`,
          key_findings: [
            desc,
            ...(chamber ? [chamber] : []),
            ...(loc ? [loc] : []),
          ],
          related_topics: ['ISS Facilities', 'Combustion Integrated Rack', 'Destiny Laboratory'],
        });
      }
    }

    // 4. Historical Incident: Apollo 1 (AS-204)
    if (sourceId === 'nasa-sma-apollo-1') {
      deepChunks.push({
        id: 'link-apollo1-hatch-investigation',
        text_content: 'Apollo 1 (AS-204) Investigation: On Jan 27, 1967, during a plugs-out test with 100% pure oxygen at 16.7 psia, an electrical arc near the environmental control system ignited flammable materials. The three-piece inward hatch took over 90 seconds to open under ideal conditions and was impossible to open against internal pressure. U.S. Air Force pathologists concluded the crew perished from asphyxia due to carbon monoxide and toxic gases; burns were likely survivable. The Apollo 204 Review Board released a 3,000-page report establishing that Block II spacecraft must use a unified outward hatch opening in under 3 seconds.',
        source_url: url,
        citation_title: 'Apollo 1 (AS-204) Accident Investigation & Block II Redesign',
        category: 'historical_incident',
        keywords: ['apollo 1', 'as-204', 'hatch', '90 seconds', 'unified hatch', '3 seconds', 'pure oxygen', '16.7 psia', 'asphyxia', 'carbon monoxide', 'grissom', 'white', 'chaffee', 'block ii', 'ابولو 1', 'حادث', 'اكسجين', 'بوابه'],
        environments: ['iss', 'lunar_base', 'mars_rover'] as EnvironmentType[],
        summary: 'Apollo 1 flash fire analysis: 100% oxygen at 16.7 psia, inward hatch trapping crew, and resulting unified 3-second quick-opening hatch redesign.',
        key_findings: [
          'Inward three-piece hatch took 90 seconds in ideal conditions, impossible to open under positive pressure.',
          'Unified outward hatch opens from inside or outside within 3 seconds with single latch.',
          'Shifted from pure oxygen at launch to 60/40 nitrogen-oxygen mix.',
          'Classified no crewed test as non-hazardous, ensuring emergency safety personnel are always present.'
        ],
        emergency_playbook: [
          'Unified rapid-egress hatch opening in under 3 seconds is mandatory.',
          'Never permit 100% pure oxygen atmospheres at ambient or hyperbaric pressures during ground tests.',
          'Assign full safety oversight and rescue personnel to all crewed tests regardless of fuel status.'
        ],
        related_topics: ['Apollo 1 Fire', 'Spacecraft Egress Design', 'Oxygen Atmosphere Hazards'],
      });
    }

    // 5. Historical Incident: Apollo 13
    if (sourceId === 'nasa-sma-apollo-13') {
      deepChunks.push({
        id: 'link-apollo13-oxygen-tank-rootcause',
        text_content: 'Apollo 13 Oxygen Tank No. 2 Failure: In 1965, permissible voltage to oxygen tank heaters was raised from 28V to 65V DC, but thermostatic switches were not updated. During launch pad detanking, heaters reached ~1,000°F over eight hours, severely degrading Teflon wire insulation. When stirring fans were activated at MET 55:54:53, electrical arcing ignited exposed Teflon in supercritical cryogenic oxygen, blowing the tank dome and panel Sector 4. The crew used LM Aquarius as a lifeboat, improvised an adapter for incompatible square vs round LiOH canisters, conserved water to 6 oz/day (1/5 normal), and endured 38°F temperatures.',
        source_url: url,
        citation_title: 'Apollo 13 Oxygen Tank Review Board & Electrical Redesign',
        category: 'historical_incident',
        keywords: ['apollo 13', 'oxygen tank', '28v', '65v', 'thermostat', '1000 degrees', 'teflon', 'stirring fans', 'aquarius', 'lioh', '6 oz water', '38 degrees', 'cortright', 'swigert', 'lovell', 'haise', 'ابولو 13', 'خزان اكسجين', 'انفجار'],
        environments: ['iss', 'lunar_base', 'mars_rover'] as EnvironmentType[],
        summary: 'Apollo 13 accident investigation: 28V to 65V voltage mismatch baked Teflon insulation to 1,000°F, leading to arc in oxygen tank and LM lifeboat rescue.',
        key_findings: [
          'Ground heater voltage increased to 65V DC without updating 28V thermostatic switches, baking Teflon wiring to 1,000°F.',
          'Apollo 14 redesign added a third isolated oxygen tank, upgraded thermostats, removed stirring fans, and sheathed wiring in stainless steel.',
          'Improvised square-to-round adapter resolved LiOH CO2 scrubbing incompatibility between CM and LM.',
          'Apollo 1 wiring insulation redesign prevented short-circuit arcing from cold condensation (38°F) during CM power-up.'
        ],
        emergency_playbook: [
          'Verify complete voltage compatibility between ground test gear and all internal flight components.',
          'Eliminate internal stirring mechanisms in high-pressure cryogenic oxygen vessels.',
          'Sheath all electrical wiring in stainless steel within oxidizer bays.',
          'Ensure inter-module consumables (LiOH canisters, respiratory gear) share standard interchangeable form factors.'
        ],
        related_topics: ['Apollo 13 Explosion', 'Cryogenic Oxygen Systems', 'Lifeboat Protocols'],
      });
    }

    // 6. Historical Incident: Mir Space Station Fire
    if (sourceId === 'nasa-history-mir-fire') {
      deepChunks.push({
        id: 'link-mir-kvant1-fire-investigation',
        text_content: 'Mir Space Station Fire (Feb 24, 1997): Shortly after dinner, cosmonaut Aleksandr Lazutkin activated a solid-fuel oxygen generator (SFOG / TGK / Vika lithium perchlorate candle) in the Kvant-1 module. The canister ignited into a 3-foot torch flame shooting sparks and molten metal, blocking egress to the docked Soyuz escape spacecraft. Valeri Korzun, held by Jerry Linenger, doused the fire with three foam extinguishers. Two years of study identified the root cause as hydrocarbon contamination, most likely latex working glove material accidentally introduced into the canister during manufacturing. ISS now uses electrolytic water splitting (Elektron and OGS) with redundant safety protocols for SFOG backup.',
        source_url: url,
        citation_title: 'Mir Space Station Kvant-1 Fire (SFOG Candle & Latex Glove Contamination)',
        category: 'historical_incident',
        keywords: ['mir', 'kvant-1', 'sfog', 'vika', 'tgk', 'lithium perchlorate', 'candle', '3-foot flame', 'molten metal', 'latex glove', 'korzun', 'linenger', 'lazutkin', 'soyuz egress', 'foam extinguisher', 'elektron', 'ogs', 'محطه مير', 'حريق مير', 'شمعه اكسجين'],
        environments: ['iss', 'lunar_base', 'mars_rover'] as EnvironmentType[],
        summary: 'Mir Kvant-1 module fire: Lithium perchlorate SFOG oxygen candle ignited with 3-foot flame and molten metal due to latex glove hydrocarbon contamination.',
        key_findings: [
          'Solid oxygen canister ignited shooting 3-foot flame and molten metal droplets across Kvant-1 module.',
          'Flame cut off evacuation corridor to docked Soyuz escape vehicle carrying 3 crew members.',
          'Root cause: Hydrocarbon contamination from latex working glove material inadvertently introduced during canister preparation.',
          'ISS adopted dual-system electrolytic water-splitting (3 Russian Elektrons + US OGS) to minimize chemical candle dependency.'
        ],
        emergency_playbook: [
          'Never position chemical oxygen generation candles directly along primary emergency spacecraft escape corridors.',
          'Pre-position orbital-rated foam fire extinguishers directly adjacent to oxygen generation hardware.',
          'Implement ultra-clean manufacturing protocols eliminating all latex and hydrocarbon particulates from chemical oxygen canisters.',
          'Don respiratory hoods immediately upon fire trigger due to omnidirectional smoke dispersion in microgravity.'
        ],
        related_topics: ['Mir Station Fire', 'Chemical Oxygen Generators', 'Microgravity Smoke Dispersion'],
      });
    }

    // 7. Earth Spinoff: Scott Aviation SCBA Air Tanks (Spinoff 9582)
    if (sourceId === 'nasa-spinoff-scott-aviation') {
      deepChunks.push({
        id: 'link-spinoff-scott-scba-4500psi',
        text_content: 'Lightweight Firefighter Air Tanks (SCBA — Spinoff 9582): NASA Johnson Space Center and Scott Aviation developed lightweight firefighter air tanks pressurized at 4,500 psi (twice previous steel tanks). Constructed of an aluminum liner wrapped by resin-impregnated glass fibers, eliminating corrosion and lightening the backpack system to only 20 pounds for a 30-minute air supply (13 pounds less than conventional 33-pound steel tanks). Features a personalized audible low-air warning device that cannot be heard by others, eliminating confusion in smoky environments. Industrial partners included Structural Composites Inc., Boeing, and Martin-Marietta.',
        source_url: url,
        citation_title: "NASA Spinoff 1976 — Lightweight Fireman's SCBA Air Tanks (4,500 psi)",
        category: 'earth_spinoff',
        keywords: ['scott aviation', 'scba', 'air tanks', '4500 psi', '20 pounds', '30 minute', '13 pounds lighter', 'aluminum liner', 'glass fibers', 'personalized alarm', 'johnson space center', 'boeing', 'martin-marietta', 'اسطوانات الهواء', 'تنفس', 'اطفاء'],
        environments: ['earth'] as EnvironmentType[],
        summary: 'NASA JSC and Scott Aviation developed 4,500 psi lightweight composite air tanks, reducing firefighter backpack weight from 33 to 20 pounds.',
        key_findings: [
          'Pressurized at 4,500 psi — double the pressure of conventional steel cylinders.',
          'Aluminum liner wrapped in resin-impregnated glass fiber eliminates corrosion and saves 13 pounds (down to 20 lbs for 30 min air).',
          'Personalized low-air warning alarm prevents confusion in high-noise, low-visibility fire scenes.',
          'Technology transferred to Boeing and Martin-Marietta for aerospace composite pressure vessels.'
        ],
        related_topics: ['NASA Spinoff', 'Firefighter SCBA', 'Composite Pressure Vessels'],
      });
    }

    // 8. Earth Spinoff: Brunswick Incipient Fire Detector (Spinoff 9407)
    if (sourceId === 'nasa-spinoff-brunswick-detector') {
      deepChunks.push({
        id: 'link-spinoff-brunswick-fire-detector',
        text_content: 'Brunswick Incipient Fire Detector (Spinoff 9407): Adapted from the Space Shuttle Orbiter fire detection system, this sensor samples air to detect sub-micron combustion particles before flames or visible smoke appear. Unlike earlier equipment, it discriminates between combustion particles and extraneous matter like dust and humidity, virtually eliminating false alarms. For large-area applications such as underground mines, any number of sensors can be linked to a central processor and display unit to provide an automated fire watch system that instantly warns and pinpoints the exact fire location.',
        source_url: url,
        citation_title: 'NASA Spinoff 1978 — Brunswick Incipient Fire Detector (Shuttle Orbiter)',
        category: 'earth_spinoff',
        keywords: ['brunswick', 'incipient fire detector', 'space shuttle orbiter', 'false alarms', 'mines', 'central processor', 'pinpoint location', 'sub-micron', 'ionization', 'combustion particles', 'كاشف مبكر', 'انذار مبكر', 'مناجم'],
        environments: ['earth'] as EnvironmentType[],
        summary: 'Space Shuttle Orbiter incipient fire detector adapted for Earth: discriminates sub-micron combustion particles from dust, enabling central early warning in mines.',
        key_findings: [
          'Detects fire condition before the appearance of visible flame and smoke.',
          'Discriminates combustion particles from dust and humidity, dramatically suppressing false alarms.',
          'Enables multi-sensor networking to central processor to pinpoint fire coordinates in vast mines and server rooms.'
        ],
        related_topics: ['NASA Spinoff', 'Incipient Fire Detection', 'Shuttle Orbiter Safety'],
      });
    }

    // 9. Earth Spinoff: Project FIRES Turnout Attire (Spinoff 9918)
    if (sourceId === 'nasa-spinoff-project-fires') {
      deepChunks.push({
        id: 'link-spinoff-project-fires-attire',
        text_content: "Project FIRES Turnout Attire (Spinoff 9918): Sponsored jointly by NASA and FEMA's U.S. Fire Administration with technical management by Marshall Space Flight Center. Project FIRES (Firefighter's Integrated Response Equipment System) adapted lightweight, fire-resistant, heat-protective materials derived from Apollo spacesuits (Nomex, Kevlar, PBI polybenzimidazole) to modern turnout gear. Field evaluations across fourteen municipal fire departments formed the empirical basis for new nationwide protective ensemble standards, incorporating 500°F impact-resistant polycarbonate helmet shells and vapor barriers to curb firefighter fatalities and burn injuries.",
        source_url: url,
        citation_title: 'NASA Spinoff 1982 — Project FIRES Firefighter Turnout Attire',
        category: 'earth_spinoff',
        keywords: ['project fires', 'fema', 'usfa', 'marshall space flight center', 'fourteen municipal fire departments', '14 fire departments', 'apollo spacesuit', 'nomex', 'kevlar', 'pbi', '500 degrees', 'polycarbonate helmet', 'ملابس الاطفاء', 'بدله حراريه'],
        environments: ['earth'] as EnvironmentType[],
        summary: 'NASA and FEMA Project FIRES adapted Apollo spacesuit polymers (Nomex, PBI) and tested across 14 municipal fire departments to create modern turnout standards.',
        key_findings: [
          'Applied Apollo spacesuit materials (Nomex, Kevlar, PBI polybenzimidazole) to municipal firefighting turnout ensembles.',
          'Field-tested across 14 municipal fire departments to establish nationwide protective standards.',
          'Polycarbonate helmet shells and face shields engineered to withstand 500°F (260°C) radiant thermal fluxes.',
          'Engineered multi-layer moisture/vapor barriers preventing scalding steam burns.'
        ],
        related_topics: ['NASA Spinoff', 'Project FIRES', 'Firefighter Protective Gear'],
      });
    }
  }

  // Combine baseline chunks + all deep factual chunks
  return [...baselineChunks, ...deepChunks];
}

