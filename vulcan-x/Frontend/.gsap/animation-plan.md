# Animation plan

## R7 · Verified · Remove section animation
User requests removal. Supersedes R1–R6: restore ordinary continuous document scrolling on desktop/mobile/reduced motion. Remove wheel interception, chapter wrappers/navigation/snapping and all scene/flame/bridge scroll effects. Preserve planet focus/card/drag interactions, native anchors, DPR caps and render suspension. Five new browser regressions fail against R6 as expected. Remove implementation, replace obsolete tests, then verify production and responsive layout.

Result: coordinator/helper and chapter-only tests deleted; plain section flow restored; all scroll-timeline CSS removed. Build/lint/types, 22 unit + 34 browser tests, five-width visual QA and isolated scroll QA pass. Real-wheel recording refreshed. Restart left port 3000 owned by another project; VULCAN-X preview moved to 3001 without stopping that project. Earlier revisions below are historical, not active requirements.

## R6 · Verified · Reliable wheel activation
User reports ordinary continuous scrolling. Connected preview's wide/fine-pointer case works, but section handling currently depends on width/hover/pointer detection, reduced-motion setting and asynchronous Lenis initialization; all other paths silently fall back to continuous scrolling. Replace that conditional path with one synchronous non-passive capture-phase wheel listener on every viewport. Any nonzero vertical wheel/trackpad delta navigates a chapter; reduced motion jumps immediately, not continuously. Keep native touch/keyboard/scrollbar/nested controls and cancellable anchor navigation. Use on-demand RAF only during the 700ms transition; no Lenis runtime/dependency. Reproduce narrow-width, coarse-pointer and reduced-motion gaps with real wheel tests first.

R6 results: four real-wheel failures reproduced before implementation (80px ordinary scroll instead of next chapter for narrow/coarse/reduced; 1px trackpad delta leaked natively). All now pass against production. Build/lint/types, 25 unit + 40 browser tests and five-width visual QA pass. Added nested UI/form behavior, capture propagation and mid-transition navigation cancellation regressions. Actual wheel recording refreshed. Connected-browser tool scroll/RAF verification timed out; no claim of additional live physical-wheel verification. Automated Chromium real-wheel regression is verified.

## R5 · Verified · Direct section jumps
User clarified: one downward wheel gesture must land at the next section start, upward at previous start. Remove R4's intermediate tall-section pages. Keep geometry/layout, momentum grouping, easing, links, native mobile/reduced motion, and existing graphic effects. Test first gesture from page top lands at science, second at demos, reverse at science, including momentum bursts. Scrollbar/keyboard/deep links preserve access within tall sections.

Result: build/lint, 25 unit + 33 browser tests pass against production. Actual first/second/reverse wheel destinations verified; no intermediate tall-section stops remain.

## R4 · Verified · Section-by-section navigation
User changed direction to section-by-section scrolling. Four chapters: Mission Control, Fire Science (including research strip), Interactive Demos, Architecture (including footer). Desktop wheel gestures ease to the next chapter; oversized chapters advance by readable viewport-sized steps before moving on. Do not lock content into inaccessible fixed-height boxes. Add four accessible chapter links/current-section indicator. Native touch uses proximity snapping; reduced motion stays native and immediate. Keep active-planet controls, anchors, rendering budget, and latest graphic motion. Test chapter destinations, tall content, reverse direction, controls and reduced motion.

R4 results: production build/lint/types, 25 unit + 33 browser tests, five-width visual QA pass. Tests cover actual wheel destinations, momentum bursts, reverse chapter movement, tall-section readable steps, direct navigation, native mobile fallback, reduced-motion links and all planet/demo controls. The actual chapter-wheel recording was refreshed at `test-results/scroll/motion-demo.webm`. Chapter markers stay at the right edge to avoid covering mobile habitat controls.

## R3 · Verified
Connected browser inspection confirms reduced motion is OFF and animations are running, but the small graphics finish before the user notices. Add clearly visible compositor-only planet-scene recession from the first desktop scroll, then a large science-panel arrival sustained through the viewport. Text/telemetry/feature cards remain steady. Preserve wheel glide and rendering suspension; disable scroll-dependent canvas remeasurement so a CSS scene transform does not resize/re-render WebGL. Verify actual >20px scene movement, >30px panel movement, and unchanged draw budget. Capture a real scroll video as visual evidence, not just passing flags.

