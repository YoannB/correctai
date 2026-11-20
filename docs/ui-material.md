# Material UI adapter, theme & controls

## Boundary

`@mui/*` imports, MUI types, the MUI theme, `sx`, `styled`, and `.Mui*` selectors exist
ONLY inside `components/ui/material/`. Elsewhere consume the neutral API from
`components/ui` and types from `components/ui/types.ts`. The neutral API must never leak
`sx`/`classes`/`slotProps`/`MuiTheme`. Business layout must not depend on MUI-generated
class names; use application CSS classes and `--*` custom properties. ESLint
`no-restricted-imports` forbids `@mui/*` outside the adapter (it guards the import, not the
prop-leak — that is on you).

## MUI theme build & light mode

`buildTheme(mode, palette = PALETTE[mode])` takes the RESOLVED light/dark value (never a
hardcoded `'dark'`) and the site's colours (`constants/site.ts` `PALETTE`: `primary`, `secondary`,
`contrastText` = text on the primary). `palette.background.default` and `paper` are `transparent` (a hardcoded dark + opaque
CssBaseline background is what previously broke light mode), AND the `MuiCssBaseline`
`styleOverrides` re-point `body` at `background-color: var(--bg-0); color: var(--text-1)`:
CssBaseline's own `body` rule (`--mui-palette-background-default` = transparent,
`--mui-palette-text-primary`) is injected AFTER `styles/base.css` and used to erase `--bg-0` and,
with a palette of the other mode (Storybook), paint the text white on light. Tokens stay
authoritative. The primary (gradient) button label is the `--btn-fg` token, not the palette. Light mode = a TINTED background (`--bg-0`
soft blue-grey, not white) with white shadowed cards; accent glow reduced via `--glow`.
Tokens in `:root` / `[data-theme="light"]` are the single source of truth for colors.
`defaultChannel`/`paperChannel` are explicitly `undefined` (MUI v9 cannot derive a channel
from `'transparent'`; omitting them kills the `palette.*Channel` warning while
`styles/base.css` keeps control of backgrounds).

## Disabled buttons without a painted background

MUI applies `disabledOpacity` 0.38 to `primary.main` (#7c5cff); on a light background
(`--bg-0` light #dfe5f0, or a white card) an `outlined`/`text` button collapses to ~1.5:1 —
an invisible ghost. The adapter overrides ONLY those two variants in the disabled state
(`&.MuiButton-outlined.Mui-disabled, &.MuiButton-text.Mui-disabled`) to `color: var(--muted)`

- `borderColor: var(--border-2)` + `opacity: 1`, at compound specificity 0,3,0 (wins WITHOUT
  `!important`). The `contained` (primary) variant is EXCLUDED (MUI already paints a grey
  `action.disabledBackground`). Use runtime-resolved `var()` for color/borderColor (NOT a MUI
  palette channel, which cannot derive from `var()` and re-triggers the warning); runtime
  resolution is identical server/client → no hydration mismatch, follows both themes.

## Button as a link (`href`)

Never wrap a `Button` in an `<a>`/`Link` (interactive content inside interactive content is
invalid HTML: two tab stops, ambiguous role). Pass `href` instead: the adapter hands it to
MUI's `LinkComponent`, so the root is a real `<a>` with the SAME classes (halo, gradient,
hover, disabled rules unchanged). An internal pathname (typed `AppInternalHref`, from
`i18n/routing` pathnames) goes through next-intl's `Link` (localized URL); `https:`/`http:`/
`mailto:` stays a plain `<a>`. A disabled/loading link drops its `href` and falls back to a
`<button disabled>` (not focusable, not navigable). `type` is ignored in link mode. E2E guard:
`tests/e2e/button-link.spec.ts` (no `a button` in the hero / 404, keyboard Tab + Enter).

`external` (link mode only; a type error without `href`) opens the link in a new tab: the
adapter adds `target="_blank"` + `rel="noopener noreferrer"` (the neutral API exposes only the
boolean, never raw `target`/`rel`) and appends a visually hidden, localized "(new tab)"
(`common.newTab`, a client namespace) to the content, or to `ariaLabel` when one is given. Only
an ACTIVE external link reads next-intl, so every other `Button` still renders without an intl
provider. No icon is added: the app has no "open in new tab" glyph, and `iconRight` stays
available to a caller that wants one. A disabled/loading external link is a disabled `<button>`
like any other link (no target, no hint).

## Busy button (`busy`)

`busy` (action mode only; a type error with `href`) is for a long action during which the button
must KEEP the focus (a native `disabled` button drops it, sending keyboard and screen-reader users
back to `<body>`). It renders `loading`'s spinner and look (the `Mui-disabled` class carries MUI's
disabled styles and the contrast rule above) with `aria-disabled="true"` + `aria-busy="true"`,
WITHOUT the `disabled` attribute; clicks, Enter and Space are swallowed (`preventDefault`:
`onClick` is not called, a submit button does not submit). `loading` is unchanged (native
`disabled`, focus lost) and wins over `busy`, as does `disabled`. Unit guard:
`tests/unit/button.test.tsx`.

## MUI-control animations (no geometry on hover)

