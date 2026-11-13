import type { RagChunk } from '../types';

/**
 * Source-bound ingestion snapshot enriched with metadata, summaries, and key findings.
 * Each text_content value is an excerpt from the URL recorded beside it; do not add derived facts here.
 * Re-run the ingestion job when NASA updates a source, preserving the source URL and retrieval timestamp.
 */
export const OFFICIAL_NASA_CORPUS: RagChunk[] = [
  {
    id: 'psi-combustion-bass',
    text_content: 'The Burning and Suppression of Solids (BASS) investigation examines the burning and extinction characteristics of a wide variety of fuel samples in microgravity.',
    source_url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    citation_title: 'NASA Glenn Combustion Science — BASS',
    category: 'psi_research',
    keywords: ['BASS', 'burning', 'suppression', 'solids', 'extinction', 'microgravity', 'flame spread', 'fuel samples'],
    environments: ['iss', 'lunar_base', 'earth'],
    summary: 'Investigates microgravity combustion, burning rates, and extinction dynamics of diverse solid fuel samples on the ISS.',
    key_findings: [
      'Microgravity alters flame spread geometry and heat loss mechanisms compared to 1g terrestrial flames.',
      'Extinction limits in low-flow microgravity environments differ significantly from standard gravitational flammability tests.',
      'Helps refine spacecraft material selection guidelines and extinguishing strategies.'
    ],
    related_topics: ['Microgravity Combustion', 'Solid Material Flammability', 'Fire Extinction Limits', 'Glenn Research Center'],
  },
  {
    id: 'psi-combustion-acme',
    text_content: 'ACME is focused on advanced combustion technology via fundamental microgravity research. The primary goal is to improve efficiency and reduce pollutant emission in practical terrestrial combustion.',
    source_url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    citation_title: 'NASA Glenn Combustion Science — ACME',
    category: 'psi_research',
    keywords: ['ACME', 'microgravity', 'combustion', 'pollutant', 'efficiency', 'soot', 'flame stability'],
    environments: ['iss', 'earth'],
    summary: 'Focuses on fundamental gaseous combustion experiments to minimize pollutant/soot emission and elevate fuel efficiency.',
    key_findings: [
      'Suppression of buoyancy enables spherical flame models and pristine observation of chemical reaction kinetics.',
      'Soot formation mechanisms studied in microgravity reveal optimal oxidizer-to-fuel ratios.',
      'Yields crucial data applicable to terrestrial clean energy and spacecraft atmosphere safety.'
    ],
    related_topics: ['Gaseous Flames', 'Soot Emission Reduction', 'Buoyancy Removal', 'Combustion Efficiency'],
  },
  {
    id: 'psi-combustion-flex',
    text_content: 'The Flame Extinguishment Experiment (FLEX) experiment was designed to assess and quantify the effectiveness of inert-gas suppressants in microgravity and obtain the most conservative estimate of the limiting oxygen index for steady combustion.',
    source_url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    citation_title: 'NASA Glenn Combustion Science — FLEX',
    category: 'psi_research',
    keywords: ['FLEX', 'inert gas', 'suppression', 'oxygen', 'microgravity', 'extinguishment', 'limiting oxygen index', 'LOI', 'nitrogen', 'CO2'],
    environments: ['iss', 'lunar_base', 'earth'],
    summary: 'Quantifies limiting oxygen index (LOI) and tests inert-gas fire suppression effectiveness in microgravity environments.',
    key_findings: [
      'Determines the lowest oxygen concentration capable of sustaining steady droplet and material combustion.',
      'Evaluates suppressants like nitrogen, CO2, and gaseous halon replacements without gravitational buoyancy.',
      'Provides empirical benchmarks for spacecraft fire extinguishing agent volume calculations.'
    ],
    related_topics: ['Inert Gas Suppression', 'Limiting Oxygen Index', 'Droplet Combustion', 'Extinguishing Systems'],
  },
  {
    id: 'guide-reduced-gravity',
    text_content: 'Combustion occurs when fuel and oxygen react to produce carbon dioxide, water and heat. In the absence of gravity, buoyancy can be suppressed, and the analyses can be reduced to much simpler one-dimensional systems.',
    source_url: 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/',
    citation_title: 'A Researcher’s Guide to: Combustion Science',
    category: 'scientific_guide',
    keywords: ['combustion', 'oxygen', 'buoyancy', 'microgravity', 'flame', 'diffusion', 'heat transfer', 'quiescent'],
    environments: ['iss', 'lunar_base', 'mars_rover', 'earth'],
    summary: 'A comprehensive foundational overview of combustion physics, buoyancy suppression, and diffusion mechanics in reduced gravity.',
    key_findings: [
      'In 0g/microgravity, natural convection is absent; oxygen reaches the flame purely via molecular diffusion.',
      'Flames take on a spherical, dim blue shape and produce lower temperatures than upward-flickering 1g flames.',
      'Quiescent low-speed airflow can paradoxically supply fresh oxygen and prolong smoldering combustion.'
    ],
    related_topics: ['Buoyancy Mechanics', 'Spherical Flames', 'Molecular Diffusion', 'Microgravity Physics'],
  },
  {
    id: 'guide-iss-fire-safety',
    text_content: 'The Combustion Science Discipline conducts idealized experiments on the International Space Station where the removal of gravity enables researchers to study details of the combustion processes that cannot be readily studied on the ground. The Space Station environment also provides an important test-bed for studying spacecraft fire risk.',
    source_url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    citation_title: 'Combustion Science — NASA Glenn',
    category: 'scientific_guide',
    keywords: ['ISS', 'microgravity', 'fire risk', 'combustion', 'spacecraft fire safety', 'detection', 'habitat safety'],
    environments: ['iss', 'lunar_base', 'mars_rover'],
    summary: 'Examines the International Space Station as an operational test-bed for spacecraft fire risk, containment, and sensor validation.',
    key_findings: [
      'Spacecraft fire risk management mandates tight controls over ventilation patterns and combustible inventories.',
      'Detectors must be engineered specifically for absence of convective smoke plumes.',
      'Experimental results directly govern design protocols for lunar and Martian pressurized habitats.'
    ],
    related_topics: ['Spacecraft Fire Risk', 'ISS Test Bed', 'Ventilation Effects', 'NASA Glenn Discipline'],
  },
  {
    id: 'incident-apollo-1',
    text_content: 'Because of the pure oxygen atmosphere, the fire spread quickly, causing a rapid rise in temperature and pressure that led to the rupture of the Command Module pressure vessel. This rupture generated toxic chemicals that caused the deaths of the astronauts.',
    source_url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1',
    citation_title: 'Apollo 1 AS-204',
    category: 'historical_incident',
    keywords: ['Apollo 1', 'pure oxygen', 'pressure', 'fire spread', 'escape', 'toxic smoke', 'capsule rupture', 'AS-204'],
    environments: ['iss', 'lunar_base', 'mars_rover'],
    summary: 'Analysis of the catastrophic 1967 Apollo 1 pad fire caused by a high-pressure 100% oxygen atmosphere and electrical arcing.',
    key_findings: [
      'Pure oxygen at elevated pressures turns normally fire-resistant materials highly flammable and dramatically accelerates flame propagation.',
      'Pressure vessel rupture resulted from rapid gas heating and subsequent toxic gas release.',
      'Internal hatch design prevented the crew from executing an emergency escape in time.'
    ],
    related_topics: ['Oxygen Enriched Atmospheres', 'High-Pressure Fire Hazards', 'Emergency Egress', 'Apollo 1 Investigation'],
    emergency_playbook: [
      'Treat oxygen-enriched fire conditions as an immediate escalation.',
      'Keep an operable rapid-egress route and verify it during emergency drills.',
      'Minimize and control combustible materials.'
    ],
  },
  {
    id: 'incident-apollo-1-lessons',
    text_content: 'NASA replaced the three-piece hatch with a unified hatch that could be opened from the inside or outside within three seconds. Additionally, NASA severely restricted and controlled the number of combustible materials in the spacecraft.',
    source_url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1',
    citation_title: 'Apollo 1 AS-204 — Lessons Learned',
    category: 'historical_incident',
    keywords: ['Apollo 1', 'hatch', 'egress', 'combustibles', 'lessons learned', 'quick-release hatch', 'materials screening'],
    environments: ['iss', 'lunar_base', 'mars_rover'],
    summary: 'Critical engineering redesigns following Apollo 1, including rapid-opening hatches and strict combustible material restrictions.',
    key_findings: [
      'Replacement of slow multi-piece hatches with an outward-opening quick-release hatch operable in under 3 seconds.',
      'Atmosphere changed from 100% O2 on the launch pad to a nitrogen-oxygen mix (60/40) during pre-launch operations.',
      'Institution of stringent NASA-STD-6001 flammability testing for all flight items.'
    ],
    related_topics: ['Quick Release Hatch', 'Mixed Gas Atmosphere', 'NASA-STD-6001', 'Materials Redesign'],
    emergency_playbook: [
      'Verify rapid egress before operations.',
      'Control combustible inventory in occupied modules.'
    ],
  },
  {
    id: 'incident-apollo-13',
    text_content: 'The report found that the accident was a combination of mistakes and a deficient design.',
    source_url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13',
    citation_title: 'Apollo 13 CSM-109 LM-7 — Accident Investigation',
    category: 'historical_incident',
    keywords: ['Apollo 13', 'oxygen tank', 'design', 'investigation', 'cryogenic', 'thermostat', 'teflon insulation', 'electrical short'],
    environments: ['iss', 'lunar_base', 'mars_rover'],
    summary: 'Investigation into the electrical thermostatic switch failure and combustion in Cryogenic Oxygen Tank No. 2 aboard Apollo 13.',
    key_findings: [
      'Thermostat switch incompatibility during ground detanking baked and stripped Teflon insulation from internal wiring.',
      'Activating the fan motor sparked combustion within the high-pressure supercritical oxygen tank.',
      'Emphasizes the vital necessity of fail-safe electrical isolation in all oxygen-carrying hardware.'
    ],
    related_topics: ['Cryogenic Oxygen Systems', 'Thermostat Failure', 'Teflon Insulation Flammability', 'Subsystem Isolation'],
    emergency_playbook: [
      'Escalate oxygen-system anomalies for independent engineering review.'
    ],
  },
  {
    id: 'incident-mir-fire',
    text_content: 'The six crew members aboard the Russian space station Mir faced significant danger when a fire ignited in an oxygen generating system. The searing flame, lasting several minutes, not only cut off access to one of the two Soyuz escape vehicles but also filled the station’s modules with smoke.',
    source_url: 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
    citation_title: '25 Years Ago: Fire Aboard Space Station Mir',
    category: 'historical_incident',
    keywords: ['Mir', 'oxygen generator', 'smoke', 'egress', 'fire', 'TGK candle', 'perchlorate', 'respirator', 'evacuation'],
    environments: ['iss', 'lunar_base', 'mars_rover'],
    summary: 'Examines the 1997 Mir space station fire ignited by a solid-fuel oxygen generator (Vika/TGK candle) blocking Soyuz egress.',
    key_findings: [
      'Solid-fuel chemical oxygen canisters can produce a torch-like flame fed by the canister\'s own oxygen generation.',
      'Thick toxic smoke in microgravity does not rise to ceilings; it disperses throughout module cabin atmospheres.',
      'Fire cut off access to one escape vehicle, proving the necessity of redundant egress routes and accessible respirators.'
    ],
    related_topics: ['Chemical Oxygen Generators', 'Microgravity Smoke Dispersion', 'Redundant Escape Craft', 'Crew Respiratory Gear'],
    emergency_playbook: [
      'Don respiratory protection when smoke is present.',
      'Confirm all evacuation paths remain available.',
      'Isolate and assess oxygen-generator hazards.'
    ],
  },
  {
    id: 'spinoff-fire-air-tanks',
    text_content: 'Together with NASA\'s Johnson Space Center, A-T-O Inc.\'s Scott Aviation has developed light-weight firefighter\'s air tanks. New backpack system weighs only 20 pounds for 30 minute air supply, 13 pounds less than conventional firefighting tanks.',
    source_url: 'https://spinoff.nasa.gov/node/9582',
    citation_title: 'Fireman’s Air Tanks — NASA Spinoff',
    category: 'earth_spinoff',
    keywords: ['firefighter', 'air tank', 'respiratory protection', 'spinoff', 'Scott Aviation', 'SCBA', 'lightweight composite'],
    environments: ['earth'],
    summary: 'NASA Johnson Space Center collaboration that revolutionized municipal firefighting with ultra-lightweight composite SCBA breathing apparatus.',
    key_findings: [
      'Reduced air tank backpack weight from 33 lbs to 20 lbs using rocket casing composite pressure vessel technology.',
      'Improved firefighter mobility, endurance, and reduced heat stress during search-and-rescue operations.',
      'Established the standard for modern Self-Contained Breathing Apparatus (SCBA) across global fire departments.'
    ],
    related_topics: ['SCBA Technology', 'Composite Materials', 'Firefighter Safety', 'NASA JSC Technology Transfer'],
  },
  {
    id: 'spinoff-fire-detector',
    text_content: 'Sensor operates by sampling air to determine the presence of combustion particles, but unlike earlier equipment the Brunswick Incipient Fire Detector, originally used in space shuttle orbiters, can discriminate between combustion particles and extraneous matters such as dust.',
    source_url: 'https://spinoff.nasa.gov/node/9407',
    citation_title: 'Fire Detector — NASA Spinoff',
    category: 'earth_spinoff',
    keywords: ['fire detector', 'combustion particles', 'dust', 'early warning', 'spinoff', 'Space Shuttle', 'incipient detection'],
    environments: ['earth'],
    summary: 'Space Shuttle orbiter incipient fire detection technology transferred to sensitive terrestrial facilities to eliminate false alarms.',
    key_findings: [
      'Samples air continuously to detect sub-micron sub-visible particles produced in the earliest pre-flame smoldering phase.',
      'Discriminates combustion particulate signatures from ambient dust and aerosol particulates.',
      'Deployed extensively in telecommunications central offices, cleanrooms, and computer server facilities.'
    ],
    related_topics: ['Incipient Fire Detection', 'Particulate Discrimination', 'Space Shuttle Avionics', 'Early Warning Systems'],
  },
  {
    id: 'spinoff-fire-attire',
    text_content: 'Project FIRES (Firefighter\'s Integrated Response Equipment System) involves applications of advanced materials and design concepts, derived from Apollo to update existing gear which does not adequately protect against many of the hazards encountered in fire suppression activities.',
    source_url: 'https://spinoff.nasa.gov/node/9918',
    citation_title: 'New Technology for the Fire Attire — NASA Spinoff',
    category: 'earth_spinoff',
    keywords: ['Project FIRES', 'firefighter', 'protective gear', 'Apollo', 'spinoff', 'thermal turnout gear', 'Nomex', 'PBI'],
    environments: ['earth'],
    summary: 'Project FIRES integrated space-suit thermal barrier materials and flame-retardant polymers into municipal turnout gear.',
    key_findings: [
      'Adapted space-suit thermal insulation and flame-retardant fabrics (Nomex, Kevlar, PBI) into unified protective turnout coats.',
      'Enhanced thermal barrier resistance against flashover conditions while allowing breathability to dissipate body heat.',
      'Redesigned firefighter helmets, gloves, and boots using space-grade ergonomic and impact-resistant polymer matrices.'
    ],
    related_topics: ['Thermal Protective Attire', 'Nomex & Kevlar Fabrics', 'Project FIRES', 'Space Suit Materials'],
  },
];
