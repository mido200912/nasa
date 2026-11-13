# VULCAN-X frontend

Independent, educational habitat fire-science demonstrator. Next.js App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn/Radix, Zustand, Recharts, React Three Fiber / Three.js, Framer Motion, and Lucide. Visual rules are locked in [`design.md`](design.md).

## Run

```powershell
cd vulcan-x/Frontend
npm ci
npm run assets
npm run dev
```

Open http://localhost:3000. The optional asset command downloads 2K Moon, Mars, and Earth maps, with a ten-second timeout per file. No external texture or model is needed for the procedural planet shaders. Optional maps are from [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0. No GLB is required: the station ring is procedural geometry.

### Optional live backend

Copy `.env.example` to ignored `.env.local` and set the server-only `FIRE_SAFETY_API_BASE_URL` to the ASP.NET Core origin from its launch settings/startup output. Never use `NEXT_PUBLIC_*` for backend addresses or provider keys. Browser requests use only allowlisted `/api/backend/*` routes; no browser CORS configuration or authentication is required. Without backend configuration the Offline Playbook and educational simulator still work.

On `/dashboard/playbook`, choose **Live Knowledge**, select a real catalog environment, and ask a question or retrieve a persisted query ID. Only question/environment reach Vulcan-X. Material, year range, and max sources are persisted context, not retrieval filters. The current backend accepts language but does not persist or forward it. Returned title matches are local catalog matches, not scientific validation; unmatched titles stay unverified and unlinked. Failed responses retain `queryId` for retrieval. Requests are not automatically retried: cancellation does not roll back backend persistence, and another submission can create another record.

The integration setup, remaining live-test gates, and execution evidence are in [`../Backend/NASA-Project-Back-End/docs/integration/frontend-backend-integration-plan.md`](../Backend/NASA-Project-Back-End/docs/integration/frontend-backend-integration-plan.md) and the adjacent milestone report.

Milestone 6 adds bounded 32 KB proxy POST bodies and a configurable server-only timeout budget: `FIRE_SAFETY_AI_TIMEOUT_SECONDS=60` must match backend `VulcanX:TimeoutSeconds`; `FIRE_SAFETY_API_TIMEOUT_SECONDS=75` reserves five seconds for persistence cleanup plus transport overhead. If the actual hosting execution ceiling is known, set `FIRE_SAFETY_MAX_EXECUTION_SECONDS`; requests fail closed when proxy time plus five seconds cannot fit. A shorter hosting limit requires a designed asynchronous workflow, not a blindly raised timeout. No production platform/ceiling has been supplied or certified.

Live SQL/browser checks are opt-in, **not mocked**: with the real backend/database/Vulcan-X running, set `FIRE_SAFETY_LIVE_SQL=1` and run `npx playwright test --workers=1`. The extra unavailable-service test is run separately with the actual Bun service stopped, `FIRE_SAFETY_LIVE_FAILURE=1`, and `--grep 'real unavailable'`. `tests/integration/controlled-vulcan.mjs` is a loopback-only timing harness for backend integration tests; it is never an application route or production service and invents no successful answer.

## Verify

```powershell
npm run lint
npm test
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run qa:visual
npm run qa:dashboard
npm run qa:scroll
```

The Playwright configuration starts the production server if necessary. It checks navigation/telemetry synchronization, mouse/touch gestures, WebGL-unavailable fallback, preview interactions, reduced-motion mode, off-screen render suspension, and overflow at 320, 375, 414, 768, and 1440px. Visual QA requires a running server; it saves screenshots and an overflow/button-wrap report under `test-results/visual/`. Build/dev scripts explicitly use Webpack for compatibility with Windows environments where native Turbopack/SWC is unavailable.

If port 3000 belongs to another project, start this app on a free port and set `$env:BASE_URL='http://localhost:3001'` before running browser tests or visual QA.

## Implemented

### Command center

The landing launch action opens `/dashboard` with shared scenario state. The established root-level `app/`, `components/`, and `lib/` structure is retained; there is no competing `src/` tree.

| Route | Module |
| --- | --- |
| `/dashboard` | Environment presets, oxygen/pressure/gravity sliders, six materials, procedural 3D flame, illustrative risk matrix, spread and radar charts |
| `/dashboard/playbook` | Three incident templates, a question for human review, simulated streaming, stop/regenerate, 12 checkable review items, research links, Markdown export |
| `/dashboard/earth-bridge` | Shared terrestrial switch, three research translation pathways, editable baseline/target impact comparisons |
| `/dashboard/materials` | Search/family/program filters, six research candidate materials, simulator material selection, two-material radar comparison |

`store/useSimulationStore.ts` creates a per-provider Zustand store (no server-shared user state); `components/SimulationProvider.tsx` exposes the selector hook. Environment presets reset all atmosphere values; manual edits mark the preset custom. Selecting Mars/Earth in the landing explorer updates the corresponding habitat preset; Moon/ISS markers select their own presets. Other planets remain reference-only and preserve the last habitat scenario. Dashboard changes focus Mars or Earth on return. Landing oxygen/pressure and Earth-mode previews share state too. Parameters/material/mode/focus persist within the browser tab via versioned `sessionStorage`, with validated rehydration and in-memory fallback if storage is blocked.

The dashboard retains the locked blue/white tokens, Barlow typography, ruled surfaces, native scrolling, and mobile collapsible module navigation. Only the stress-test route creates a canvas; navigation unmounts it. The flame uses procedural GLSL value noise and rim shading, with SVG fallback. Reduced motion, offscreen, background, and scrolling states suspend continuous rendering. Charts disable entrance animation and provide textual summaries.

