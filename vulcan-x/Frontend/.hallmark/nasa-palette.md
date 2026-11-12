# NASA-inspired dark palette

## Latest follow-up · Blue identity and data
User reports VULCAN-X and some data still look unchanged. These were the deliberately red accents in the intermediate palette. Switch all visible identity/signal roles to blue: header/footer logo flame and -X, favicon, illustrative scenario data, risk labels/bars, habitat status and Earth-comparison cue. Main primary buttons remain NASA Blue with white text. Physical planet/flame hues remain unchanged. The blue-only UI direction supersedes red-role assignments and contrast measurements below. Updated tests first reproduced the red mark, then assert blue identity/data as well as the existing dark/contrast checks.

Follow-up verified: production build and all three theme checks pass; five-width visual QA passes without overflow/errors. Desktop screenshot confirms blue icon/-X and light-blue data accents; live preview refreshed. Identity/control tint has 6.58:1 contrast on the raised dark surface.

User requested replacing orange interface branding with NASA colors while retaining the dark design. Palette-only change: preserve layout, typography, planet positioning/card, controls, scientific content and native scrolling.

## Reference and roles

NASA's current Brand Guidelines link to the official insignia color guide:
- https://www.nasa.gov/nasa-brand-center/brand-guidelines/
- https://www.nasa.gov/wp-content/uploads/2023/07/nasa-insignia-colorguide.png

The guide specifies NASA Blue #0032A0 and NASA Red #E4002B. Older web palettes use different values; this implementation follows the current guide. The project uses these colors as inspiration only, not NASA's insignia, worm or seal.

Reference tokens feed semantic roles: blue primary action/white on-accent text; lighter blue links, focus and control tints; red identity and risk fills; light-red explanatory risk text. Existing black/navy surfaces, body text and semantic green status are preserved. The favicon remains VULCAN-X's own flame, now red. Hover buttons brighten their blue fill without making text translucent. Outlined actions stay neutral.

Physical illustration tokens are separate: Earth's flame remains orange/yellow/blue; the microgravity envelope retains its blue/cool highlight; planetary shaders are unchanged. Only comparison controls/flow cues follow the new UI palette.

Verification: theme regression reproduced the old orange primary button before implementation. Production build/lint/types, 22 unit + 51 browser tests pass. New theme tests cover default/hover primary text contrast, focus contrast, preserved dark surfaces, red brand/risk accents, light-blue source-link contrast and unchanged physical plume colors. Five-width visual QA at 320/375/414/768/1440px reports no errors, overflow, clipped cards or wrapped controls. Desktop hero and mobile full-page renders visually inspected; planet position and all approved layout/interaction work remain unchanged. Preview refreshed at http://localhost:3001.

Measured WCAG contrasts: primary white/blue 10.69:1; hover 7.21:1; source links/surface 11.68:1; focus/dark 8.52:1; slider control/raised surface 6.58:1; large red identity/dark 4.20:1; risk text/surface 8.16:1; red risk bar/track 3.74:1. Exact red is used only for large identity text and non-text marks; smaller red text uses a lighter accessible tint.