R3 results: production build/lint/types, 22 unit + 32 browser tests and all five visual widths pass. Actual scene displacement/scale and large display movement regressions pass; WebGL drawing buffer remains unchanged during scene CSS transforms. Throttled 3s hero sample: mobile 84 draws/232ms script; desktop 105 draws/312ms script, vs original ~3800 draws. Actual wheel-scroll recording saved to `test-results/scroll/motion-demo.webm` and opened in Review for the user. No GPU hardware utilization claim.

## R2 · Verified
User chose option 3: wheel glide plus noticeable but restrained graphics. Implement one coordinator with lazy Lenis only on desktop/fine pointer; native CSS view-timeline transforms for the flame and bridge nodes/connection. Native touch, static reduced motion, full text opacity, no card/hero transform. Fallback to finite graphic entrances when view timelines are unsupported. Preserve all R1 canvas budget improvements. Test actual wheel inertia and graphic transform changes, not merely mode labels.

R2 results: Lenis 1.3.27 pinned/lazy, browser-native view timelines for four graphic layers. Production build/lint/types, 22 unit + 30 browser tests pass. Wheel input progresses gradually to its target; flame changes scale by >10 percentage points; bridge nodes travel >10px while card/text remain steady. Live reduced motion destroys smoothing and disables graphics; resizing to mobile restores native input. Five-width visual QA passes. Throttled hero sample still records only 105 draws; whole-page samples record zero layouts and no long tasks. No universal FPS claim.

## Superseding revision · user rejected both appearance and responsiveness
Status: R1 verified. Prior verification below is historical and does not imply user approval.
1. Remove GSAP scrub/reveals and Three.js descent; steady native scroll with one 320ms, 2% flame-only settling effect.
2. Stop continuous WebGL during native scrolling; preserve focus/drag invalidation. Cap DPR at 1 mobile / 1.5 desktop.
3. Keep actual canvas off-screen suspension. Test reduced motion, static content, profile controls, and renderer draw calls.
4. Compare against DPR-2 / 4× CPU throttle / 3s hero-scroll baseline: mobile 3780 draws, 776ms script; desktop 3801 draws, 1157ms script. Frame samples alone did not expose the user's responsiveness problem.
5. Production build, regression tests, responsive screenshots; no unrelated dependency upgrades.

R1 results: production build/lint/types pass; 22 unit + 28 browser tests pass. All five visual widths pass. Under the same throttled high-DPI scroll sample, draws fell to 105 on both widths (from 3780/3801), script time to 232/329ms (from 776/1157ms), buffer pixels to 97500/1208088 (from 390000/2148048). See `.gsap/performance-comparison.json`. These are local comparative renderer measurements, not GPU-utilization readings. Paused/resumed rendering test now explicitly returns the actual canvas to view before expecting continuous rendering.

Read spec, audit, page, tasks, and current phase before continuing. Execute and verify one major section at a time.

| Phase | Surface | Status |
| --- | --- | --- |
| P01 | Hero departure + reusable coordinator + WebGL visibility | Verified |
| P02 | Science/flame transition | Verified |
| P03 | Feature heading/cards/diagram | Verified |
| P04 | Architecture connection sequence + final QA | Verified |

Use scoped GSAP matchMedia/context with full cleanup. Preserve SSR content and existing server/client boundaries. Lazy initialization must tolerate canvas arriving after hydration. Geometry in the WebGL scene reads imperative progress refs, not React scroll state.

Validation: lint, strict types, Vitest, Playwright (desktop/mobile, live reduced-motion changes, anchors/controls, render suspension), visual QA at 320/375/414/768/1440, production build, browser trace/frame evidence. Do not claim hardware GPU timing when only renderer/RAF measurements are available.

Completed 2026-11-12. Production build, lint, types, 25 unit tests, 32 browser tests, and five-width visual QA pass. Isolated `qa:scroll` captures renderer/RAF samples and section screenshots under `test-results/scroll/`; median/p95 frame intervals ~16.7/16.8 ms at 375px and 1440px, no observed long tasks. These are local headless-browser samples, not a universal FPS guarantee. No phases remain; further motion direction requires a new user request.
