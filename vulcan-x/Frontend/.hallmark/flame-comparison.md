# Flame comparison · component redesign

User rejected the blurred orange CSS flame and neon blue ring. Replaced them in place inside FireParadox; existing page, fonts, tokens, planet explorer and native scrolling preserved.

Earth: layered SVG plume, bright inner fuel zone, blue base and two upward convection arrows. Microgravity: softly filled blue diffusion envelope around a small fuel point with four inward arrows. No reticle, crosshairs, concentric grid, blur filter, stock image, new canvas or animation loop. Gradients use existing named tokens; unique SVG IDs come from React useId.

Simplified underlined gravity buttons, sentence-case header and caption, directional annotation and real NASA research link. Both visual states share a stable layout, keyboard buttons and accessible image descriptions. Conceptual/not-to-scale label remains; the spherical case is explicitly idealized still air, not a universal microgravity prediction. Ventilation qualification is visible.

Verification: old reticle regression failed before implementation. Production build/lint/types, 22 unit + 48 browser tests pass. New comparison checks exercise 320/375/414/768/1440px, keyboard toggle, both distinct drawings, unchanged height and reduced motion. Five-width visual QA reports no errors or overflow. Actual desktop/mobile screenshots reviewed for both modes; captured under test-results/visual/flame-*.png.

Component-scope critique: Philosophy 5 · Hierarchy 4 · Execution 4 · Specificity 5 · Restraint 5 · Variety 4. No page/theme rotation or fabricated interactive states.
