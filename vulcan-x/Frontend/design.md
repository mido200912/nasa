# Design — VULCAN-X

Approved design system · 13 November 2026. Preserve this system across future changes rather than rotating themes. This document records current design intent; `app/globals.css` contains the implemented tokens and component styles. Later rules in that stylesheet override several older small-text declarations. Historical `.hallmark/` and `.gsap/` proposals do not override the decisions below.

## Identity and purpose

- **Character:** technical, austere, precise; an atmospheric aerospace workbench, not a generic SaaS dashboard.
- **Audience:** habitat engineers, researchers, and space-science readers exploring combustion hazards.
- **Primary action:** launch the habitat simulator preview. Secondary action: explore the science.
- **Boundaries:** an independent educational demonstrator, not an operational safety tool, live AI service, validated predictive model, or NASA-endorsed product. Keep these distinctions visible.
- **Identity:** retain the VULCAN-X name and flame mark. Use NASA-inspired colors, not NASA insignia, seals, or worm lettering.

## Color system

Near-black canvas, charcoal/navy surfaces, soft off-white reading text, and restrained blue accents. The original orange/cyan branding and intermediate red accents are superseded. VULCAN-X marks, favicon, highlighted data, and risk bars use blue too.

| Role | Canonical token | Value |
| --- | --- | --- |
| Page background | `--color-space` | `#050508` |
| Card surface | `--color-surface` | `#101319` |
| Control surface | `--color-panel` | `#121720` |
| Raised surface | `--color-panel-raised` | `#1A2230` |
| Primary text | `--color-text` | `#EDF0F5` |
| Body copy | `--color-body` | `#C4CBD6` |
| Secondary copy | `--color-muted` | `#A4AEBE` |
| Supporting copy | `--color-quiet` | `#9BA6B8` |
| NASA Blue / primary fill | `--color-nasa-blue`, `--color-accent` | `#0032A0` |
| Primary hover fill | `--color-accent-hover` | `#124FC1` |
| Highlighted text | `--color-accent-readable` | `#9BBCFF` |
| Text on primary fill | `--color-on-accent` | `#FFFFFF` |
| Links | `--color-link` | `#B0C8FF` |
| Focus outline | `--color-focus` | `#7EA6FF` |
| Controls / identity accents | `--color-control`, `--color-signal` | `#6B99FF` |
| Quiet / stronger rules | `--color-line`, `--color-line-strong` | `#FFFFFF14` / `#FFFFFF26` |

Use semantic tokens, not scattered literal colors. `--color-signal-readable` aliases the readable blue. Secondary fills and borders are derived with `color-mix()` in the stylesheet. White is reserved for text on filled blue controls, not large surfaces. Natural planet colors and orange/yellow/blue flame illustration tokens are deliberately independent of UI branding.

## Typography and reading comfort

- **Body/UI:** Barlow, regular 400; medium 500 for labels and subheadings; 600 for primary actions. Fonts are bundled locally in `app/layout.tsx`.
- **Large headings:** Barlow Condensed 500/600, upright. Do not use condensed type for paragraphs, control labels, or dossier values.
- **Technical identifiers/numbers:** system monospace via `--font-mono`, sparingly; use tabular figures where values change.
- **Body:** `--text-body: 1rem` (16px), `--leading-body: 1.65`.
- **Controls/labels:** `--text-label: 0.875rem` (14px). **Captions:** `--text-caption: 0.8125rem` (13px); short scene/footer identifiers may use 12px. Do not restore 5–11px micro-labels.
- Prefer sentence case, comfortable line spacing, and soft off-white/bright secondary grays. Reserve uppercase for short acronyms and identifiers. Keep paragraphs roughly 45–75 characters wide where the layout permits.
- Larger text must drive wrapping and component height. Never shrink text merely to preserve an old fixed-height card.

## Layout and responsive behavior

- Section order: planetary hero → research strip → fire-science comparison → interactive previews → four-engine architecture → footer. Header and footer use edge-aligned branding and restrained navigation.
- Main sections use a centered container up to 1320px, with responsive 24–72px horizontal padding. Prefer a 4px spacing rhythm; common component padding is 20–28px and grid gaps are 24px. Match existing local styles rather than inventing a second spacing system.
- Desktop hero: the scene is 74% of viewport width, starts at **248px**, and retains `clamp(460px, 35vw, 750px)` height. The right dossier starts at **112px**, aligned with the intro, in a column up to `min(22vw, 320px)`.
- Below 1024px, stack the scene and dossier. Let dossier content and expanded notes determine height. Preserve the approved camera framing, label attachment, and planet scale when adjusting surrounding UI.
- Preview grids reflow using a readable 21rem minimum; architecture uses a 14rem minimum and becomes single-column below 640px. Keep headings, copy, controls, and notices inside their containers.
- Use fine 1px rules, mostly 3–4px card corners, and 4px input/button corners. Avoid nested decorative panels and heavy shadows; a subtle shadow is appropriate for a floating dropdown.
- Layer scale: scene `0`, content `5`, navigation `8`, dropdown `12`, skip link `20`.

## Component patterns

### Planetary explorer and dossier

- Eight procedural planets on one tilted elliptical navigation curve. Focus brings the selected planet forward while others recede; this is a curated explorer, not a scale solar-system model.
- No Sun, solar glow, concentric orbital grid, or separate habitat-focus view. Keep the small Moon/ISS markers with Earth.
- Select through planet clicks, in-scene keyboard-operable labels, or drag/swipe. Do not reintroduce planet-tab strips, swipe/pause toolbars, focus counters, habitat selectors, or previous/next arrows.
- The dossier follows the active planet: name/type, plain atmosphere description, four ruled fact rows with inline units, environment note, NASA links, and a native “Reading these values” disclosure. No dot before the atmosphere description, warning-style badge, glass backdrop, or decorative corner brackets.
- Keep planetary reference facts separate from illustrative habitat scenarios. Preserve giant-planet reference-level and retrograde-rotation qualifications. Without WebGL, provide accessible reference selection and descriptions.

