# Motion audit · 2026-11-12

## Current R7 · Section animation removed
User rejected section animation. Removed ScrollExperience, chapter destination helper, viewport-minimum wrappers, navigator/snapping and every scroll-timeline graphic effect/fallback. Native wheel deltas now move normal document scroll without chapter destinations; planet scene/card/focus and rendering optimizations remain unchanged. Five native-scroll/steady-graphics regressions failed on R6 first, then passed after removal. Obsolete chapter tests replaced rather than retaining rejected behavior.

Production build/lint/types, 22 unit + 34 browser tests, five-width visual QA and isolated scroll QA pass; wheel recording refreshed. No browser errors, clipped card or horizontal overflow in responsive QA. Performance sampling found zero long tasks in this environment; not a universal FPS/GPU claim. Following server restart, port 3000 belonged to another project; use VULCAN-X preview on 3001. R1–R6 entries below are historical.

## Current R6 · Activation defect reproduced and fixed
Root-cause coverage: previous device/media gates and delta threshold allowed ordinary wheel scrolling for narrow windows, coarse pointers, reduced-motion users and 1px trackpad events. All four reproduced as failing real-wheel tests against the previous production build. Replaced async/conditional Lenis path with synchronous non-passive capture-phase wheel handling at every viewport. Removed Lenis dependency and styles. Reduced motion uses instant section destinations.

Production build/lint/types, 25 unit + 40 browser tests and five-width visual QA pass. Native nested/form/zoom/keyboard/touch remain available; cancellation covered. Recorded actual automated wheel input. Connected-browser tool's scroll and RAF calls timed out; do not confuse that with verified physical user input. Previous wide-preview success did not cover the fallback paths.

## Current R5
Corrected R4 misunderstanding: desktop gestures now jump directly to adjacent section starts, never stop inside tall sections. Regression tests verify initial down→science, next down→demos, reverse→science, plus gesture burst grouping. Production build/lint and all 58 tests pass. Layout and other controls unchanged.

## Current revision R4
User requested section-by-section scrolling. Added four explicit chapter wrappers, desktop gesture-to-chapter easing (with readable intermediate pages inside tall chapters), momentum grouping, native mobile/reduced-motion proximity snapping and accessible right-edge navigation. Kept all existing scene/card/demo controls and anchors. Avoided fixed-height clipping and mobile control overlays.

Production build/lint/types, 25 unit + 33 browser tests and five-width QA pass. Actual chapter forward/reverse/burst behavior and direct section links tested; recording refreshed. Historical revisions below no longer describe the active wheel-navigation behavior.

## Current revision R3
User still perceived no visible animation. Connected preview inspection showed no reduced-motion block: effects were active but small and had finished above the current viewport. Added clearly visible CSS-only scene recession and large science-display motion. Identified R3F's default scroll-aware measurement as a risk for transformed-canvas redraws; disabled scroll measurement and used offset dimensions. Buffer-stability and displacement browser tests pass.

Production build/lint/types, 22 unit + 32 browser tests and five-width QA pass. Throttled hero scroll: 84 draws/232ms scripting mobile; 105 draws/312ms desktop. A real wheel-scroll WebM was recorded and opened in Review. Earlier checks alone were not a substitute for user-visible motion review; the recording is now part of handoff.

## Current revision R2
R1 overcorrected into almost-static content. User selected both gliding wheel scrolling and visible but restrained animation. Desktop now lazy-loads Lenis 1.3.27; touch/narrow/reduced motion remains native. CSS view timelines animate only the flame and bridge graphics; fallback uses finite entrances. Text, cards and planets keep their stable poses. No GSAP runtime.

Verification: 22 unit + 30 browser tests, build/lint/types, five-width QA pass. Tests measure actual gradual wheel progress and meaningful graphic transforms rather than just flags. R1 rendering reductions retained: throttled 3s hero sample still 105 draws vs original ~3800; latest script time 317ms mobile/361ms desktop vs original 776/1157ms. Whole-page sample records no layouts or long tasks. Samples are local renderer evidence only.

## Current findings and correction R1
The user rejected both motion style and responsiveness. The earlier 60Hz headless RAF samples were not sufficient evidence of good perceived scrolling: a throttled high-DPI hero scroll still performed ~3800 WebGL draws and 776–1157ms scripting in 3 seconds.

Removed GSAP/ScrollTrigger, text fades, staggered reveals, scene descent and drawn connection styling. Kept one 2%/320ms flame graphic transition, normal document scroll, unchanged planet layout/card, and no-JS/reduced-motion support. Continuous rendering now stops during scroll gestures (selection/drag demand frames remain), and DPR caps cut shader pixel workload. The same sample now records 105 draws and 232–329ms script time. Buffer pixel count falls 75% mobile and ~44% desktop. These measurements support reduced workload, not a guaranteed perception/FPS claim.

Current checks: production build/lint/types, 22 unit tests, 28 browser tests, five-width visual QA all pass. Earlier sections below are history. No active GSAP dependency remains. Existing dev-tool advisories are unchanged.

## Verified implementation
- Next.js App Router / React 19; Framer Motion used for telemetry presence, playbook preferences, and three generic Reveal wrappers.
- Single R3F canvas, shader-rendered planets, pause/reduced-motion support.
- Existing rendering visibility follows the entire hero, not the actual canvas. On mobile the canvas can leave the viewport while the tall hero still intersects.
- Native anchor smooth scrolling already present; keep it.
- Flame stage has static CSS geometry; architecture has arrows but no drawn connection.

## Discovery correction
The helper inferred testimonials, FAQ, forms, and other unrelated sections from source keywords. Those newly generated plans were replaced with four phases matching the actual page. No production files removed.

## Risks / fixes to verify
- No transform contention with telemetry motion.aside, procedural planet interpolation, CSS flame mode transforms, or slider risk-fill transforms.
- Avoid opacity-zero content and controls that only become available after animation.
- Test runtime preference changes, mobile card sizing, resize, WebGL fallback, hash links, return-to-top state, and cleanup.
- Verify actual off-screen canvas suspension and no duplicate canvas/context.

## Results
- P01–P04 verified sequentially. GSAP 3.15.1 is pinned and lazy-loaded; Framer Motion no longer owns the three entrance wrappers.
- Actual WebGL-group transforms provide desktop descent without changing local planet selection transforms. No second canvas or layout-shifting scroll pinning.
- Canvas-specific intersection now suspends rendering; instrumented off-screen drawElements count stays unchanged across eight sampled frames.
- Live reduced-motion switching and desktop→mobile resize revert inline transforms and temporary compositor hints. HTML stays visible with JavaScript disabled. Flame modes and slider transforms have independent wrappers.
- Production build, lint, types, 25 unit tests and 32 Playwright tests pass. Five visual widths pass (320/375/414/768/1440).
- Isolated renderer sample: desktop median/p95 16.7/16.8 ms, zero >50ms frames/long tasks. Mobile median/p95 16.7/16.8 ms, one >50ms frame, zero long tasks. Samples are environment-specific; hardware GPU utilization not available.

## Dependency audit note
Installing GSAP surfaced 9 existing development-tool advisories (8 moderate, 1 critical), involving pinned Vitest 4.0.18 / its mocker and typescript-eslint/minimatch. No GSAP advisory was reported. Vitest's critical advisory concerns exposing its UI server; this project runs `vitest run`, not that server. Unrelated upgrades were not applied; review separately before exposing development tools.
