# Incident picker · custom select

## Scroll-lock correction · Verified
User reported cards shifting left on opening. Reproduced in headed Windows Chromium with classic 15px scrollbars: root overflow-x:clip retains the scrollbar while react-remove-scroll adds another 15px body margin. Centered cards moved left 7.5px. Overlay-scrollbar headless Chromium did not reproduce it.

Scoped `body[data-scroll-locked]:has(.scenario-menu)` to cancel only that duplicate right margin; kept Radix scroll lock, focus handling and viewport scrolling protection. No global scroll unlock or layout redesign. Regression tests measure all three card x positions/widths and page scroll before/open/close by Escape and selection in both actual Windows classic-scrollbar and overlay modes. Classic test failed first, both now pass. Production build/lint and all eleven picker tests pass. Local production endpoint returns HTTP 200; in-app browser refresh returned a separate 502 gateway error, so no successful connected-preview refresh is claimed. Windows-specific headed regression skips on non-Windows hosts.

## Latest · Simplified at user request
Single-line 48px trigger, three plain 44px option rows, small chevron and restrained active highlight. Removed location subtitles, menu heading, checkmarks and decorative spacing. Radix accessibility/portal/keyboard/touch and generation-lock behavior retained. This supersedes the two-line design below. New compactness assertions failed before changes; production build/lint, all nine picker tests and five-width visual QA pass after simplification. Updated open menu capture reviewed.

Replaced the native OS select with @radix-ui/react-select, scoped inside EnginePreviews. No general-purpose form framework or page rebuild. Existing scenario keys and response steps remain; display labels split into incident title and location.

Design: 72px dark trigger, 16px title/13px location, blue open border, compact chevron; portaled charcoal menu with three two-line choices, selected checkmark and visible keyboard highlight. Focus outline is immediate and not the oversized browser dropdown ring. Native label association plus ARIA descriptions expose incident/location. Default, hover, focus, pressed, selected/open and disabled states are covered. No fabricated error/loading UI; streaming disables selection as before. Reduced-motion rules cover the chevron transition.

Behavior: controlled scenario value; library owns focus/keyboard/typeahead, scroll buttons and collision-aware portal positioning. Escape/outside pointer dismiss without committing; selection returns focus to trigger and resets stale output. Tab proceeds from closed trigger to generate. Menu dimensions follow trigger and available viewport; long text wraps for text zoom. The body portal prevents overflow clipping by cards. No custom wheel interception.

Validation: before implementation, custom listbox test failed on the native select. Production build/lint/types, 22 unit + 73 browser tests pass. New tests cover five widths, selection/output wiring, Home/End/arrows/typeahead/Enter/Escape/Tab, outside dismissal, generation disable/stop unlock, touch and 200% text sizing. Keyboard assertions wait for actual focus changes rather than fixed delays. Five-width visual QA passes; open menus/trigger reviewed at desktop/mobile. Screenshots saved as test-results/visual/scenario-*.png. Install reports the same nine pre-existing development advisories; no unrelated upgrades applied.

Critique: P5 H5 E4 S5 R5 V4. Preview: http://localhost:3001/#engines.
