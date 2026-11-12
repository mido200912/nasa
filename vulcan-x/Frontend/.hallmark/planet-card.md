# Planetary dossier · component redesign

Scope: the existing CommandHero card and its styles only; no page/scene rebuild. Preserve the existing Barlow/Barlow Condensed fonts and space-black/cyan/orange tokens. Audience: space-science readers; job: compare a selected planet's reference facts; tone: technical, austere, precise. Component-scope: no macrostructure or theme rotation.

Structure: dossier label/index → planet name/type → neutral atmosphere description → four ruled fact rows → plain-language environment note → reference context/links → native measurement-notes disclosure. Existing data and NASA provenance are unchanged. Giant-planet 1-bar levels and retrograde rotation remain in the disclosure. No fake live status, illustration, warning badge, glass backdrop, or decorative corner marks.

Interactions: direct scene click/keyboard/drag selection updates the card; native details works with keyboard and without JavaScript. Source links retain 44px targets, immediate focus outlines, hover and active states. Passive card has no invented loading/error/success controls. Existing reduced-motion rules cover card transitions and the disclosure chevron. Desktop aligns with the current hero heading; mobile content determines height. Removed control strips and native continuous scrolling remain unchanged.

Critique: Philosophy 5 · Hierarchy 5 · Execution 4 · Specificity 5 · Restraint 5 · Variety 4.

Verification: production build/lint/typecheck, 22 unit tests and 43 browser tests pass. New dossier tests cover 320/375/414/768/1024/1440px, inline fact rows, expanded details containment, keyboard source focus, and Jupiter/Venus measurement qualifications. Existing all-eight-planet/card, touch/drag, fallback and native-scroll regressions remain green. Five-width visual QA reports no clipping, overflow or wrapped controls. Card screenshots visually reviewed at desktop/mobile. Measured WCAG text contrast on the opaque surface ranges from 5.41:1 (quiet index) to 18.73:1 (primary text); links are 11.40:1. Live preview refreshed at http://localhost:3001.
