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
| `tokens.css`               | `:root` design tokens (dark by default) and the `[data-theme="light"]` overrides                                                                         |
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
| `articles.css`             | `.article`, `.article-body`, `.article-feed`, `.article-teaser`, `.latest-articles`                                                                      |
| `a11y.css`                 | `:focus-visible`, the global `prefers-reduced-motion` kill-switch, `.bc-link`, `.toast-region`                                                           |
| `text-tools.css`           | `.diff*`, `.diff-legend`, `.editor-pair`, `.ai-notice`, `.choice-chips`                                                                                  |
| `ui/tabs.css`              | `.tabs`                                                                                                                                                  |
| `ui/terminal.css`          | `.terminal`                                                                                                                                              |

A block can have rules in more than one file (layout constraints in `containers.css`, mobile
squeeze in `header.css`, hover pings in `icons.css`): before changing a selector, search it
across `styles/` (e.g. `rg "\.feature-strip" styles`).
