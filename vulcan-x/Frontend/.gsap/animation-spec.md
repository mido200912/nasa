# VULCAN-X · Mission descent

## Current direction · supersedes the original proposal below
UI follow-up: user removed the planet-tab strip/scale note, swipe/pause/focus-counter row and habitat navigation/arrows completely. Their markup/styles/reserved space are gone. Select planets directly in the scene (click/keyboard labels/drag/swipe); keep the active card and ordinary continuous scrolling. Only the WebGL-unavailable fallback provides a compact reference chooser. This supersedes older requirements to preserve separate habitat/planet control strips.

R7 FINAL: User requested removal of section animation. Native continuous scrolling at every viewport and motion preference; no wheel interception, section jumps, snapping, chapter layout/navigation or scroll-linked scene/flame/bridge effects. Preserve the approved curved eight-planet explorer, active card, habitat/drag/touch controls and interactive focus transitions. Retain DPR caps, scroll-time and off-screen rendering suspension. Native anchors remain smooth except under reduced motion. All R1–R6 direction below is historical.

R6: Use a synchronous capture-phase wheel listener independent of screen size, pointer type, reduced motion or async library loading. Any nonzero vertical wheel delta goes to the adjacent section; group momentum, ease for 700ms or instantly under reduced motion. Native touch/keyboard/scrollbar, browser zoom, form controls and nested scrolling stay usable. Cancel animation on pointer/key/resize/preference changes. Lenis removed. Section input should not silently fall back to ordinary wheel scrolling. This supersedes all older wheel-gating rules below.

R5: User clarified desktop wheel down means NEXT SECTION START, wheel up PREVIOUS SECTION START. No intermediate stops inside tall sections. Keep smooth transition, one gesture/momentum grouping, chapter links, scrollbar/keyboard access, native mobile and reduced motion. R4's tall-section paging is superseded.

R4: User now wants section-by-section scrolling. Four viewport-minimum chapter wrappers; desktop wheel gestures navigate one chapter (or one readable page inside an oversized chapter), with 800ms easing and momentum grouping. Accessible direct chapter links/current-section markers. Native touch and reduced motion use proximity snapping, never trapped inner scroll boxes. Retain planet/card interaction and existing graphic effects. This supersedes R3's free wheel-glide behavior.

R3: Connected preview inspection confirmed motion was enabled, not reduced, but small and easy to miss. Desktop scene container now visibly translates -130px/scales to 84% across the first 760px scroll. The entire science display arrives from +112px/86% through a sustained view range (+64px mobile). Heading/telemetry/feature-card transforms stay untouched. Canvas measurement uses untransformed offset dimensions and no scroll resize listener, so CSS scene motion does not resize WebGL. Keep R2 wheel glide and R1 draw/DPR budgets. Record actual scrolling for user-visible evidence.

R2: User explicitly selected both smooth/gliding scrolling and visible scroll-linked graphics. Add desktop/fine-pointer Lenis wheel easing (native document container, anchors/keyboard preserved; native touch/reduced motion). Use CSS view timelines for clearly visible flame growth and space-to-Earth diagram travel, with a once-only observer fallback. No text/card entrances, no hero fading, no 3D scroll transforms. Retain R1 rendering suspension and DPR caps. The R1 description and original proposal below are historical.

User rejected both visual treatment and lag. Remove full-page reveal choreography, text fading, scroll-driven Three.js transforms, and GSAP runtime. Native scrolling with steady readable content; only the flame graphic settles once by 2% over 320ms. Reduced motion skips that effect. Continuous WebGL pauses during scroll gestures; DPR capped to reduce shader pixel load. Keep planet focus/telemetry, geometry, and controls unchanged. Historical proposal below is retained for context, not as an active instruction.

- Workflow: gsap-refactor; route `/`; scope exclusively `vulcan-x/Frontend`.
- Approved direction: cinematic, restrained mission descent; GPU-friendly rendering, not synthetic GPU load.
- Preserve layout, fonts/tokens, eight procedural planets, active planet card, drag/touch/keyboard controls, flame tabs, sliders, previews, source disclosures.
- Native document scrolling. No Lenis, pinning, scroll interception, perpetual decorative animation, or second canvas.
- Desktop/fine pointer: scrubbed hero exit with subtle actual Three.js depth/rotation; science diagram emergence; controlled feature sequences; architecture signal connections.
- Mobile/coarse pointer: short one-time entrances only; no parallax, 3D scroll movement, pinning, or scrub. Architecture retains its real 2/4-column responsive grid, with short horizontal signals per stage rather than introducing a new stacked layout.
- Reduced motion: static readable content; no scroll transforms; switch live without reloading.
- Progressive enhancement: default HTML is visible, including without JavaScript. Entrance opacity never below 0.55; no hidden-state stylesheet.
- Ownership: GSAP owns scroll wrappers; Framer Motion retains only interactive state transitions. Never animate the same node with both.
- Performance: transform/opacity first, no animated layout/filters/shadows, temporary compositor hints, <20 live scroll triggers, no per-scroll React state, actual canvas intersection/visibility suspension.
- Dependencies: GSAP lazy-loaded by client-only scroll coordinator; no extra React animation wrapper dependency.
- Missing decisions: none; user approved the proposed sequence and GPU-friendly implementation.
