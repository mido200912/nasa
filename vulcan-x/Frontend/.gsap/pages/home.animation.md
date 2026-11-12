# Home `/` · motion map

## UI follow-up · Control strips removed
Planet tabs/note, swipe/pause/counter toolbar and habitat selector/arrows removed, including their CSS and reserved height. Direct scene selection, keyboard labels, drag/touch and active-planet card remain. Compact fallback reference controls appear only without WebGL. No scroll motion reintroduced. Verified build/lint/types, 22 unit + 35 browser tests and five-width responsive QA. Final mobile-fallback spacing adjustment rebuilt and all three relevant removal/fallback browser checks passed.

## Current R7 · Native continuous scrolling · Verified
No section animation/coordinator, chapter wrappers/markers/snapping or scroll-driven scene/flame/bridge transforms remain. Plain section sequence in app/page.tsx. Native anchor smooth scrolling retained (immediate for reduced motion). Interactive planet focus/card/habitat/drag/touch behavior and WebGL DPR/off-screen/scroll-time optimizations remain.

Verified production build/lint/types, 22 unit + 34 browser tests, five-width visual QA and isolated scroll QA; real-wheel recording refreshed. Five native-scroll regressions reproduced R6's rejected behavior before removal. Current preview: http://localhost:3001 after restart exposed an unrelated project on port 3000. All older entries are historical.

## Current R6 · Device-independent section input
Wheel-to-section handling is synchronous, capture-phase/non-passive, and active at every viewport/pointer type. Reduced motion changes timing to instant rather than disabling section navigation. Tiny trackpad deltas no longer fall through. No Lenis runtime/dependency. Native touch, keyboard, scrollbar, nested scrolling and form controls remain native; pointer/key/resize/navigation can interrupt the 700ms on-demand RAF transition.

Production build/lint/types, 25 unit + 40 real-browser tests, five-width visual QA pass. Four fallback failures were reproduced first and fixed. Additional tests cover child propagation, nested/form input, and navigation cancellation. Actual wheel recording refreshed. Connected app's scroll/RAF tool attempts timed out, so physical-browser input verification is not claimed.

## Current R5 · Direct section scrolling
Desktop wheel down moves directly to next section start; wheel up to previous start. No mid-section paging. Smooth 800ms transition and momentum grouping remain. Scrollbar/keyboard/deep links still access tall content. Mobile/reduced motion unchanged. Production build/lint, 25 unit + 33 browser tests pass.

## Current revision R4 · Section-by-section
Verified: Mission Control → Fire Science → Interactive Demos → Architecture, each at least viewport height. Desktop wheel gestures ease one chapter at a time over 800ms; tall sections page through their full readable content first. Native touch/reduced motion uses proximity snapping. Existing anchors still work. Four labeled right-edge markers show current chapter and provide direct links. No clipped fixed-height content or inner scroll traps.

Results: production build/lint/types, 25 unit + 33 browser tests, five-width QA pass. Actual wheel burst/forward/reverse destinations, tall content, direct links, reduced motion and controls verified. Recording updated: `test-results/scroll/motion-demo.webm`. R1 GPU workload reductions and R3 scene/display graphics remain.

## Current revision R3 · supersedes the maps below
Verified: the whole planet-scene container visibly recedes -130px/84% across the first 760px desktop scroll; this is a cached-layer CSS transform, not a 3D camera change. The entire flame display rises from +112px/86% over a sustained viewport range (+64px mobile). Existing inner flame/bridge graphics, Lenis desktop glide, native touch and reduced-motion behavior remain. Headings/telemetry/feature cards stay steady. R3F uses `resize={{scroll:false,offsetSize:true}}` so scene movement does not resize/re-render its buffer.

Checks: build/lint/types, 22 unit + 32 browser tests, five visual widths pass. The large scene/display tests assert actual pixel displacement and stable WebGL buffer size. Recording: `test-results/scroll/motion-demo.webm`; opened for the user. Local throttled sample: 84/105 draws mobile/desktop across 3s hero scroll; no universal FPS guarantee.

## Current revision R2 · supersedes R1 and the original map below
Verified: desktop wheel glide (Lenis 1.3.27, lerp 0.14, native document container); native mobile/touch/reduced motion. Flame visibly grows 76%→100% and settles vertically; space/Earth nodes travel inward and the connecting line expands. Native CSS view timelines drive supported browsers; observer/WAAPI entrances cover older browsers. No text/card/hero fading, no 3D scroll transforms, no pinning. R1 WebGL/DPR optimizations remain.

Results: build/lint/types, 22 unit + 30 browser tests, five-width visual checks pass. Actual wheel and graphic displacement regressions pass. Isolated whole-page renderer sample: ~16.7ms median/~16.8ms p95 intervals, no long tasks or layouts at both widths. Throttled hero sample: 105 draws, 317/361ms script time mobile/desktop. Not hardware GPU-utilization evidence or guaranteed FPS.

## Current revision R1 · supersedes the map below
Verified after user rejected both appearance and lag. GSAP is uninstalled. Hero, text, features, bridge and architecture are static during native document scroll. Only the flame graphic scales from 0.98→1 once in 320ms through IntersectionObserver/Web Animations, disabled by reduced motion. Continuous WebGL suspends during a scroll gesture, resumes after 160ms idle, and stays suspended off-screen/background. DPR is 1 mobile / max 1.5 desktop. Planet-local focus transitions, active-planet profiles and all controls remain unchanged.

R1 verification: 22 unit tests, 28 browser tests, production build, lint/types; five-width visual QA pass. New regressions assert steady text/card, no steady-state draws while scrolling, DPR caps, live reduced motion, native anchors and no-JS visibility. Prior motion-map rows and results below are historical only.

Status: All four phases verified on production build, 2026-11-12. Source of truth is `.gsap` and current source, not chat history.

| Surface | Intent | Ownership |
| --- | --- | --- |
| Hero | Planets recede; intro/card subtly depart as science approaches | GSAP wrapper transforms + Three.js imperative group transform |
| Research strip | Static bridge between chapters | No decorative loop |
| Fire paradox | Text then comparison; flame emerges separately | GSAP wrappers, CSS mode visuals untouched |
| Engine previews | Header then three ordered entrances; bridge connection | GSAP wrappers; React owns input/data state |
| Architecture | Signal draws through four stages | GSAP scale-based connector + stage reveals |
| Footer | Remains static and fully readable | None |

Mobile: no hero scrub or WebGL scroll movement, shorter once-only entrances, architecture adapted to stacked layout.
Reduced motion: static; media changes revert all scroll-owned inline transforms immediately.
No JavaScript: all copy, sources and section landmarks render visibly; interactive WebGL retains its existing fallback.

Verification: 25 unit + 32 browser tests; lint/types/build pass; visual checks at 320/375/414/768/1440 report no overflow, clipped cards, wrapped button labels, or overflowing metrics. Both flame modes, all planet profiles, native anchors and preview controls remain operable. Dedicated draw-call instrumentation confirms no WebGL drawElements calls across eight sampled frames after scrolling off-screen.

Performance evidence: `test-results/scroll/performance.json`, `npm run qa:scroll` with no concurrent browser load. 375px: median 16.7ms, p95 16.8ms, one frame >50ms, zero long tasks. 1440px: median 16.7ms, p95 16.8ms, zero frames >50ms, zero long tasks. Hardware GPU utilization was not measured.
