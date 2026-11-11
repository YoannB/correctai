# Visual, layout & generic animation

## Rotating hero word

Reserve the max width with an invisible ghost span and animate absolutely-positioned in/out
layers; never let the animated text drive layout (it reflows sibling grid columns and resizes
inputs). Give the layers enough line-height/padding and `overflow:visible` so descenders
(g, j, p, y) are not clipped by `background-clip:text`. The interval sets state in its
callback (external system), never in an Effect body.

## Icons (generic SVG)

Draw the contour via `pathLength="1"` + animated `stroke-dashoffset`, with a dotted ghost
outline that stays visible (the "pencil sketch"); the draw cycle returns to `dashoffset:1`
(not `-1`) so the ghost fills the shape and nothing is ever fully blank. Solid marks (e.g.
cookie chips) are rendered as filled `.ui-icon__dot` paths, excluded from the draw/ghost
animation, so the glyph is recognizable at a glance.

## Detach-on-scroll video player

BIDIRECTIONAL but geometry-locked. The trigger sentinel is `position:absolute` at the TOP of
the media (independent of the fixed state), and an in-flow PLACEHOLDER takes the same height
the moment the media goes `fixed`, so the block height is identical in both states and the
sentinel is never displaced by the toggle (no flow↔fixed oscillation). The caption is rendered
OUTSIDE the media component (in flow) so the placeholder equals the media to the pixel. Pinning
fires the instant the top leaves the viewport and un-pins the instant it re-appears. The
embedded iframe is NEVER unmounted to "pause": `everMounted` is sticky-true and play/pause is
driven by the provider postMessage API (YouTube `enablejsapi=1`); the poster shows only until
first mount. The media is sized and centered (normal ≤ 560px, short ≤ 320px), never full-width.
While pinned, `hooks/use-footer-clearance.ts` writes the visible footer height into the CSS
variable `--footer-clearance` (scroll/resize, rAF-throttled, no React state) and the fixed
player's `bottom` adds it, so the player rises above the footer and never hides its links
(Manage cookies, GitHub). The detach sentinel is unaffected (no oscillation).
A SHORT video (the `SEO_RESOURCES` video entry has `short: true`) adds `.seo-video-slot--short`:
the placeholder takes the 9:16 ratio (a 16:9 placeholder under a portrait player made the
content below jump by the height difference on pin) and the player is narrower in flow (200px)
and when pinned (180px, 150px under 900px).
The player is DISMISSIBLE: a `.seo-video-close` button (CSS-only visibility, shown solely under
`.is-pinned`) calls `store.dismissVideo()`, an IN-MEMORY `videoDismissed` flag on
`lib/store.ts` (NOT persisted, NOT hydrated in `getServerState` beyond the `false` default).
Dismissed ⇒ the component forces `pinned = mode === 'fixed' && !videoDismissed`, so the reader
returns to flow at its original slot and never re-pins on scroll; the flag survives SPA
navigation (provider stays mounted) and resets on full reload / F5 (new document ⇒ new store
from the factory). No geometry changes on dismiss (placeholder == media height), so no jump and
no oscillation.

## Container & rails discipline

ONE `.container` layer per content column. Pages already wrapped in `PageShell`'s `Container`
must NOT add a second `.container` on inner blocks (Hero grid, Feature strip, …): double
max-width + double padding crushes the center column and is a top cause of cramped layouts AND
of mobile horizontal overflow. The center column width is governed by the side rails; keep them
symmetric and THIN (160px wide). Never 300+300 (that steals 600px from the content and squeezes
the feature strip). Three SEO resources are listed full-width in a single column (no auto-fill
grid that leaves an orphan gap); horizontal leaderboards are centered (`margin-inline:auto`).

## Site chrome switches

`constants/site.ts`: `HEADER_NAV_ENABLED` (false = no header nav and no burger; the footer and the
HTML sitemap page still list every page), `GITHUB_LINK_ENABLED` (header and footer GitHub links),
`BRAND_ACCENT_FROM` (the brand word is `SITE_NAME[0..n)` plain + the rest in `<b>`, header AND
footer). Optional messages: `nav.tagline` (+ `nav.taglineSub`) render a two-line tagline after
the brand (`.brand-tagline`, hidden below 760px); `footer.poweredBy` (rich tags `<next>`,
`<netlify>`) adds a credits line in the footer meta column. Absent keys render nothing (`t.has`).

