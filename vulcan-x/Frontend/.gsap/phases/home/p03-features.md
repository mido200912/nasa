# P03 · Research into readiness

R7 FINAL: No scroll entrances or bridge travel/connector scaling. Steady content, normal continuous scrolling; sliders, translation modes and scripted streaming preserved. Production tests and responsive QA pass. The original phase below is historical.

Status: Verified. Wrapper reveals release will-change after completion; slider updates and bridge mode switch remain operable. Five scroll-motion browser tests, lint and strict types pass.
Files: EnginePreviews.tsx; ui/Reveal.tsx; ScrollExperience.tsx; tests.
Replace the three generic Framer entrance effects with GSAP-owned wrappers, preserving their existing DOM/layout. Sequence heading, cards and translation diagram. Do not animate slider fill nodes or streaming text.
Mobile: short individually triggered entrances, no long stagger. Reduced: instantly static.
Validation: sliders, mode switch, scenario generation/stop/reset, anchor focus, no input obstruction.
