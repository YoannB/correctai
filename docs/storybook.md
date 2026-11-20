# Storybook (10, ESM-only) — component contract & visual states

Storybook is a VERIFICATION pillar, not a runtime dependency: the application must never be
linked to Storybook at execution time (no import of `.storybook/**` or `*.stories.*` from
`app/**` or `components/**` business code). `npm run storybook:build` is part of the
definition of done.

## ESM-only configuration

Storybook 10 ships ESM-only. `.storybook/main.ts` and every associated config MUST be valid
ESM: no `require`, no `module.exports`, no CommonJS-derived addon config. Node 24 satisfies
the ESM-loading requirement. The framework is `@storybook/nextjs-vite`; addons in use are
`@storybook/addon-docs` and `@storybook/addon-a11y` (declared in `main.ts`).

## What each component story must cover

Document the PUBLIC neutral API (the facade from `components/ui`), not the MUI internals: a
story imports `../Button`, never `@mui/material/Button`. Cover every meaningful STATE, not
just the happy path — at minimum `loading`, `disabled`, and `error` where they exist, plus
dialog/toast variants. Verify KEYBOARD operation and ACCESSIBILITY states (the a11y addon
runs here); a wrapper that loses ARIA or native behavior (see the _MUI v9 authoring rules_
heading in `docs/ui-material.md`) must fail the story review, not ship.

## Theming parity (light / dark)

The decorator in `.storybook/preview.tsx` mounts the app providers and exposes a Theme
toolbar (`globalTypes.theme`) that drives `data-theme` on the canvas container, so light and
dark are toggled from the toolbar rather than hardcoded. `layout: "fullscreen"` makes the
painted container fill the canvas (no white border from the default `centered` layout).
The toolbar mode is also passed to `StorybookProviders mode={…}`, which builds the MUI theme
for THAT mode (`buildTheme(mode)`, `PALETTE` from `constants/site.ts`), like the app does; the MUI
primary hex stays a palette value (MUI does not read `var()` for those). Do not "fix" that by leaking
`var()` into a MUI palette channel (it cannot derive one and re-triggers the
`palette.*Channel` warning).

## Story assets

Stories never point at site content (`public/articles/**`, demo content that a site replaces):
Storybook-only files live in `.storybook/assets/`, served under `/storybook-assets/`
(`staticDirs` in `.storybook/main.ts`), e.g. `/storybook-assets/story-cover.svg`.

## CSS side-effect imports (TS2882)

`.storybook/preview.tsx` imports `../app/globals.css`; the type-checker has no ambient
declaration for `*.css`, which surfaces as TS2882 in the editor (Vite itself loads the CSS
fine at runtime). `.storybook/env.d.ts` provides `declare module "*.css";` to silence it.
This works because the editor type-checks `preview.tsx`, so the relevant tsconfig `include`
covers `.storybook/` and thus also picks up the adjacent `.d.ts` via `**/*.ts` — no tsconfig
edit is needed. If TS2882 persists, a restricted tsconfig is NOT including that `.d.ts`;
send the tsconfig and the inclusion path is fixed there, not by guessing.

## Optional: addon-vitest

The ecosystem suggests `addon-vitest` to run story-linked tests. It is OPTIONAL here and not
adopted (not installed): Vitest (pure libs, 100% branch) and Playwright (E2E, scoped selectors, mocked
`/api/*`) already cover unit and end-to-end. Do not add it without a concrete need — the
project's rule is no speculative tooling.