The restored solid-flame style is input-responsive: oxygen changes scale/brightness/motion, pressure changes scale/width/brightness, gravity changes spherical versus tapered shape and partial-gravity elongation, and the selected material changes synthetic intensity/size/motion. `lib/flame-response.ts` defines bounded, deliberately exaggerated visual mappings, reusing the catalog's synthetic heat-release weights—not measured material chemistry or a validated combustion law. Live shader uniforms update explicitly without recompilation, including on-demand/reduced-motion frames; SVG fallback responds to the same inputs. No material is implied to ignite under the displayed conditions. `tests/e2e/flame-response.spec.ts` checks actual rendered pixel differences on desktop/mobile and fallback changes. `node scripts/flame-response-qa.mjs` captures 18 input-comparison panels under `test-results/flame-response/`.

`lib/simulation.ts` documents the synthetic profiles and formula. Earth baseline is 1.0×; the supplied lunar example is 3.5×. Gravity changes the conceptual morphology, not a calibrated combustion law. LOI values are intentionally uncurated instead of fabricated. Program tags are reading context, not verified material-test citations. Water reduction starts with the brief's assumed 80% example; thermal/detection targets start blank until entered. No gain is represented as measured.

`lib/playbook.ts` produces review-only templates. Free-text questions are attached for a human reviewer, **not interpreted** by an LLM. Changing context, incident, or question clears stale output; active streams cancel on context changes/unmount. Export includes the scenario snapshot, review acknowledgements, limitations, and public reading links. No operational agent quantities, nozzle pressures, or depressurization thresholds are invented. This Offline Playbook stays separate from the optional persisted Live Knowledge workflow.

Dashboard verification: `tests/simulation.test.ts`, `tests/e2e/dashboard.spec.ts`, and `npm run qa:dashboard`. The latter captures completed modules and checks all six target widths at normal/200% root text sizing under `test-results/dashboard-visual/`. TestSprite is not configured; verification uses the existing Vitest and Playwright tools.

### Landing page

- NASA-inspired blue/white interface on the existing near-black surfaces. Primary blue follows NASA's current [insignia color guide](https://www.nasa.gov/nasa-brand-center/brand-guidelines/): `#0032A0`. Blue primary buttons use white text; lighter blue semantic tokens keep branding, highlighted data, links, controls and focus rings readable in dark mode. The VULCAN-X mark, favicon and illustrative risk indicators are blue too, replacing the intermediate red accents per user follow-up. Natural planet and flame colors are not recolored. No NASA logo or endorsement is implied.
- Reading-comfort scale: 16px body text with 1.65 line spacing, 14px controls/labels, and 12–13px supporting captions. Soft off-white replaces stark primary text; secondary grays are brighter and card surfaces slightly lighter. Most UI labels are sentence case in regular Barlow, with condensed type reserved for display headings. Preview/architecture grids reflow by readable minimum widths; the desktop dossier determines hero height so enlarged text and expanded notes cannot be clipped. Planet scene position/size remain unchanged. Tests cover six viewport widths and 200% text sizing in the preview/architecture sections.
- The incident picker is a minimal Radix Select: one-line 48px trigger and three plain incident options, without location subtitles, menu headings or checkmarks. Keyboard navigation/typeahead and touch remain supported. Its portal avoids card clipping, flips/shrinks to available viewport space, and supports 200% text sizing. Escape/outside click cancels without changing the choice; selecting a new incident clears stale scripted output. Selection stays disabled during generation and unlocks on stop/completion.
- One lazy-loaded WebGL canvas per relevant route. Landing planets use GLSL 3D gradient Perlin noise, crater relief, procedural continents/clouds, and Fresnel rims; zero runtime texture requests.
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

**Not an operational safety system.** Educational outputs are local illustrations, not NASA-certified predictions. Optional live workflows require a configured backend, database, and Vulcan-X service; AI interpretation and catalog citation matching are not scientific validation. Live Habitat submission remains disabled pending approved scientific inputs.

The 3.5× burn-rate and +40% ignitability figures come from the supplied design brief. They are displayed as unvalidated scenario assumptions, not sourced NASA experimental conclusions. `lib/risk.ts` (landing preview) and `lib/simulation.ts` (dashboard) are bounded, illustrative UI formulas, not fitted physics models. Material scores cannot be used for engineering decisions.

The playbook is a deterministic outline selected from three examples, not an autonomous emergency protocol. In a real incident use approved mission procedures. Earth-side specifications are conceptual and require applicable standards, testing, and qualified review. Research links in `lib/environments.ts` give context, not evidence supporting the demonstration's numeric outputs. Orbital spacing, station geometry, and flame diagrams are conceptual, not to scale.

Future integration points: replace `lib/risk.ts` only with an independently validated model adapter. Keep the deterministic offline generator separate from live APIs. API credentials and retrieval infrastructure stay in the backend; never expose keys in client code.

## Scope

Frontend implementation, dependencies, assets, and tests live in `vulcan-x/Frontend`. Milestone 5 remains intact. Milestone 6 adds backend protections/cancellation cleanup and upstream cancellation handling, without database schema changes. Cross-service evidence lives under the backend's `docs/integration/` directory. Vitest is patched to 4.1.12; remaining development-only audit findings are documented in the execution report.
