<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — router for autonomous coding agents

CorrectAI = free AI spelling & grammar checker on Next.js 16 (App Router, Turbopack) + React 19 + TS;
Material UI 9 isolated behind a neutral API; `next-intl` 4; OpenRouter via one unified
Route Handler; Vitest + Playwright + Storybook 10; Node 24; Netlify (OpenNext adapter).
One plain Next.js app, one source per concern: identity/config in `constants/site.ts`, copy in
`messages/<locale>.json` (`docs/architecture.md` → Site identity).

**This file is the ONLY always-loaded instruction. Do NOT preload `docs/*`.** Before
editing, open the ONE doc matching your task from the index below; cross-refs are
`file → heading name` (no section numbers). Model-facing files (`AGENTS.md`, `docs/**`,
`capabilities/**`) are written in ENGLISH and must never be localized.

## Index — load on demand

| Your task touches                                                                                                                                                | Load                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| repo structure, root vs segment layout, where a file goes, boot-script placement, security headers/framing, the i18n/middleware/proxy divergence, where the site identity lives | `docs/architecture.md`    |
| React state/effects, external store, hydration, theme persistence & single source, keeping public pages static                                                   | `docs/react-effects.md`   |
| global (non-MUI) CSS: which `styles/**` file owns a selector, the `app/globals.css` import manifest & cascade order | `docs/styles.md` |
| anything under `components/ui/material/`, MUI theme build, light mode, disabled-button contrast, Button external/busy, chips, toasts, global-vs-MUI CSS, MUI-control animations        | `docs/ui-material.md`     |
| AI: on/off switch, agents, skills, `/api/run`, `lib/ai`, prompt language, deploy/tracing, rate limit, quota day/time zone                                        | `docs/ai-capabilities.md` |
| `messages/*.json`, served locales (`NEXT_PUBLIC_LOCALES`), localized URLs, `timeZone`, locale navigation, client messages (`CLIENT_MESSAGES`)                                                         | `docs/i18n.md`            |
| Markdown articles & collections: `content/<collection>/`, front matter, listing/latest block, New/Archive badges, SEO (hreflang, JSON-LD, sitemap), slug-aware language switch, declaring a collection, comments (Disqus, consent, CSP) | `docs/articles.md`        |
| text diff/similarity (`lib/text/`), DiffView, EditorPair, ChoiceChips, AiNotice, dirty-input guard, elapsed wait                                                 | `docs/text-tools.md`      |
| visual/layout/animation: hero roulette, icon draw, pre-hydration splash (`SPLASH`, splash logo), video detach/dismiss, containers/rails, mobile overflow, header squeeze, ads/consent/dev-reset, Tabs/Terminal, 404 empty state, social images (og:image, Twitter card, `components/og/OgImage.tsx`, `/og/*.png`) | `docs/seo-layout.md` |
| tests (Vitest/Playwright), 100%-branch discipline, the closing-`---` gotcha, npm audit                                                                           | `docs/testing.md`         |
| Storybook stories, component visual states, `.storybook/` config                                                                                                 | `docs/storybook.md`       |

## Never do (un-enforced, catastrophic — the rest lives in the docs)

- Never expose `OPENROUTER_API_KEY`, raw provider errors, prompts, or generated code to
  the client; the key is server-only (`lib/env-server.ts`).
- Never import `@mui/*` outside `components/ui/material/`, nor leak `sx`/`classes`/
  `slotProps`/`MuiTheme` through the neutral API (ESLint guards the import, not the leak).
- Never put synchronous `setState` in a `useEffect` body to mirror props/state.
- Never destructively remove a React-owned DOM node (`el.remove()`); hide via CSS class.
- Never localize `AGENTS.md`, `docs/**`, or `capabilities/**`.
- Never preload every doc; that recreates the novel this split removes.
- Never introduce structural changes (new folders, indirection layers, file moves, duplicated
  sources) without a written proposal approved by the user.

## Definition of done (run before claiming success)

```powershell
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run test:e2e && npm run storybook:build
```

CI (`.github/workflows/ci.yml`) runs this same sequence on pull requests to `main`; keep both
in sync when a step changes.

Formatting is Prettier (`.prettierrc`: 4-space indent, 120 columns, LF). Run `npm run format`
before claiming success; never hand-format against it.

Plus `npm audit` (report severity / package / fix / impact; never claim "zero
vulnerabilities" from direct-dependency versions alone). Keep `package-lock.json`
committed; CI/Netlify use `npm ci`. Verify the OpenRouter model id at deploy time. A
command that starts without an obvious error is NOT a passing test — see the _Verification
philosophy_ heading in `docs/testing.md`.
