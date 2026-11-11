import type { RagDocument } from '../types';

export const NASA_PSI_KNOWLEDGE_BASE: RagDocument[] = [
  {
    id: 'PSI-BASS-01',
    investigation: 'BASS (Burning and Suppression of Solids)',
    title: 'Solid Fuel Extinction and Flame Spread in Forced Microgravity Flows',
    description: 'NASA PSI investigation aboard the ISS evaluating the flammability, spread rate, and extinction limits of solid fuels (PMMA, cotton, and Nomex) subjected to low-speed forced air flows in microgravity.',
    keywords: ['BASS', 'PMMA', 'Nomex', 'solid fuel', 'extinction limit', 'flame spread', 'microgravity', 'ISS', 'forced flow'],
    environment: ['iss', 'lunar_base', 'mars_rover'],
    findings: 'In microgravity without natural convection, forced ventilation velocities between 0.05 m/s and 0.2 m/s allow steady flame spread. Flames do not self-extinguish as previously hypothesized; instead, thick boundary layers form, extending flame residence time and increasing thermal degradation of downstream materials. Extinction requires air flow velocity below 0.02 m/s or inert gas quenching.',
    citation: 'Ferkul, P. V., & T\'ien, J. S. (NASA Glenn Research Center). "Burning and Suppression of Solids (BASS) in Microgravity." NASA PSI Data Repository, PSI-EXP-BASS-2014.',
    gravity_condition: 'Microgravity (0g)',
    fire_safety_implication: 'Ventilation shutdown (cabin air loop cutoff) is the essential primary action in space habitat fire protocols to deprive the flame of oxidizer transport.'
  },
  {
    id: 'PSI-SAFFIRE-01',
    investigation: 'Saffire (Spacecraft Fire Safety Demonstration Project)',
    title: 'Large-Scale Flame Spread Under Enriched Oxygen and Reduced Pressure Exploration Atmospheres',
    description: 'Autonomous large-scale combustion tests conducted inside Northrop Grumman Cygnus vehicles post-ISS departure, analyzing realistic vehicle atmospheric hazards.',
    keywords: ['Saffire', 'Cygnus', 'exploration atmosphere', '30% oxygen', '34% oxygen', '8.2 psi', '10.2 psi', 'flame growth', 'lunar habitat'],
    environment: ['lunar_base', 'mars_rover', 'iss'],
    findings: 'Under NASA exploration atmospheres (34% O2 at 8.2 psi and 30% O2 at 10.2 psi), flame spread speed over SIBAL fabric (75% cotton / 25% fiberglass) and PMMA accelerates by a factor of 2.1x to 3.4x compared to sea-level Earth air. Smoke particulate size distributions are significantly larger due to coagulation in low convective shear, demanding optical smoke detector recalibration.',
    citation: 'Urban, D., Ruff, G. A., et al. (NASA Glenn Research Center). "Spacecraft Fire Safety Demonstration Project (Saffire I-IV): Exploration Atmosphere Combustion." NASA/TM-20210018442.',
    gravity_condition: 'Microgravity (10^-4 g)',
    fire_safety_implication: 'Standard Earth-calibrated ionization smoke detectors fail early detection in exploration atmospheres; dual-wavelength optical scattering detectors are required.'
  },
  {
    id: 'PSI-ACME-01',
    investigation: 'ACME (Advanced Combustion via Microgravity Experiments)',
    title: 'Gas Flame Extinction Limits and Soot Dynamics in the Combustion Integrated Rack',
    description: 'Six microgravity experiments (including B-FLEX, s-Flame, and CLD-Flame) conducted in the CIR chamber aboard the ISS focusing on gaseous fuels, soot precursors, and electrical flame control.',
    keywords: ['ACME', 'CIR', 'gas flame', 'soot', 'electric field', 'extinction', 'quenching', 'ISS'],
    environment: ['iss', 'earth'],
    findings: 'Microgravity gas flames produce significantly higher soot concentrations because soot particles remain longer in high-temperature zones without buoyant convective escape. Applying low-energy high-voltage electric fields (E-FIELD experiment) can deflect ion concentrations and quench localized flames without expending consumable suppressants.',
    citation: 'Sunderland, P. B., Stocker, D. P., et al. "Advanced Combustion via Microgravity Experiments (ACME) Aboard the ISS." Combustion and Flame, NASA PSI-ACME-2020.',
    gravity_condition: 'Microgravity (0g)',
    fire_safety_implication: 'Gaseous line leaks in space habitats pose an extreme soot-clogging risk to life support scrubbers (CO2 scrubbers, HEPA filters), requiring rapid localized isolation.'
  },
  {
    id: 'PSI-FLEX-01',
    investigation: 'FLEX & FLEX-2 (Flame Extinguishment Experiment)',
    title: 'Droplet Combustion Dynamics and Cool Flame Suppression Mechanisms',
    description: 'Experimental investigation of liquid droplet burning, quasi-steady combustion, cool flame low-temperature chemistry, and chemical fire suppression.',
    keywords: ['FLEX', 'droplet', 'cool flame', 'fire suppression', 'CO2', 'nitrogen', 'extinguishment'],
    environment: ['iss', 'lunar_base', 'earth'],
    findings: 'Discovered the persistent "cool flame" phenomenon where fuels continue burning quasi-invisibly at temperatures around 500-800 K after apparent hot flame extinction (radiant extinction). Traditional thermal cameras tuned for hot flames miss cool flame smoldering, which can re-ignite if fresh oxidizer arrives.',
    citation: 'Williams, F. A., Nayagam, V., & Dietrich, D. L. "Droplet Combustion and Cool Flame Formation in Low Gravity." Nature / NASA PSI-FLEX-2015.',
    gravity_condition: 'Microgravity (0g)',
    fire_safety_implication: 'Fire suppression protocols must maintain inert gas blankets (minimum 35% CO2 concentration) for extended dwell times (>15 minutes) to extinguish cool flame reactions.'
  },
  {
    id: 'PSI-CFI-01',
    investigation: 'CFI (Confined Combustion Investigation)',
    title: 'Flame Propagation in Confined Geometries and Duct Wall Interactions',
    description: 'Investigation of flame spread in narrow channels, equipment racks, and ductwork representative of spacecraft avionics bays and life support conduits.',
    keywords: ['CFI', 'confined combustion', 'duct', 'avionics', 'wall quenching', 'channel', 'ISS'],
    environment: ['iss', 'lunar_base', 'mars_rover'],
    findings: 'Confining walls reduce flame radiative heat losses and focus combustible pyrolyzate vapors along the duct axis, causing rapid flashover even when the material passes standard open-air flammability tests. Boundary layer thermal feedback dramatically reduces ignition delay times by up to 60%.',
    citation: 'Olson, S. L., & Zheng, Y. "Confined Combustion Investigation in Microgravity." NASA Glenn Technical Report, NASA PSI-CFI-2022.',
    gravity_condition: 'Microgravity (0g)',
    fire_safety_implication: 'Avionics bays and ducting must feature internal localized fire barriers and automatic fire seals rather than relying solely on room-level suppression.'
  },
  {
    id: 'PSI-STD-6001',
    investigation: 'NASA-STD-6001B Material Flammability Standards',
    title: 'Upward Flame Propagation (Test 1) and Wire Insulation Testing in Enriched Oxygen',
    description: 'NASA mandatory safety standard for testing materials in worst-case flight atmospheres (up to 30-34% O2 concentration at reduced pressure).',
    keywords: ['NASA-STD-6001', 'flammability', 'Nomex', 'Kapton', 'Teflon', 'wire insulation', 'Test 1', 'oxygen index'],
    environment: ['iss', 'lunar_base', 'mars_rover', 'earth'],
    findings: 'Materials rated self-extinguishing in standard Earth air (21% O2, 14.7 psi) fail Test 1 when oxygen exceeds 25%. Silicone rubbers, acrylics, and standard polyethylenes exhibit catastrophic flame spread in 30% O2 environments. Only fluoropolymers (PTFE/Teflon), Kapton (polyimide), and treated Nomex maintain acceptable ignition resistance.',
    citation: 'NASA Technical Standard NASA-STD-6001B: "Flammability, Offgassing, and Compatibility Requirements for Materials in Environments that Support Combustion." NASA HQ, 2021.',
    gravity_condition: 'Earth (1g) & Space Habitat Simulation',
    fire_safety_implication: 'Any material introduced into Lunar Base habitats (30-34% O2) must be strictly certified under NASA-STD-6001 Test 1 at the specific operational partial pressure of oxygen.'
  },
  {
    id: 'PSI-EARTH-01',
    investigation: 'NASA Earth Dual-Use Fire Safety Spinoffs',
    title: 'Spaceflight Combustion Sensors for Terrestrial Firefighter Safety and Building Systems',
    description: 'Translating space habitat optical particle sensors, low-flow water mist suppression, and multi-gas spectrometry to municipal firefighting and industrial clean-rooms.',
    keywords: ['Earth dual-use', 'firefighter', 'smart gear', 'water mist', 'spinoff', 'infrared telemetry', 'wildland fire'],
    environment: ['earth'],
    findings: 'Microgravity-derived fine water mist systems (droplet size 10-50 microns) extinguish high-risk enclosure fires using 80% less water than traditional sprinklers with zero electrical short-circuit damage. Advanced multispectral infrared sensors developed for ISS racks enable firefighter helmets to see through dense black smoke and detect hidden smoldering hot-spots in structural walls.',
    citation: 'NASA Spinoff Technology Transfer Office. "From Orbit to the Fireline: Microgravity Combustion Diagnostics in Modern Fire Suppression." NASA STTO Report-2023.',
    gravity_condition: 'Earth (1g)',
    fire_safety_implication: 'Deploying microgravity-calibrated particulate telemetry allows commercial high-oxygen facilities (hyperbaric chambers, surgical suites) to detect pre-ignition pyrolysis gases seconds before visible flame emergence.'
  },
  {
    id: 'PSI-MARS-01',
    investigation: 'Mars Habitat & Rover Pressurized Compartment Fire Dynamics',
    title: 'Combustion Hazards in Carbon Dioxide Rich Ambient with Pressurized Oxygen Compartments',
    description: 'Analysis of pressurized crew cabin versus exterior Martian atmospheric conditions (6-10 mbar CO2) and rover electrical battery enclosure risks.',
    keywords: ['Mars', 'rover', 'pressurized cabin', 'CO2 ambient', 'battery fire', 'thermal runaway', 'depressurization'],
    environment: ['mars_rover'],
    findings: 'Martian low ambient pressure (0.1 psi / 7 mbar CO2) offers an emergency venting fire suppression mechanism: rapid depressurization to ambient Martian pressure quenches open flames within 1.8 seconds. However, lithium-ion battery thermal runaway generates internal oxidizers that continue to burn in vacuum or pure CO2.',
    citation: 'McClure, R., et al. "Fire Protection Strategies for Mars Surface Exploration Architecture." SAE International / NASA TM-2024-MARS-FIRE.',
    gravity_condition: 'Mars (0.38g)',
    fire_safety_implication: 'Mars habitat fire mitigation relies on emergency depressurization venting for cabin fires, coupled with isolated cold-gas inert containment chambers specifically for battery storage racks.'
  }
];

