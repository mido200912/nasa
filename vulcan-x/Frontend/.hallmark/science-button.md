# Hero science action · component refinement

Replaced the plain “Explore the science” text link with an outlined secondary anchor: 48px minimum height, readable 16px label, dark-blue-tinted fill, visible blue border, and a separated down-arrow area indicating the lower science section. Existing href #paradox and native anchor behavior remain. No new JavaScript, glow, scale effect or changes to other links/primary CTA. Existing tokens and Barlow family retained.

Hover changes only fill/border; keyboard focus has an immediate outline; pressed state is darker. Reduced-motion stylesheet disables transitions. This is navigation, so no fabricated disabled/loading/error/success button states. Scope: CommandHero link markup, its scoped CSS, dedicated browser tests; existing layout and planet positioning unchanged.

Verified production build/lint/typecheck, six new anchor/hover/keyboard/reduced-motion tests across 320/375/414/768/1024/1440px, seven existing hero layout/overflow tests, and five-width visual QA. Desktop/mobile captures reviewed. Preview refreshed at http://localhost:3001. Critique: P5 H5 E4 S5 R5 V4.
