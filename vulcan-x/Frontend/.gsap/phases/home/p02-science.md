# P02 · Fire science transition

R7 FINAL: All scroll-driven panel/flame arrival effects and fallback removed. Native section flow; gravity tabs remain interactive and content visible with no JS/reduced motion. Verified in production browser suite and responsive QA. The original phase below is historical.

Status: Verified. Flame emergence and both gravity modes pass browser regression; hero/mobile/preference regressions remain green. Independent wrapper avoids CSS transform collisions.
Files: FireParadox.tsx; ScrollExperience.tsx; scoped CSS/tests.
Staged copy entrance then comparison/flame emergence. Use a dedicated inner motion wrapper so the Earth/microgravity CSS transforms are never overwritten. No animated blur or shadow.
Mobile: shorter entrances, no scrub. Reduced: no transform; all tabs/readability unchanged.
Validation: visible flame, tab interactions, scroll entry/return, no content hidden without JS.
