# Global CSS: file ownership & cascade

Plain CSS, no preprocessor (native custom properties, nesting and `@import` cover the needs).
MUI-specific rules live ONLY in `components/ui/material/index.css` (see the _Styling system /
CSS file ownership_ heading in `docs/ui-material.md`); never move global rules there, nor MUI
rules into `styles/`.

## The manifest: `app/globals.css`

`app/globals.css` contains ONLY an ordered list of `@import "../styles/…"`, imported once by
the true root `app/layout.tsx` (and by `.storybook/preview.tsx`). Turbopack inlines every
import into a single CSS bundle, so there is no extra request.

- The import ORDER IS THE CASCADE ORDER. It reproduces the order of the former single file,
  which is why it is not grouped by folder (`styles/ui/*` sits between `home/showcase` and
  `home/seo-resources`). Never reorder lines to tidy them: an equal-specificity rule moved
  earlier silently loses.
- New file: add its `@import` at the position where its rules must win (usually the end).
  `@import` rules must stay first in `globals.css`, before any rule.
- Do not import a `styles/` file from a component: CSS order would then follow the module
  graph instead of the manifest.

## Which file owns what

Load only the file(s) for the selector you touch. Selector prefixes are BEM blocks.

| File (`styles/…`)          | Owns                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`               | `:root` design tokens (dark default, incl. `--code-*`, `--btn-fg` label, `--scrollbar-*`) and the `[data-theme="light"]` overrides                       |
| `scrollbars.css`           | themed scrollbars on every element, desktop only (standard + `::-webkit-scrollbar*` fallback): see _Scrollbars_                                          |
| `base.css`                 | reset, `html`/`body` (incl. `overflow-x: clip`), sticky-footer skeleton, `.prose`, `.muted`                                                              |
| `layout/containers.css`    | `.container` chain, `.page-shell` + rails, `.section`, `.card`, and the max-width/padding of page blocks (`.hero`, `.showcase`, `.faq`, …)               |
| `layout/ad-slots.css`      | `.ad-slot`                                                                                                                                               |
| `layout/header.css`        | `.site-header`, `.site-nav`, `.brand`, `.brand-tagline`, `.menu-toggle`, `.gh-link` + the mobile squeeze (also hides/compacts limit badge, lang, toggle) |
| `layout/footer.css`        | `.site-footer`                                                                                                                                           |
| `home/hero.css`            | `.hero`, `.pill`, `.scroll-cue`                                                                                                                          |
| `home/roulette.css`        | `.roulette` (rotating hero word)                                                                                                                         |
| `home/showcase.css`        | `.showcase`, `.sg-*` generator mock, `.fld`, `.term-demo`                                                                                                |
| `ui/gauge.css`             | `.gauge`                                                                                                                                                 |
| `ui/icons.css`             | `.ui-icon` draw/ghost/dot, `drawPing` hover on tech icons and `.feature-strip__ico`                                                                      |
| `ui/logo.css`              | `.logo`                                                                                                                                                  |
| `ui/loader.css`            | `.loader`, `.splash-logo`, the `#app-splash` / `body` splash rules                                                                                       |
| `ui/language-switcher.css` | `.lang`                                                                                                                                                  |
| `ui/theme-toggle.css`      | `.theme-toggle`                                                                                                                                          |
| `ui/limit-badge.css`       | `.limit-badge`                                                                                                                                           |
| `home/seo-resources.css`   | `.seo` block: detach-on-scroll video (`.seo-video*`, `.seo-sentinel`, `.video-embed`) and the resource cards (`.article-card`, `.dur`)                   |
| `home/value-props.css`     | `.valueprops`                                                                                                                                            |
| `home/feature-strip.css`   | `.feature-strip` fixed-tier grid                                                                                                                         |
| `home/faq.css`             | `.faq`                                                                                                                                                   |
| `pages/cookie-banner.css`  | `.cookie-banner`                                                                                                                                         |
| `pages/static.css`         | `.static-page` (legal, privacy, cookies, sitemap)                                                                                                        |
| `pages/not-found.css`      | `.not-found`, `.empty-universe` (404)                                                                                                                    |
| `articles.css`             | `.article`, `.article-body` (incl. `hljs-*` code tokens), `.article-feed`, `.article-teaser`, `.latest-articles`, `.entry-comments`                      |
| `a11y.css`                 | `:focus-visible`, the global `prefers-reduced-motion` kill-switch, `.bc-link`, `.toast-region`                                                           |
| `text-tools.css`           | `.diff*`, `.diff-legend`, `.editor-pair`, `.ai-notice`, `.choice-chips`                                                                                  |
| `ui/tabs.css`              | `.tabs`                                                                                                                                                  |
| `ui/terminal.css`          | `.terminal`                                                                                                                                              |

A block can have rules in more than one file (layout constraints in `containers.css`, mobile
squeeze in `header.css`, hover pings in `icons.css`): before changing a selector, search it
across `styles/` (e.g. `rg "\.feature-strip" styles`).

## Scrollbars

`styles/scrollbars.css` themes every scroll area (page and inner panes) from four tokens of
`tokens.css`: `--scrollbar-size` (WebKit fallback width), `--scrollbar-track` (transparent),
`--scrollbar-thumb`, `--scrollbar-thumb-hover` (derived from `--muted` / `--text-2`; the thumb
reaches at least 3:1 on `--bg-0` and the surfaces in both themes). CSS only, no JS library.

- Gated by `@media (hover: hover) and (pointer: fine) and (forced-colors: none)`: touch screens
  keep their native overlay bars, Windows High Contrast keeps the system bars.
- Standard first: `scrollbar-width: thin` + `scrollbar-color` on `*` (width is not inherited;
  colour is set per element so a hovered pane does not brighten the panes it contains). The
  pointer brightens the thumb of the scroll area it is over (`:where(body *):hover`; `html` is
  excluded, being always hovered).
- `::-webkit-scrollbar*` fallback only inside `@supports not (scrollbar-color: auto)` (Safari,
  older Chromium). Chrome >= 121 ignores those pseudo-elements on an element whose
  `scrollbar-color`/`scrollbar-width` is not `auto`, so the guard only makes explicit what Chrome
  already does; in Safari (which knows `scrollbar-width` since 18.2) it resets the width to
  `auto` so the pseudo-elements apply.
- Zero specificity everywhere (`*`, `:where`), and the file sits right after `base.css` in the
  manifest: a component rule (e.g. `.tabs__list`) always overrides it.
- Recolour scrollbars through the tokens ONLY, in `styles/tokens.css`, e.g.
  `--scrollbar-thumb: color-mix(in oklab, var(--accent-1) 55%, transparent);` (and the light
  variant under `[data-theme="light"]`). Never restyle the pseudo-elements per component.
