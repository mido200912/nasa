# P01 · Hero descent

R7 FINAL: Descent removed. Hero/explorer container stays steady during native continuous scrolling. Curved planet focus/card and drag interactions, DPR caps and scroll/off-screen render suspension preserved. Production 34-browser/22-unit suite and responsive QA pass. The original phase below is historical.

Status: Verified. Three descent geometry tests, three browser checks (return-to-top, live reduced motion, actual mobile canvas suspension), and lint pass.
Files: app/page.tsx; new components/motion/ScrollExperience.tsx and lib/scroll-motion.ts; canvas/OrbitalSystem.tsx, SolarSystemScene.tsx; targeted tests.
Use desktop-only scrub to move/fade intro and outer telemetry position, leaving motion.aside ownership alone. Dispatch imperative progress on the hero element; canvas group reads it without React per-frame state. Keep orbit labels in sync via world matrices. Observe actual canvas for render suspension.
Mobile: disable scrub/depth; retain touch gestures. Reduced: static/reset progress; no permanent compositor promotion.
Validation: hero transform/return, all active-planet controls, canvas below fold, reduced preference switch, one context.