- Buttons: NEVER translate/scale on `:hover` (moving the box changes the pointer hit-area →
  endless hover/un-hover oscillation). On hover change only non-geometric properties
  (box-shadow, filter) and disable the idle halo animation so it does not override the hover
  shadow. Keyframes live in `material/index.css` and are referenced by `sx` (sx cannot
  define `@keyframes`).
- Field border: a FULL conic gradient (accent-1 ↔ accent-2 over 360°, no transparent stops)
  animated through `@property --angle`; the MUI outline stays underneath as the fixed border
  when unfocused. An arc with hard stops projects as a variable-size blob — do not use.
- Gauge hover: a `drop-shadow` FILTER + value/track color shift, NEVER a box
  transform/scale/translate (same endless-oscillation invariant). A filter does not move the
  layout box, so the pointer stays covered.
- Dialog close icon: a DEDICATED `crossDraw` keyframe (1 → 0, `forwards`) so the X draws and
  stays; never reuse the looping icon `draw` keyframe (it ends at `dashoffset:1` = erased).

## Chips

In a CSS grid, force `justifySelf`/`alignSelf: start` so a chip does not stretch to 100% of
its cell, and give it a tinted background per color (pill style). Confine `sx` to the adapter.

## Toasts

Severity backgrounds use TWO-class specificity (`.MuiAlert-root.MuiAlert-filledXxx`) so the
global `.MuiPaper-root { background }` rule cannot wash them to the surface color (the
light-mode white-toast bug). Anchored BOTTOM-LEFT on desktop (the sticky video owns
bottom-right) with a vertical offset clearing the Netlify badge. On mobile (≤ 900px) they
move to TOP-CENTER just under the 64px header so the two fixed layers never overlap — done
in CSS inside the adapter (`@media (max-width:900px) .MuiSnackbar-root { top:76px; bottom:auto;
left:0; right:0; width:fit-content; max-width:calc(100vw - 32px); margin-inline:auto; }` with
`!important` on every layout prop, because `.MuiSnackbar-anchorOriginBottomLeft` shares
specificity 0,1,0 with `.MuiSnackbar-root` and Emotion's injection order vs the static sheet
is not guaranteed). Centering uses `margin-inline:auto` + `width:fit-content`, NOT `transform`
(so MUI's `Grow`, which animates the child, is preserved). Deliberately CSS, not a responsive
`anchorOrigin` via `useMediaQuery`: `useMediaQuery` returns `false` at SSR then the real value
at hydration, which would flip the `.MuiSnackbar-anchorOrigin*` classes between server and
client → hydration mismatch. The Snackbar portals to `body` (default `disablePortal=false`)
and `body`/`html` carry no transform/filter, so `position:fixed` stays viewport-referenced.
Long messages wrap (`max-width` + `white-space:pre-wrap`).

## Styling system / CSS file ownership

General CSS in `styles/**` (imported in cascade order by the `app/globals.css` manifest; which
file owns what: `docs/styles.md`) using `--*` custom properties (`styles/tokens.css`), themed via
`[data-theme="light"|"dark"]` on `<html>`. MUI-specific CSS ONLY in
`components/ui/material/index.css`. The MUI theme reads the same CSS variables so light/dark
has a single source of truth. `@property --angle` drives the rotating field border. Respect
`prefers-reduced-motion` (global kill-switch in `styles/a11y.css`).

## MUI v9 authoring rules & integration entry

The App Router integration entry point for Next 16 is `@mui/material-nextjs/v16-appRouter`
(with `@emotion/cache` + `AppRouterCacheProvider`); do NOT default to a `v15-appRouter`
import from training data. Keep `AppRouterCacheProvider` so Emotion styles are collected
during streaming, and check CSS layer order if you ever mix plain CSS / modules / Tailwind.

When authoring adapter styles, do NOT use deprecated class keys in `styleOverrides` (e.g. the
old `.MuiTypography-paragraph` form); configure by `slot` and/or `variants` driven by props.
Slot names are CASE-SENSITIVE in the public API — follow the installed type exactly
(`slotProps={{ inputLabel }}`, not `{{InputLabel }}`), and migrate `inputProps`/`inputRef` to
the dedicated `slotProps` only where the component documents it (never blanket-transform
every form API). For selectors inside the adapter, PREFER the exported class helpers
(`buttonClasses`, `alertClasses`, …) over hand-written `.Mui…` strings, which are fragile
across versions. EXCEPTION, do not regress it: the existing disabled-button fix
(`&.MuiButton-outlined.Mui-disabled, &.MuiButton-text.Mui-disabled`) is validated at
compound specificity 0,3,0 and stays as-is; the "prefer exports" rule applies to NEW
selectors only. Run MUI codemods TARGETED (e.g.
`npx @mui/codemod@latest deprecations/button-classes <path>`), read the diff, and run tests —
never codemod the whole repo without review.

A neutral wrapper must PRESERVE accessibility: do not drop ARIA attributes or native behavior
when encapsulating a MUI control behind the facade (v9 emphasizes keyboard navigation and
a11y defects; the facade is exactly where that is easiest to lose by accident).
