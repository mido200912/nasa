# Home motion tasks

## R7 · Completed · Final direction
- [x] Reproduce native continuous wheel/steady graphic failures against R6.
- [x] Remove coordinator/helper, chapter wrappers/markers/snapping and timeline/fallback effects.
- [x] Preserve planet/card/habitat interactions, anchors and rendering optimizations.
- [x] Replace rejected chapter tests; adapt QA/recording/docs to native scrolling.
- [x] Production build/lint/types, 22 unit + 34 browser tests, five-width visual and isolated scroll QA pass; recording refreshed.
- [x] Reopen preview on 3001 after restart; leave unrelated port-3000 project untouched. No open implementation tasks. Older task lists below are historical.

## R6 · Completed
- [x] Reproduced ordinary scrolling in narrow/coarse/reduced modes and tiny trackpad deltas using real Playwright wheel input.
- [x] Replaced conditional/async Lenis handler with direct non-passive capture-phase wheel handling; Lenis uninstalled.
- [x] Preserve zoom, horizontal wheel, nested scroll/form input, keyboard/touch/scrollbar and interruptible anchors.
- [x] Production build/lint/types, 25 unit + 40 browser tests and five-width visual QA pass.
- [x] Refreshed actual chapter wheel recording. Live browser tool input timed out; use verified automated real-wheel results, not an unsupported physical-browser claim. No open implementation tasks.

## R5 · Completed
- [x] Removed intermediate tall-section pages: one desktop gesture now lands at adjacent section start.
- [x] Regression tests confirm top→science→demos and reverse→science, with momentum bursts grouped.
- [x] Production build/lint and 25 unit + 33 browser tests pass. No open tasks.

## R4 · Completed
- [x] Four viewport-minimum chapters without fixed-height clipping or nested scroll containers.
- [x] Desktop one-gesture chapter transitions, including momentum grouping and readable tall-chapter pages; reverse supported.
- [x] Right-edge accessible chapter links/current-section indicator; native mobile/reduced-motion proximity snapping.
- [x] Production build/lint/types, 25 unit + 33 browser tests and five-width visual QA pass.
- [x] Refreshed actual wheel recording. No open tasks.

## R3 · Completed
- [x] Inspected connected browser: animation enabled, fine pointer, view timelines supported, reduced motion false. Current graphics had already finished above the viewport.
- [x] Added early large planet-scene recession and sustained large science-display arrival; keep headings/telemetry/feature cards steady.
- [x] Disabled R3F scroll measurement and enabled untransformed offset sizing to avoid resizing WebGL while CSS transforms the scene.
- [x] Production build/lint/types, 22 unit + 32 browser tests and five-width QA pass. Before/after render budget remains low.
- [x] Recorded actual wheel input and opened `test-results/scroll/motion-demo.webm` in Review. No open tasks.

## R2 · Completed
- [x] User explicitly selected both wheel glide and visible scroll-linked animation.
- [x] Added desktop-only lazy Lenis with native touch/reduced-motion/anchors preserved.
- [x] Replaced barely-visible 2% settling with visible flame growth and bridge travel/link expansion, using native view timelines and finite fallback.
- [x] Kept text/card/hero steady, plus R1 WebGL suspension and DPR caps.
- [x] Verified actual wheel easing, >10-point flame scale change, bridge travel, live preference changes and all existing interactions.
- [x] Production build, lint/types, 22 unit + 30 browser tests and five-width QA pass. No open tasks.

## R1 · Completed
- [x] User reported both visual and responsiveness problems; treat initial choreography as rejected.
- [x] Measured original scroll workload at DPR 2 / 4× CPU throttle.
- [x] Removed GSAP and all full-page scroll/reveal effects; one subtle flame-graphic transition remains.
- [x] Removed scroll-driven scene event/ref/transform; kept local planet motion and actual visibility suspension.
- [x] Pause continuous rendering during native scroll; cap pixel density.
- [x] Production build, lint/types, 22 unit + 28 browser tests, five-width visual QA pass.
- [x] Comparative report stored in `.gsap/performance-comparison.json`; original statuses below are historical.

Active: None; all four phases verified sequentially.

- [x] P01: regression tests; lazy scroll coordinator; compositor hero departure; imperative WebGL descent; canvas visibility; validate. Three new unit tests and three browser checks pass; lint passes.
- [x] P02: science text grouping and independent flame reveal wrapper; mobile/reduced downgrade; validate. Four browser tests pass, lint passes. Strict type check found a closure-narrowing scope issue; fixed with the already-validated root assertion.
- [x] P03: replace duplicate Framer reveals with GSAP-owned wrappers; stage feature/bridge entrance without touching slider state; validate. Five browser regressions pass; lint and strict types pass.
- [x] P04: connective signal track and stage sequence; no markup/layout rewrite; validate all interactions, production build, visual QA, performance evidence. 25 unit tests and 32 browser tests pass; all quality gates green.
- [x] Update phase/page/plan/audit with actual results after each phase.