### Actions and inputs

- **Primary:** NASA-blue fill, white text, clear verb, minimum 44px target. Hover brightens the fill; do not dim text through opacity-based hover styling.
- **Science action:** outlined, softly blue-tinted secondary anchor, minimum 48px height, 16px label, separated down-arrow area. Keep `href="#paradox"`; it must not compete with the primary launch action.
- **Incident select:** minimal Radix Select with a single-line 48px trigger and three plain 44px option rows: Electrical arc, Smoke detection, Dust contamination. No location subtitles, menu heading, checkmarks, or oversized focus halo.
- Portal the select menu to the body; match trigger width and available viewport space. Preserve keyboard/typeahead/touch behavior, Escape/outside dismissal, focus return, generation-time disabling, and stale-output reset on a new choice.
- Opening the select must not move the page or cards. Preserve the scoped scroll-lock compensation fix in `app/globals.css`; do not disable scroll locking globally.
- Slider values, scripted preview state, and engineering-review notices remain readable and explicitly illustrative.

### Science illustrations

- Use the existing static SVG flame drawings: layered warm upward plume with convection arrows, versus a filled blue diffusion envelope with inward arrows. Simple underlined gravity controls switch between them without layout jumps.
- No blurry CSS flame blobs, neon toruses, crosshairs, concentric reticles, or extra WebGL canvases. Keep the conceptual/not-to-scale label and the visible qualification that ventilation can distort the spherical case.
- Use Lucide consistently for interface icons; hide decorative icons from assistive technology.

## Motion and accessibility

- Ordinary continuous document scrolling only: no wheel interception, section jumps, snapping, chapter navigation, pinned sections, or scroll-driven transforms. Native anchors may scroll smoothly; reduced motion uses immediate navigation.
- Feedback is brief and restrained: approximately 150–180ms using `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`. No bounce, perpetual decoration, page-wide entrances, or text fades. Preserve intentional planet-focus/card transitions.
- Honor reduced motion for focus changes and UI transitions. Use on-demand rendering when reduced motion is enabled, while scrolling, or when the canvas is off-screen/backgrounded; retain DPR caps of 1 mobile / 1.5 desktop.
- Provide immediate visible focus outlines, associated labels, selected/disabled states, semantic links/buttons, and keyboard alternatives. Target WCAG AA: 4.5:1 normal text, 3:1 large text and meaningful control indicators. Do not encode state with color alone.
- Verify at 320, 375, 414, 768, 1024, and 1440px; check 200% text sizing, expanded disclosures, dropdown opening/closing, WebGL fallback, and reduced motion. No clipped text, horizontal overflow, or layout shifts.

## Implementation and maintenance

### Command-center extension

- `/dashboard`, `/dashboard/playbook`, `/dashboard/earth-bridge`, and `/dashboard/materials` reuse the palette, typography, spacing, 4px corners, fine rules, and accessibility principles above. Dashboard-specific styles live in `app/dashboard/dashboard.css`; no alternative theme is introduced.
- Use a quiet left navigation rail and shared telemetry header. Below 900px, the rail becomes a top bar with a disclosure button for the module links. Simulator and chart columns stack for readable content; data tables may scroll inside their own container, never the page.
- Dashboard selects use the same 48px, body-portaled control pattern and scoped scroll-lock compensation. Enlarged text can wrap dashboard controls; the landing incident picker retains its approved single-line presentation.
- The landing fire comparison stays SVG-only. The simulator route may own one procedural combustion canvas, never simultaneously with the landing canvas. Retain the 1 / 1.5 DPR cap, reduced-motion/offscreen/background/scroll suspension, and accessible SVG fallback. No extra decorative canvases or scroll entrances.
- Preserve the restored solid-flame visual style. All four simulator inputs visibly affect the illustration: oxygen and pressure change size/brightness, gravity changes diffusion/plume shape and elongation, and material changes synthetic size/intensity/motion. Keep mappings bounded within the viewport and label them as exaggerated, uncalibrated teaching cues. Reduced motion freezes animation, not input feedback; the SVG fallback responds too.
- Charts use readable blue versus neutral/dashed baseline marks, textual summaries, and no entrance animation. Synthetic curves, risk/ignition/toxicity indices, and user-assumed Earth-impact targets must be qualified directly beside their displays.
- Playbooks are checkable engineering-review outlines, not operational protocols. Keep simulated-streaming labels, generation locking, cancellation, stale-output invalidation, and context/limitations in exports. Missing empirical properties stay uncurated; reading links never masquerade as retrieved evidence.

Token source and Tailwind v4 mappings: `app/globals.css` (`:root` and `@theme inline`). There is no separate `tokens.css`; reuse these token names rather than creating competing exports. Component owners: `components/CommandHero.tsx`, `components/canvas/`, `components/FireParadox.tsx`, `components/EnginePreviews.tsx`, and `components/SystemArchitecture.tsx`.

For UI changes, run build/lint/typecheck, relevant unit/Playwright tests, and `npm run qa:visual`. Check the select against both classic Windows and overlay scrollbars. `PRODUCT.md` supplies product context; `README.md` documents running and verification; `.hallmark/` and `.gsap/` retain iteration history, not alternative active themes. This documentation does not authorize unrelated redesigns, dependency upgrades, or changes outside `vulcan-x/Frontend`.
