# Reading comfort · approved typography/contrast pass

User reported tiny dim words and poor eye comfort, especially in interactive preview cards and architecture. User approved a readability pass, not a page redesign.

Preserved: blue/white NASA-inspired accents, near-black background, Barlow font family, current 248px desktop scene top/size, curved planets, dossier information/links, approved SVG flame illustrations, interactions and native scrolling. Surface tokens gently lifted to charcoal/navy; primary text softened to #EDF0F5 and body/secondary/caption grays raised to #C4CBD6/#A4AEBE/#9BA6B8.

Shared rem type scale: body 1rem/1.65 leading, labels .875rem, captions .8125rem (12px for short scene/footer identifiers). Sentence-case prose/UI labels in regular Barlow; monospace mainly for numeric/short technical identifiers. Condensed face retained for large display headings, removed from dossier numeric rows. Controls/selects remain readable and keyboard accessible.

Content adjustments only: uppercase section/demo/control/status labels become sentence case; scientific/service boundaries stay explicit. Space-experiment label says context rather than implying live telemetry. Architecture statuses and warning qualifiers preserved. No data values invented or changed.

Layout: content-sized preview cards and min-width responsive preview/architecture grids; single-column architecture at small phone widths; native 200% text-sizing reflow verified for previews/architecture. Desktop dossier is now an in-flow grid item, aligned at 112px beside intro; its natural height determines hero height including expanded notes. Canvas geometry remains absolute/unchanged. Hero-removal regression measures blank space below the taller of scene/card instead of incorrectly treating the enlarged dossier as empty space.

Validation: readability regression first reproduced 12px body copy. Build/lint/typecheck, 22 unit + 58 browser tests pass. Six-width reading checks at 320/375/414/768/1024/1440 verify body/caption sizing, leading, regular body face, no inner text overflow and expanded-card containment; separate 200% text sizing check exercises preview inputs/bridge. Existing full interaction/planet/flame/theme/scroll/fallback suite green. Five-width visual QA reports no errors, clipped cards, overflow or wrapped controls. Desktop/mobile preview, architecture, hero and dossier captures visually reviewed.

Text contrast on the lightest raised surface: body 9.78:1, secondary 7.13:1, caption 6.49:1, primary 13.98:1. NASA-blue button contrast remains verified by theme tests. No claim of universal eye comfort; this is a user-reviewable trial. Critique: P5 H5 E4 S5 R5 V4.
