# Axons

> **Status:** work in progress.  
> Axons is an early-stage, production-minded Next.js 16 boilerplate for SEO-oriented AI web applications.  
> The public demo is a preview environment used to validate the architecture end-to-end. It should not yet be considered a stable production-ready release.

Axons is a starter repository for building modern web apps with:

- Next.js 16 App Router and Turbopack
- React 19 and TypeScript
- Material UI 9, isolated behind a neutral component API
- `next-intl` 4 for localized copy and localized URLs
- OpenRouter through the Vercel AI SDK, behind a single unified Route Handler
- Vitest, Playwright, and Storybook 10 for verification
- Netlify deployment through the managed Next.js/OpenNext adapter

The goal is to provide a reusable base for new projects: an AI coding agent or a human developer can clone the repository, understand the constraints quickly, replace the product content, and build a new application with the aim of avoiding architectural, hydration, i18n, AI integration, and deployment issues already addressed here.

## Demo

A public preview deployment is available here:

https://axons-preview.netlify.app/

The demo is currently used to validate the boilerplate, the AI integration, the multilingual routing, and the Netlify deployment pipeline.

> The preview is a work-in-progress environment. It is not yet advertised as a stable production release.

## Table of contents

- [Why this boilerplate exists](#why-this-boilerplate-exists)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Using Axons as the base for a new app](#using-axons-as-the-base-for-a-new-app)
- [Working with an AI coding agent](#working-with-an-ai-coding-agent)
- [Working without an AI coding agent](#working-without-an-ai-coding-agent)
- [Architecture overview](#architecture-overview)
- [AI capabilities: prompts, agents, and skills](#ai-capabilities-prompts-agents-and-skills)
- [Design references and mockups](#design-references-and-mockups)
- [Testing and quality gates](#testing-and-quality-gates)
- [Continuous integration](#continuous-integration)
- [Deployment on Netlify](#deployment-on-netlify)
- [Customization checklist](#customization-checklist)
- [Repository layout](#repository-layout)
- [License](#license)

## Why this boilerplate exists

Many AI app starters collapse three concerns into one:

- the user interface,
- the provider integration,
- the product-specific content.

Axons separates them deliberately:

- UI components are exposed through a neutral API; Material UI is confined to an adapter.
- AI execution is centralized in `lib/ai/`; routes stay thin.
- Model-facing content lives in `capabilities/`; it is data, not application code.
- User-facing copy lives in `messages/`; it is localized separately from prompts.
- Agent instructions live in `AGENTS.md` and `docs/`; they are loaded on demand by coding agents.

This makes the repository easier to audit, easier to extend, and safer to hand to an AI coding agent.

## Quick start

### Prerequisites

- Node.js 24 or newer
- npm
- An OpenRouter API key, if you want to exercise the AI routes locally

### Clone the repository

```bash
git clone https://github.com/YoannB/axons.git
cd axons
```

If you work from a fork, replace the URL above with your fork's URL.

You can also download the repository as a ZIP archive from GitHub and unzip it locally.

### Install dependencies

```bash
npm ci
```

If you are starting from a fresh checkout without a lockfile, use:

```bash
npm install
```

### Configure local environment

Create a local environment file.

Linux / macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Windows CMD:

```cmd
copy .env.example .env.local
```

Then edit `.env.local`.

A minimal `.env.example` looks like this:

```dotenv
# --- Server-only (never NEXT_PUBLIC_, never inlined into the browser bundle) ---
OPENROUTER_API_KEY=
# OpenRouter model id, verified in the catalog at deployment time.
OPENROUTER_MODEL=openrouter/free

# --- Public (inlined by Next.js; also available to Vitest through process.env) ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=en
# Daily client-side quota for AI calls. 0 or empty hides the feature.
NEXT_PUBLIC_AI_DAILY_LIMIT=3
# Google Tag Manager. Empty means GTM is not loaded.
NEXT_PUBLIC_GTM_ID=
# Ads placeholder switch. False until real tags and consent are wired.
NEXT_PUBLIC_ADS_ENABLED=false

# --- Legal / publisher information (server-side, interpolated into messages) ---
# Do not commit real values in this file.
# Fill these variables in .env.local locally, and in Netlify > Site configuration > Environment variables.
LEGAL_EDITOR_NAME=
LEGAL_EDITOR_TRADE_NAME=
LEGAL_EDITOR_SIREN=
LEGAL_EDITOR_APE_CODE=
LEGAL_EDITOR_ADDRESS=
LEGAL_PUBLICATION_DIRECTOR=
LEGAL_CONTACT_EMAIL=
# Expected ISO 8601 date: YYYY-MM-DD. It will be formatted according to the current locale.
LEGAL_ACTIVITY_DECLARED_DATE=
```

At minimum, set:

```dotenv
OPENROUTER_API_KEY=your_openrouter_api_key
```

Optional but recommended:

```dotenv
OPENROUTER_MODEL=your_preferred_model_id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_AI_DAILY_LIMIT=3
NEXT_PUBLIC_ADS_ENABLED=false
NEXT_PUBLIC_GTM_ID=
```

Legal variables should be filled only where needed, for example on legal pages:

```dotenv
LEGAL_EDITOR_NAME=...
LEGAL_EDITOR_TRADE_NAME=...
LEGAL_EDITOR_SIREN=...
LEGAL_EDITOR_APE_CODE=...
LEGAL_EDITOR_ADDRESS=...
LEGAL_PUBLICATION_DIRECTOR=...
LEGAL_CONTACT_EMAIL=...
LEGAL_ACTIVITY_DECLARED_DATE=YYYY-MM-DD
```

> Never commit `.env.local`.
>
> Do not commit real legal values into `.env.example`.

### Start the development server

```bash
npm run dev
```

Open:

http://localhost:3000

## Environment variables

### Server-only

| Variable              | Required          | Purpose                                                                                                                              |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENROUTER_API_KEY`  | Yes for AI calls  | Secret key used by the server-side OpenRouter integration. Empty = the AI layer is off (see below). Needed at build time too.        |
| `OPENROUTER_MODEL`    | No                | Optional override for the default OpenRouter model id.                                                                               |
| `AI_QUOTA_SECRET`     | Yes in production | HMAC secret (>= 32 chars) used to hash client IPs in the server quota. Missing in production = quota store treated as unavailable.   |
| `AI_GLOBAL_DAILY_CAP` | No                | Total AI calls per quota day across all users (default `1000`).                                                                      |
| `AI_RATE_PER_MIN`     | No                | Burst limit: AI calls per minute per IP (default `2`).                                                                               |
| `AI_QUOTA_FAIL_MODE`  | No                | `closed` (default): answer `503` when the quota store is unavailable in production. `open`: let calls through. Always logged.        |
| `FRAME_ANCESTORS`     | No                | Extra origins allowed to embed the site in an iframe (CSP `frame-ancestors`). Empty = same origin only. Invalid value = build error. |

### Legal / publisher information

These variables are read server-side and interpolated into localized messages. They are not `NEXT_PUBLIC_*` variables and are not inlined into the browser bundle by Next.js.

However, because they can become part of localized copy, they should only contain information intended to be publicly displayed on legal pages. They are not secrets.

| Variable                       | Required | Purpose                                                                                        |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `LEGAL_EDITOR_NAME`            | No       | Legal editor name. Used as fallback for `LEGAL_PUBLICATION_DIRECTOR` when the latter is empty. |
| `LEGAL_EDITOR_TRADE_NAME`      | No       | Registered trade name, if applicable.                                                          |
| `LEGAL_EDITOR_SIREN`           | No       | SIREN number, if applicable.                                                                   |
| `LEGAL_EDITOR_APE_CODE`        | No       | APE / NAF code, if applicable.                                                                 |
| `LEGAL_EDITOR_ADDRESS`         | No       | Legal address, if applicable.                                                                  |
| `LEGAL_PUBLICATION_DIRECTOR`   | No       | Publication director. Falls back to `LEGAL_EDITOR_NAME` when empty.                            |
| `LEGAL_CONTACT_EMAIL`          | No       | Contact email for legal notices.                                                               |
| `LEGAL_ACTIVITY_DECLARED_DATE` | No       | Activity declaration date, expected in ISO 8601 format: `YYYY-MM-DD`.                          |

### Public / client-visible

| Variable                     | Required    | Purpose                                                                                                                              |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`       | Recommended | Canonical site URL used for metadata and sitemap generation.                                                                         |
| `NEXT_PUBLIC_LOCALES`        | No          | Served locales, comma-separated subset of `fr,en,es,de,it,pt` (e.g. `fr,en`). Empty = all six. Unknown code = build error.           |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | No          | Default locale (`en` if empty and served, otherwise the first served). Must be a served locale, otherwise the build fails.           |
| `NEXT_PUBLIC_AI_DAILY_LIMIT` | No          | Daily AI quota per user, enforced client-side (localStorage) AND server-side per IP (Netlify Blobs). `0` or empty hides the feature. |
| `NEXT_PUBLIC_AI_QUOTA_TZ`    | No          | IANA time zone cutting the AI day for the client counter AND the server quota (e.g. `Europe/Paris`). Empty = UTC.                    |
| `NEXT_PUBLIC_ADS_ENABLED`    | No          | Enables ad placeholders outside production-safe defaults.                                                                            |
| `NEXT_PUBLIC_GTM_ID`         | No          | Google Tag Manager id, if analytics is desired. Empty means GTM is not loaded.                                                       |

The cookie banner and the footer "Manage cookies" link exist only when `NEXT_PUBLIC_GTM_ID` is set or ads are enabled: a site without any tracker needing consent shows no banner.

**AI on/off:** the AI layer is on only when `OPENROUTER_API_KEY` is present at build time AND `NEXT_PUBLIC_AI_DAILY_LIMIT` is above 0. Otherwise every AI surface (buttons, counter, notices, dev reset) is hidden and `/api/run` answers `503`. Only a boolean (`NEXT_PUBLIC_AI_ENABLED`, computed in `next.config.ts`) reaches the browser, never the key. On Netlify, scope the key to **Builds and Functions**, or the build will not see it and the AI will stay hidden.

### Important notes

- `OPENROUTER_API_KEY` must never be prefixed with `NEXT_PUBLIC_`.
- The API key must never be returned to the browser.
- The server AI quota (`lib/ai/quota.ts`) is not a financial guarantee: set a credit limit on the OpenRouter key as the hard spending cap.
- The raw prompt, provider error details, and generated code/HTML must remain server-side unless explicitly sanitized.
- Legal variables are not secrets. They are intended for public legal disclosure pages.
- Legal variables are processed in `i18n/request.ts`:
    - they are read from `process.env` on the server,
    - special ICU/MessageFormat characters are escaped,
    - `LEGAL_ACTIVITY_DECLARED_DATE` is formatted with `Intl.DateTimeFormat` using the current locale,
    - invalid dates fall back to the raw value,
    - values are interpolated into `messages/<locale>.json`.

Expected placeholders in message files include:

```text
{editorName}
{tradeName}
{siren}
{apeCode}
{address}
{publicationDirector}
{contactEmail}
{declaredDate}
```

## Using Axons as the base for a new app

Axons is designed to be forked, cloned, or downloaded and then transformed into a new product.

The intended workflow is:

1. Clone the repository.
2. Read the agent orientation files.
3. Define the new product specification.
4. Provide or describe visual references.
5. Replace product-specific content.
6. Implement changes incrementally.
7. Run the quality gates.
8. Deploy to a preview environment before production.

> This workflow is the intended direction for the boilerplate. It is not yet presented as a certified one-shot automated process.

The repository already contains technical decisions that are expensive to rediscover:

- Material UI isolation
- hydration-safe client-only state
- theme persistence
- localized routing
- AI route normalization
- rate limiting
- prompt/skill loading
- unit/E2E/Storybook verification
- Netlify deployment constraints

Your new app should inherit those decisions and replace only the product layer.

## Working with an AI coding agent

Axons is optimized for local or cloud coding agents that can read files, inspect the repository, run commands, and edit code.

### Required reading order

Before making changes, an agent should read:

1. `AGENTS.md`
2. The relevant files under `docs/`

Do not preload every documentation file. `AGENTS.md` is the router; `docs/` contains the detailed rules.

Typical mapping:

| Task                                               | Load                      |
| -------------------------------------------------- | ------------------------- |
| Understand repository structure                    | `docs/architecture.md`    |
| Edit React state, effects, store, hydration        | `docs/react-effects.md`   |
| Edit Material UI adapter, theme, MUI controls      | `docs/ui-material.md`     |
| Edit AI agents, skills, `/api/run`, `lib/ai`       | `docs/ai-capabilities.md` |
| Edit messages, localized URLs, timeZone            | `docs/i18n.md`            |
| Edit layout, animation, SEO section, mobile guards | `docs/seo-layout.md`      |
| Edit tests or definition of done                   | `docs/testing.md`         |
| Edit Storybook stories or visual states            | `docs/storybook.md`       |

### Illustrative agent workflow

The following sequence is an example of how the repository can be used with an AI coding agent. It is not a guaranteed end-to-end workflow.

#### Phase 1: orientation

Prompt example:

```text
Read AGENTS.md first. Then identify which files under docs/ are relevant to my request.

Do not modify code yet. Summarize the constraints that apply to this task.
```

#### Phase 2: specification

Prompt example:

```text
Based on my product idea, write a concise specification:
- target user
- primary user journeys
- pages and sections
- localized copy requirements
- AI features, if any
- SEO requirements
- visual references, if provided
- acceptance criteria
```

#### Phase 3: implementation plan

Prompt example:

```text
Produce an incremental implementation plan using the existing Axons architecture.

Respect the Material UI boundary, the i18n rules, the AI capability contracts, and the testing discipline.

For each step, list files to create or modify and the verification command to run.
```

#### Phase 4: execution

Prompt example:

```text
Implement step 1 only.

After editing, run the relevant checks.

Do not proceed to the next step until the current step is green.
```

### Useful agent handoff prompt

You can paste this into a coding agent after cloning the repository:

```text
You are working inside the Axons boilerplate.

Before editing:
1. Read AGENTS.md.
2. Load only the docs/ files relevant to the task.
3. Inspect the existing implementation before proposing changes.

Goal:
Transform this boilerplate into a new application according to the specification and visual references I provide.

Hard constraints:
- Do not import @mui/* outside components/ui/material/.
- Do not leak sx, classes, slotProps, or MuiTheme through the neutral component API.
- Do not hardcode user-facing labels; use messages/<locale>.json.
- Do not localize AGENTS.md, docs/**, capabilities/agents/**, or capabilities/skills/**.
- Keep AI routes thin; composition and network logic belong in lib/ai/.
- Preserve hydration safety: no destructive DOM removal, no setState in effect bodies to mirror props/state.
- Run the relevant verification commands after each meaningful change.

Deliverable:
A working incremental implementation with tests/build/storybook checks passing where applicable.
```

### If the agent cannot read files

Some tools cannot inspect the repository directly. In that case, provide:

- `AGENTS.md`
- the relevant `docs/*.md` files
- the files to modify
- the error output or expected behavior

Do not give the agent the whole repository at once unless necessary. The documentation split exists to keep context manageable.

## Working without an AI coding agent

You can also use Axons manually.

Start with these files:

| Goal                        | File                                                       |
| --------------------------- | ---------------------------------------------------------- |
| Rename the app              | `constants/site.ts`                                        |
| Change navigation           | `constants/site.ts` and `messages/*.json`                  |
| Change hero copy            | `messages/*.json`                                          |
| Change SEO resources        | `constants/site.ts` and `messages/*.json`                  |
| Change theme tokens         | `styles/tokens.css`                                        |
| Change global (non-MUI) CSS | `styles/**` (map: `docs/styles.md`)                        |
| Change MUI adapter behavior | `components/ui/material/`                                  |
| Add an AI agent             | `capabilities/agents/<id>.md`                              |
| Add an AI skill             | `capabilities/skills/<id>/SKILL.md`                        |
| Call AI from UI             | `hooks/use-ai-call.ts` and a component under `components/` |
| Add unit tests              | `tests/unit/`                                              |
| Add E2E tests               | `tests/e2e/`                                               |
| Add component stories       | `components/**/*.stories.tsx`                              |

The most important manual rule is:

> Do not bypass the existing boundaries.

If you need a new button, extend the neutral API and the Material UI adapter.

If you need a new AI behavior, add a capability file and call `/api/run`.

If you need a new label, add it to every active locale file.

## Architecture overview

Axons has three distinct planes.

### 1. Application code

Located mainly in:

```text
app/
components/
hooks/
lib/
providers/
constants/
i18n/
messages/
```

This is normal Next.js/React code.

### 2. AI logic

Located in:

```text
lib/ai/
app/api/run/
app/api/hello/
```

The unified execution model is:

```text
prompt + optional agent + optional skill
```

It is composed by `lib/ai/compose.ts`, orchestrated by `lib/ai/agent.ts`, and exposed through `app/api/run/route.ts`.

### 3. Model-facing content

Located in:

```text
capabilities/agents/
capabilities/skills/
```

These files are read at runtime by the server. They are not imported as normal modules.

This separation matters:

- `lib/ai/` is code.
- `capabilities/` is data.
- `messages/` is localized user copy.
- `docs/` is instruction for coding agents.

Do not mix those roles.

## AI capabilities: prompts, agents, and skills

Axons uses one unified AI execution model.

A call may contain:

- a required `prompt`
- an optional `agentId`
- an optional `skillId`
- optional `inputs`
- optional `includeResources`

Valid shapes:

```text
prompt
prompt + agent
prompt + skill
prompt + agent + skill
```

Parameter precedence is by whole source, not per field:

1. agent params if an agent is present,
2. skill params otherwise,
3. defaults otherwise.

### Agents

An agent is a profile.

Location:

```text
capabilities/agents/<id>.md
```

It provides:

- a system prompt,
- execution parameters such as model, temperature, max tokens, timeout.

Example:

```yaml
---
id: hello
name: AI Greeting
model: openrouter/free
temperature: 0.7
maxTokens: 1000
timeoutMs: 25000
---
Greet the user in the language indicated by {locale}.
```

### Skills

A skill is a method plus resources.

Location:

```text
capabilities/skills/<id>/SKILL.md
capabilities/skills/<id>/...additional resource files...
```

A skill is a directory, not a flat file. The manifest is `SKILL.md`. Other files in the directory are loaded as resources and can be sent to the model when the skill is used.

The recommended manifest shape uses a `metadata` block for Axons-specific fields. This helps avoid conflicts with editor-owned frontmatter schemas, such as VS Code agent validation.

Example:

```yaml
---
name: i18n-copy
description: Draft or review the labels of one locale in messages/<locale>.json while preserving existing keys.
metadata:
    inputs: [locale, namespace]
    outputs: [messages patch]
---
# Procedure

1. Treat messages/fr.json as the structural reference for key names.
2. Draft or review the label(s) for the {namespace} namespace in the {locale} locale.
3. Never introduce a new key without declaring it in EVERY active locale file.
4. Keep placeholders ({site}, {count}, {value}, {name}) byte-for-byte identical.
5. Ensure URLs/logical hrefs never depend on translated content.
6. Write the agent/skill system prompts in English; only user-facing copy is localized.
```

Implementation notes:

- `metadata.inputs` declares named variables interpolated into the procedure.
- `metadata.outputs` is currently descriptive. It is not enforced as a response schema by `skill-pure.ts` or `skill-io.ts`.
- `parse-skill.ts` reads the `metadata` block first. Legacy top-level fields (`inputs`, `outputs`, `model`, ...) are still accepted as a fallback; when both are present, `metadata` wins.
- The manifest file name is case-sensitive: it must be exactly `SKILL.md` (Linux, CI and Netlify file systems are case-sensitive, unlike Windows).

Adding a skill:

1. Drop `capabilities/skills/<id>/SKILL.md` and optional resource files.
2. Call `/api/run` with:

```json
{
    "prompt": "...",
    "skillId": "<id>",
    "inputs": {}
}
```

The route stays thin.

### Calling the unified route

Linux / macOS / Windows with `curl`:

```bash
curl -sS -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Draft a short welcome message for the home page.",
    "agentId": "hello",
    "skillId": "i18n-copy",
    "inputs": {
      "namespace": "hero"
    }
  }'
```

Windows PowerShell alternative:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/run `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{
    prompt = "Draft a short welcome message for the home page."
    agentId = "hello"
    skillId = "i18n-copy"
    inputs = @{
      namespace = "hero"
    }
  } | ConvertTo-Json -Depth 5)
```

The route returns:

```json
{
    "text": "..."
}
```

### Client hook

Use the existing hook:

```ts
import { useAiCall } from "@/hooks/use-ai-call";
```

It centralizes:

- pending state,
- daily quota,
- success toast,
- error toast,
- credit consumption only on useful replies.

Pass `onSuccess(reply)` as the third argument when the app consumes the reply itself (for example to fill a result pane) instead of showing it in a toast.

Do not create a second AI client hook.

### Text tools kit

For "text in, text out" apps (proofreading, rephrasing, summaries with a visible delta), Axons ships AI-agnostic building blocks: a word diff and a similarity score with configurable bands (`lib/text/`), `DiffView`, `EditorPair`, `ChoiceChips`, `AiNotice`, a character counter on `Textarea`, and the `useDirtyGuard` / `useElapsedSeconds` hooks. They are documented in Storybook (no home-page demo: a before/after editor belongs to the derived product). See `docs/text-tools.md`.

### Markdown articles

Articles live in the repository, one folder per article and one Markdown file per language (`content/articles/<id>/<locale>.md`) with a YAML front matter (title, translated slug, date, description, optional image). Axons generates the localized listing (`/articles`, `/fr/articles`, `/de/artikel`…), one page per translation with its translated URL, hreflang, canonical, JSON-LD and sitemap entries, plus a "latest articles" block on the home page. A missing translation falls back to another language in the listing, without duplicate pages. Invalid front matter fails the build. See `docs/articles.md`.

## Design references and mockups

Axons can be used with visual references.

If you have desktop and mobile mockups, you can:

- attach them to a multimodal coding agent;
- place them in a recommended folder such as `docs/design/`;
- or describe them in the specification.

When providing mockups, ask the agent to map them to the existing component system instead of inventing a parallel UI stack.

Recommended prompt:

```text
Here are desktop and mobile references for the new app.

Map them to the existing Axons components and CSS tokens.

Do not introduce new MUI imports outside components/ui/material/.

Preserve the existing responsive strategy, theme system, and neutral component API.

If a reference cannot be implemented without violating the architecture, explain why and propose the closest compliant alternative.
```

Important:

- Mockups are references, not permission to break the architecture.
- Visual changes should go through `styles/**` (ordered by `app/globals.css`), `components/ui/material/index.css`, and the adapter components.
- Business components should not depend on MUI-generated class names.

## Testing and quality gates

Axons uses three verification layers.

### Unit tests

```bash
npm run test
```

Used for pure logic, especially under `lib/ai/`.

The project’s testing rule is:

> Pure libraries should reach 100% branch coverage with inline fixtures and no network/fs mocks.

### E2E tests

Install browsers first:

```bash
npx playwright install
```

On Linux CI environments, the following is usually safer:

```bash
npx playwright install --with-deps chromium
```

Then run:

```bash
npm run test:e2e
```

Playwright validates real user journeys with mocked `/api/*` routes where appropriate.

### Storybook

```bash
npm run storybook
```

Build check:

```bash
npm run storybook:build
```

Storybook is used to document component states:

- default
- loading
- disabled
- error
- light/dark theme
- keyboard/accessibility states

### Full verification

Before claiming the project is ready, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm run storybook:build
```

Also run:

```bash
npm audit
```

Do not claim “zero vulnerabilities” from direct dependency versions alone. Inspect severity, affected package, fix availability, and impact.

## Continuous integration

GitHub Actions runs the full definition of done on every pull request to `main`: the workflow lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

- **Trigger:** pull requests targeting `main` only, and not while the pull request is a draft. Commits on a branch without a pull request, or on a draft pull request, run nothing; marking the pull request "Ready for review" starts the pipeline. A new push to the same pull request cancels the run in progress. The workflow also runs nightly (`schedule`) and can be started manually (`workflow_dispatch`).
- **Steps:** `npm ci`, typecheck, lint, format check, unit tests, build, Playwright E2E, Storybook build, and an informative `npm audit`. The Playwright report is uploaded as an artifact when a step fails.
- **E2E scope and speed:** E2E tests run against the production build (`next start`), not `next dev`, so pages are not compiled on demand. Pull requests run the desktop `chromium` project only; the nightly and manual runs add the `mobile` project. Playwright browsers are cached per version.
- **No secrets needed:** `/api/*` calls are mocked in the browser specs and the server-contract specs stop at validation, so no OpenRouter key is required. Without a Netlify Blobs store, the job sets `AI_QUOTA_FAIL_MODE=open` (CI only, never on a deployment) and `NEXT_PUBLIC_AI_DAILY_LIMIT=3` (with 0 the AI feature is disabled and its specs cannot run).

To make the pipeline mandatory, add a ruleset on `main` in the GitHub repository settings (Settings → Rules → Rulesets): require a pull request before merging, require the `verify` status check to pass (it appears in the list after its first run), block force pushes, and keep the bypass list empty so that administrators cannot push to `main` directly.

GitHub-hosted runners are free for public repositories.

## Deployment on Netlify

Axons targets Netlify with the managed Next.js/OpenNext adapter.

At this stage, the public preview is deployed manually from Netlify. The long-term target is a GitHub + Netlify continuous deployment setup.

Recommended process:

1. Push the repository to GitHub.
2. Connect the repository to Netlify, or deploy manually for now.
3. Let Netlify detect Next.js.
4. Configure environment variables in Netlify.
5. Deploy a preview.
6. Verify the AI route, localized pages, metadata, sitemap, and theme behavior.
7. Promote to production only after preview validation.

Required environment variable:

```dotenv
OPENROUTER_API_KEY
```

Optional:

```dotenv
OPENROUTER_MODEL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_DEFAULT_LOCALE
NEXT_PUBLIC_AI_DAILY_LIMIT
NEXT_PUBLIC_ADS_ENABLED
NEXT_PUBLIC_GTM_ID
LEGAL_EDITOR_NAME
LEGAL_EDITOR_TRADE_NAME
LEGAL_EDITOR_SIREN
LEGAL_EDITOR_APE_CODE
LEGAL_EDITOR_ADDRESS
LEGAL_PUBLICATION_DIRECTOR
LEGAL_CONTACT_EMAIL
LEGAL_ACTIVITY_DECLARED_DATE
```

Important:

- Local `next dev` does not validate Netlify function limits.
- Local `next dev` does not validate production environment variables.
- Local `next dev` does not validate platform cache behavior.
- A preview deployment is part of the definition of done.
- Do not manually pin the Netlify/OpenNext adapter without a documented reason.
- Verify the OpenRouter model id at deployment time.
- Locale routing runs through a root `middleware.ts`: the Netlify adapter does not support the Next.js 16 `proxy.ts` convention yet. The deprecation warning at build time is expected; `proxy.ts.disabled` is parked with the same matcher for the day the adapter supports it (see `docs/architecture.md`).

## Customization checklist

When transforming Axons into a new app, update at least:

### Branding

- `SITE_NAME` in `constants/site.ts`
- logo/mark in `components/ui/Logo.tsx` or equivalent
- favicon and social image in `public/`

### Localization

- active locales in `i18n/locales.ts` (and the language switcher list in `constants/site.ts`)
- localized pathnames in `i18n/routing.ts`
- user-facing copy in `messages/*.json`
- legal pages in `messages/*.json`

### Legal / publisher information

- fill `LEGAL_*` variables in `.env.local` and Netlify environment variables
- ensure legal placeholders exist in `messages/*.json`
- use ISO 8601 format for `LEGAL_ACTIVITY_DECLARED_DATE`
- do not commit real legal values in `.env.example`

### Product content

- hero copy
- feature strip
- FAQ
- SEO resources
- articles in `content/articles/` (the two demo articles, and `tests/e2e/articles.spec.ts` which relies on them), or `ARTICLES_ENABLED = false` in `constants/site.ts` to turn the section off
- footer links
- sitemap page

### AI behavior

- add or replace files in `capabilities/agents/`
- add or replace directories in `capabilities/skills/`
- update UI buttons that call `/api/run`
- update tests if parser/composition contracts change

### Environment

- `.env.example`
- Netlify environment variables
- OpenRouter model id

### Quality

- unit tests for pure libraries
- E2E tests for critical journeys
- Storybook stories for changed components

## Repository layout

High-level layout:

```text
/
  app/                 # Next.js App Router
  capabilities/        # Model-facing agents and skills
  components/          # Neutral UI API, MUI adapter, layout/home/content components
  constants/           # Site constants, navigation, locales, SEO resources
  content/             # Markdown articles (content/articles/<id>/<locale>.md)
  docs/                # Detailed on-demand documentation for coding agents
  hooks/               # Client hooks, including the single AI call hook
  i18n/                # next-intl routing and request configuration
  lib/                 # Utilities and AI logic
  messages/            # Localized user-facing copy
  providers/           # App providers
  public/              # Static assets
  tests/               # Vitest unit tests and Playwright E2E tests
  .storybook/          # Storybook configuration
  AGENTS.md            # Router and invariant contract for coding agents
```

The most important entry points are:

- `AGENTS.md`
- `docs/`
- `lib/ai/`
- `capabilities/`
- `messages/`

## License

Copyright (C) 2026 Yoann Barbier.

Axons is free and open-source software, licensed under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`). See the [`LICENSE`](LICENSE) file for the full text.

In practice:

- You may use, study, modify, and redistribute Axons, including in commercial contexts.
- If you distribute a modified version, or **run it as a network service** (for example a public website or a SaaS), you must make the complete corresponding source code of your version available to its users under the same license.
- You must keep the copyright and license notices.
- Axons comes with no warranty.

This summary is informative; the `LICENSE` file is the only binding text.

### Commercial licensing

If the AGPL obligations do not fit your project (for example, a closed-source commercial product), a separate commercial license can be discussed. Contact the maintainer through the [GitHub profile](https://github.com/YoannB).

Need an expert to build your next SEO & AI application based on this architecture? Reach out through the same channel.

## Credits

Axons is built with:

- Next.js
- React
- TypeScript
- Material UI
- next-intl
- Vercel AI SDK
- OpenRouter
- Vitest
- Playwright
- Storybook
- Netlify

This repository is an opinionated boilerplate. Its value is not only the code, but the encoded constraints that help a new project avoid common architectural, hydration, i18n, AI integration, and deployment mistakes.
