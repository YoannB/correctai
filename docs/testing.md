# Testing discipline (`lib/ai` pure modules are the reference example)

## Unit (Vitest, `tests/unit/*.test.ts`) — 100% branch on PURE logic

Cover PURE logic to 100% branch coverage, with INLINE fixtures and NO `fs` /network/mock: this is
why `lib/ai/parse-agent.ts`, `lib/ai/parse-skill.ts`, `lib/ai/compose.ts` (`composeRun`), and
`lib/ai/skill-pure.ts` (`serializeSkillResources` / `validateSkillInputs`) are the template —
deterministic, fast, and each `it` locks ONE branch (including every `throw` and every
`??` / `continue` / `includes` boundary). Replicate this shape for any new pure lib.

GOTCHA that bit this repo: a pure-module test that builds its fixtures by CALLING the parser at
top-level (`const X = parseAgent(...)`) must give every fixture a CLOSING `---`; the parser is
fail-fast, so a missing tail delimiter throws at MODULE IMPORT (before any `it` runs) and yields
"0 test / Failed Suites" while other files still pass. Inline fixtures in
`agent-parser.test.ts`/`skill-parser.test.ts` already close correctly; keep it that way.

## IO & network — covered by E2E, not unit

`loadSkill` (`lib/ai/skill-io.ts`), `run` (`lib/ai/agent.ts`), `runPrompt` (`lib/ai/agent.ts`),
and the Route Handlers are NOT mocked in unit; they are covered by
Playwright E2E with `page.route` mocking `/api/*` for client-boundary behavior (see
`tests/e2e/home-ai.spec.ts`), and by server-contract E2E using the Playwright `request` fixture for
Route Handler validation before the network (see `tests/e2e/api-run.spec.ts`). Structural,
persistence, and quality checks live in `tests/e2e/home.spec.ts`, `tests/e2e/home-persistence.spec.ts`,
and `tests/e2e/home-quality.spec.ts`.
E2E selectors MUST be scoped: the showcase DEMONSTRATES `LanguageSwitcher`/`ThemeToggle` and the SEO CTA reuses
the "Test the AI" label, so multiple `.lang__btn`/`.theme-toggle`/"Test the AI" buttons coexist in
the DOM — scope to the header (`getByRole('banner')`) for language/theme and to `#showcase` for
the AI button, or Playwright strict mode fails BEFORE the click. Headless Chromium negotiates
`Accept-Language: en-US`, so `goto('/')` renders ENGLISH (intended middleware behavior, not a bug):
language-independent structural asserts stay on `/` and use `toBeVisible()` (never a hardcoded FR
substring); asserts that need an exact FR label navigate to `/fr` (forced locale).
CI serves the PRODUCTION build (`next start`, `playwright.config.ts` switches on `CI`) with
`AI_QUOTA_FAIL_MODE=open`, `NEXT_PUBLIC_AI_DAILY_LIMIT=3`, a placeholder `OPENROUTER_API_KEY`
(AI layer on, never called) and `NEXT_PUBLIC_ADS_ENABLED=true` (cookie banner present) set in
`ci.yml`: under `next dev`
the on-demand compilation made specs time out, and a missing daily limit (0) disables the AI
button and makes the server quota answer 429 to every call. Pull requests run the `chromium`
project only; nightly/manual runs add `mobile`.
`npx playwright install` is a documented prerequisite (browsers are not auto-downloaded
everywhere); a missing executable fails every test before rendering.

URLs in specs: the default locale has no prefix (`localePrefix: "as-needed"`), so build expected
hrefs/URLs with `lp(locale, path)` / `lpRe(locale, path)` (`tests/e2e/support/locale-path.ts`)
instead of hard-coding "/fr/...": the same spec then passes for a derived site whose
`NEXT_PUBLIC_DEFAULT_LOCALE` differs. Navigate with the explicit prefix (`goto("/fr")`) to FORCE a
locale (the middleware redirects to the canonical URL). `playwright.config.ts` loads `.env*` with
`@next/env`, so specs see the same `NEXT_PUBLIC_*` as the server.

## Verification philosophy

Definition of done for `lib/`: `npm run test` green AND the pure modules at 100% branch coverage.
`npm run format:check` must pass too (Prettier config in `.prettierrc`; line endings are LF,
enforced by `.gitattributes`).
Do not claim a lib is covered from a passing run alone: a command that starts without an obvious
error is not a passing test. `npm audit` must report severity / affected package / fix
availability / impact; never claim "zero vulnerabilities" from direct-dependency versions alone.

## Cross-tool invariants (alias, audit --force, preview deploy, versions)

The import alias `@` is declared in THREE places that must AGREE: `tsconfig.json` `paths`,
the Next resolution, and `vitest.config.ts` `resolve.alias`. A divergence means a test can
be green while production is broken (or the reverse) — `@/lib/...` resolving differently per
toolchain. When you touch any of the three, re-check the other two; this is the single most
silent way the `lib/ai` 100%-branch suite can lie to you.

Never run `npm audit fix --force` without inspecting the major bumps it introduces; after any
controlled fix, re-run lint, test, and build. `npm audit` may still report transitive
vulnerabilities even with recent direct deps — read severity / package / fix / impact, and
never claim "zero vulnerabilities" from direct-dependency versions alone.

A local `next dev` run does NOT validate the deployment. The definition of done includes a
Netlify PREVIEW deployment verified end-to-end: App Router page SSR, the AI Route Handler,
production env vars, cache behavior, image generation IF `next/image` is in use, and
streaming if adopted. Do not manually pin the Netlify/OpenNext adapter without a documented
reason — pinning "to fix" a platform error usually deepens it. Prefer `eslint .` over the
deprecated `next lint`; keep ONE source of ESLint config. Re-validate stable versions,
Next/React/RSC advisories, the MUI changelog, and the OpenRouter catalog at every MAJOR
upgrade; do not impose a compiler major (e.g. TS) on the whole chain without checking
`peerDependencies` ranges first, and on `ERESOLVE` inspect the exact peer ranges before
reaching for `--force` / `--legacy-peer-deps` (they mask an incompatibility rather than
solve it). Patch-version pins live in `package.json`/`package-lock.json` — do NOT duplicate
them into these docs (single source of truth).
