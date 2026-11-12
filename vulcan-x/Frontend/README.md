# VULCAN-X frontend

Independent, educational habitat fire-science demonstrator. Next.js App Router, React 19, strict TypeScript, Tailwind CSS 4, React Three Fiber / Three.js, Framer Motion, and Lucide.

## Run

```powershell
cd vulcan-x/Frontend
npm ci
npm run assets
npm run dev
```

Open http://localhost:3000. The optional asset command downloads 2K Moon, Mars, and Earth maps, with a ten-second timeout per file. No external texture or model is needed for the procedural planet shaders. Optional maps are from [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0. No GLB is required: the station ring is procedural geometry.

## Verify

```powershell
npm run lint
npm test
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run qa:visual
npm run qa:scroll
```

The Playwright configuration starts the production server if necessary. It checks navigation/telemetry synchronization, mouse/touch gestures, WebGL-unavailable fallback, preview interactions, reduced-motion mode, off-screen render suspension, and overflow at 320, 375, 414, 768, and 1440px. Visual QA requires a running server; it saves screenshots and an overflow/button-wrap report under `test-results/visual/`. Build/dev scripts explicitly use Webpack for compatibility with Windows environments where native Turbopack/SWC is unavailable.

If port 3000 belongs to another project, start this app on a free port and set `$env:BASE_URL='http://localhost:3001'` before running browser tests or visual QA.

## Implemented

- NASA-inspired blue/white interface on the existing near-black surfaces. Primary blue follows NASA's current [insignia color guide](https://www.nasa.gov/nasa-brand-center/brand-guidelines/): `#0032A0`. Blue primary buttons use white text; lighter blue semantic tokens keep branding, highlighted data, links, controls and focus rings readable in dark mode. The VULCAN-X mark, favicon and illustrative risk indicators are blue too, replacing the intermediate red accents per user follow-up. Natural planet and flame colors are not recolored. No NASA logo or endorsement is implied.
- One lazy-loaded WebGL canvas. GLSL 3D gradient Perlin noise, crater relief, procedural continents/clouds, and Fresnel rims; zero runtime texture requests.
- A planetary explorer rather than a literal solar-system model: all eight planets sit on one tilted elliptical navigation curve with a subtle guide. Focus changes travel along the curve, bringing the selected planet to the near side while the others recede in size and brightness. No Sun, solar glow, or concentric orbital grid is rendered. Procedural surfaces, Jupiter cloud bands, and Saturn rings remain; Moon/ISS markers appear only when Earth is in focus.
- On desktop, the explorer spans approximately 70% of the page width, with telemetry in a separate right-hand column. Projection-based camera fitting responds to viewport changes and fits every selection, including Saturn's rings, without zoom jumps. Mobile keeps a stacked layout.
- The right-hand card follows the active planet on initial load, clicks, and swipes. All eight profiles include NASA/NSSDCA reference temperature, effective equatorial gravity, equatorial diameter, rotation period, environment notes, and source links. Giant-planet reference levels and retrograde rotation are explicitly qualified; these are not live telemetry or invented fire-risk estimates. The desktop card stays raised beside the intro, and mobile lets its content determine the section height rather than clipping it.
- The card is a flat planetary dossier: clear planet identity, four ruled fact rows with inline units, a neutral environment note, accessible NASA links, and a native “Reading these values” disclosure for measurement qualifications. No frosted backdrop, warning-style atmosphere badge, decorative corner marks, or oversized metric tiles. Planet selection updates the dossier and resets its disclosure; reduced-motion behavior remains intact.
- Planet tabs, their scale note, swipe/pause/focus-counter row, habitat selector and previous/next arrows have been removed entirely, including their styles and reserved vertical space. Scene interactions and the selected-planet card remain; no replacement control strip is shown.
- Drag/swipe advances the focused planet; clicking a planet or its in-scene label focuses it directly. In-scene labels are keyboard operable. Each focused description is anchored beneath its planet, including in the WebGL fallback. Reduced-motion mode applies focus changes immediately. A compact reference chooser appears only when WebGL is unavailable, so the card remains accessible without 3D.
- `IntersectionObserver` plus Page Visibility API switches to on-demand frames off-screen or in a background tab. Pause and reduced-motion modes also render on demand. No React state updates per animation frame.
- Ordinary continuous document scrolling on every viewport: no intercepted wheel input, section jumps, snapping, chapter navigator, or scroll-driven scene/flame/bridge transforms. Native anchor navigation remains smooth unless reduced motion is enabled. Planet focus and card interactions remain independent of scrolling; content stays visible without JavaScript. No GSAP or Lenis runtime.
- Continuous WebGL rendering pauses during scroll gestures and resumes after 160ms idle; planet selection and dragging still request frames. Pixel density is capped at 1 on mobile and 1.5 on desktop instead of 2, reducing shader pixel load on high-DPI displays. Off-screen/background/pause/reduced-motion rendering suspension remains, without a transformed scrolling container, pinned sections, or an extra canvas.
- WebGL error/unavailable fallback; all eight planetary profiles remain accessible without 3D.
- Earth/microgravity flame comparison uses static, token-colored SVG illustrations: an upward layered plume with convection arrows versus a filled blue diffusion envelope with inward flow arrows. Simple underlined gravity controls replace the boxed tabs; no crosshair, orbital reticle, neon torus, CSS flame blob, extra canvas, or animation loop. The caption explicitly qualifies the spherical case as idealized still air and notes ventilation can distort it. Both states have accessible descriptions and stable layout. Oxygen/pressure sliders, material bars, space/Earth translation switch, scripted playbook streaming with stop/regenerate, and architecture pipeline remain.
- Local bundled fonts, keyboard focus, skip link, labeled controls, textual status indicators, and reduced-motion alternatives.

## Scientific and service boundaries

`npm run qa:scroll` requires a running production server and saves desktop/mobile section screenshots plus renderer/RAF samples in `test-results/scroll/`. `node scripts/scroll-budget.mjs` additionally samples a 3-second hero scroll at DPR 2 with 4× CPU throttling, reporting WebGL draw calls and renderer time. These are environment-specific measurements, not hardware GPU-utilization readings or a guaranteed frame rate. Run without concurrent browser tests. `.gsap/` records the rejected initial direction and its replacement.

`node scripts/record-scroll.mjs` records ordinary desktop wheel scrolling to `test-results/scroll/motion-demo.webm` for visual review of continuous scrolling and steady content.

**Not an operational safety system.** There is no backend, live RAG retrieval, LLM inference, or NASA-certified prediction connected. The UI says so rather than implying a working service.

The 3.5× burn-rate and +40% ignitability figures come from the supplied design brief. They are displayed as unvalidated scenario assumptions, not sourced NASA experimental conclusions. `lib/risk.ts` is a bounded, illustrative UI formula, not a fitted physics model. Material scores cannot be used for engineering decisions.

The playbook is a deterministic outline selected from three examples, not an autonomous emergency protocol. In a real incident use approved mission procedures. Earth-side specifications are conceptual and require applicable standards, testing, and qualified review. Research links in `lib/environments.ts` give context, not evidence supporting the demonstration's numeric outputs. Orbital spacing, station geometry, and flame diagrams are conceptual, not to scale.

Future integration points: replace `lib/risk.ts` with a validated model adapter and the scripted generator with a reviewed, provenance-carrying API. Keep API credentials and retrieval infrastructure in the backend; never expose keys in client code.

## Scope

All implementation, dependencies, assets, documentation, and tests live in `vulcan-x/Frontend`. Backend, AI Model, and repository-root files are unchanged.