## Mobile guards

`html, body { overflow-x: clip }` (clip, NOT hidden: hidden creates a scroll container that
breaks the sticky header and the fixed video). Below 900px the rails are `display:none` and the
header nav becomes an absolutely-positioned dropdown; the video stays `fixed` but is dismissable
(see _Detach-on-scroll_ above) and toasts move to top-center (see _Toasts_ in
`docs/ui-material.md`), so the bottom is free. Header row must not overflow on narrow screens:
below 900px reduce gaps; below 600px hide the header `LimitBadge` and compact the language
switcher (hide the redundant current-locale text via `font-size:0` on `.lang__btn`, restored on
`.lang__flag`/`.lang__caret`); below 480px hide the brand WORD (`.brand > span { display:none }`)
keeping the `Logo`, because the `<Link class="brand">` carries `aria-label={SITE_NAME}` so the
accessible name survives (no a11y regression). This guarantees the theme toggle is never cut off
by `overflow-x: clip`. Clamp the hero title font-size on small screens so the longest rotating
word (nowrap) cannot overflow horizontally. The mobile nav panel is scrollable when taller than
the viewport (`max-height: calc(100dvh - 64px)` with a `vh` fallback, `overflow-y:auto`).

## Ads, bots, and the dev-only reset

Ad slots render placeholders in development and are hidden in production until real tags and
consent exist (`components/ui/AdSlot.tsx`, `ADS_ENABLED`). The cookie banner itself renders
ONLY when a tracker needing consent is configured (`CONSENT_REQUIRED` = GTM id set OR ads
enabled, pure `lib/flags.ts`): no banner theatre on a tracker-free site (CNIL). When it exists,
the footer "Manage cookies" button re-opens it (`reopenConsent`, in-memory; the stored choice
stays in effect until a new one is made) and withdrawing a previous "yes" reloads the page,
because an injected GTM cannot be unloaded. The decision to render is taken SOLELY
on the build-inlined `ADS_ENABLED` constant — NEVER on `typeof window !== 'undefined'` inside an
SSR'd component, because the server (window undefined) and client (window defined) would render
different trees and throw a hydration mismatch (the exact class of bug already killed in
`AdSlot` and the `ENVIRONMENT_FALLBACK` family). When `ADS_ENABLED` is true and real tags/consent
are not wired, the slot renders `null` deterministically on both sides; the rail keeps its fixed
grid width, so there is no CLS. The anti-bot icon from the mockup is NOT rendered. The limiter
reset button is gated by `process.env.NODE_ENV === 'development'` and inlined away in production
builds. Resetting must push an info toast from the click handler (user intent), not from an Effect.

## Tabs, Terminal & scripted sequences (generic, no MUI)

`components/ui/Tabs.tsx`: a tab WITH `href` is a real link inside a `<nav>` (`aria-current=page`)
so the URL stays the source of truth (direct URL, reload, back/forward); a tab WITHOUT `href`
is a `<button aria-pressed>` switching a panel via `onSelect`. Do not turn page navigation into
`role="tablist"`. The active tab is scrolled into view by a DOM-only effect (no state)
that sets the STRIP's own `scrollLeft`: never `scrollIntoView`, which also scrolls the window
and made the home page jump to the showcase on load (guarded in `site-config.spec.ts`).

## Empty state / 404

`app/[locale]/not-found.tsx` shows `EmptyUniverse` (`components/ui`, decorative SVG,
`aria-hidden`, theme tokens, CSS float/twinkle disabled under `prefers-reduced-motion`), the
404 code, a `notFound.text` line and a "back to home" button. Reuse `EmptyUniverse` for any
"nothing here" state rather than drawing a new illustration.
`components/ui/Terminal.tsx`: plain-text lines (never innerHTML) in a `role="log"` live region.
`hooks/use-scripted-sequence.ts` reveals lines on an interval (setState in the interval
callback only) and shows everything at once under `prefers-reduced-motion`. A scripted demo is
a SIMULATION: it must not call `/api/*` nor show AI quota/error states (see the
`TerminalShowcase` demo and `tests/e2e/site-config.spec.ts`).
