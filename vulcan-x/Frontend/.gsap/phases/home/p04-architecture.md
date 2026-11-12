# P04 · Connected architecture and verification

R7 FINAL: No scroll effects, chapter minimum-height wrapper or fixed navigator. Architecture/footer retain normal document flow. Build/lint/types, 22 unit + 34 browser tests, five-width visual QA and isolated scroll QA pass. The original phase below is historical.

Status: Verified. Scale-based signal segments respect the existing responsive grid. Production build, lint, strict types, 25 unit tests and 32 browser tests pass. Five-width visual checks pass; isolated renderer/RAF sampling has ~16.7ms median frame intervals on desktop/mobile and zero observed long tasks. No hardware GPU-utilization claim.
Files: SystemArchitecture.tsx; ScrollExperience.tsx; globals.css; QA script/docs/tests.
Draw connected signal segments using scaleX as stages enter. Retain the current four-stage semantic grid (2/4 columns responsively) and honest planned/demo labels; no new vertical-layout rewrite. Footer static.
Mobile: no pin/scrub; short stage entrances. Reduced: complete connector and visible stages.
Validation: all widths, motion preference changes, no JS, no stale transforms on resize, production suite/build; renderer profiling without pretending to measure GPU hardware utilization.
