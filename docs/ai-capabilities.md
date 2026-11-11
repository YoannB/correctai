# AI integration — unified composition (`capabilities/` + `lib/ai/`)

Flow: browser → ONE Route Handler (`app/api/run/route.ts`) → OpenRouter. Timeouts: server 25 s
(`AbortSignal.timeout`, `timeoutMs`), client 30 s (`lib/api.ts`, so the server's `timeout` reply
arrives first). Errors normalize to codes
(`rate | timeout | provider | invalid | generic | empty`) and surface as toasts; technical
details, the key, the raw prompt, and generated HTML/code stay server-side. An empty model
reply must raise the `empty` error toast, not an empty success toast. While a call is pending,
`aiPending` disables the button, blocks edits, and prevents re-clicks. The whole orchestration
(pending guard, quota, increment, success/error toasts) lives in ONE hook,
`hooks/use-ai-call.ts`, reused by every AI button — never duplicate it per component. The
daily credit is consumed ONLY on a useful reply: `increment()` runs AFTER the `await` AND
after the `if (!reply)` guard, so a thrown HTTP error (`postJson` raises on `!res.ok`) or an
empty 200 reply never debits a call. By default a useful reply is shown as a success toast
(demo behavior); pass the hook's third argument `onSuccess(reply)` to hand the trimmed reply
to the app instead (fill a result pane, diff it — see `docs/text-tools.md`); the success toast
is then skipped and everything else (guard, quota, error toasts) stays in the hook. Keep
`buildBody` and `onSuccess` stable references (module level or `useCallback`). The store
records `aiPendingSince` with `aiPending`, so `useElapsedSeconds(useAiPendingSince())` can
show the wait time on the pending button.

## AI on/off switch

The AI layer is OPTIONAL per site. `next.config.ts` inlines `NEXT_PUBLIC_AI_ENABLED` = whether
`OPENROUTER_API_KEY` was present AT BUILD (a boolean only, never the key); `constants/site.ts`
`AI_ENABLED` = that flag AND `NEXT_PUBLIC_AI_DAILY_LIMIT > 0` (pure `lib/flags.ts`). Every AI
surface gates on it: `useDailyLimiter` (`hidden`, `canCall`), `LimitBadge`,
`ResetLimiterButton`, the AI buttons/CTA, and `AiNotice` placements (never show an AI
disclosure on a site that makes no AI call). The server stays authoritative: without a key
`/api/run` answers `503`. A new AI surface MUST read `AI_ENABLED` (or `useDailyLimiter`), never
re-derive it. CI sets a placeholder key so the AI specs run; no spec reaches the provider.

## The model (one execution composing three bricks)

`prompt` — the USER message, ALWAYS required and non-empty (the concrete task).

`agent?` — OPTIONAL profile: a `## Agent profile` section in the SYSTEM message (its system
prompt, placeholders substituted from `inputs`) AND it governs execution params
(`model`/`temperature`/`maxTokens`/`timeoutMs`).

`skill?` — OPTIONAL method: `## Skill procedure` (placeholders substituted from `inputs`)
plus `## Skill resources` (the directory's other files, serialized, FILTERABLE by
`includeResources`).

Valid shapes: prompt only / prompt+agent / prompt+skill / prompt+agent+skill. PARAM
PRECEDENCE is BY WHOLE SOURCE, not per field: agent present → its params; else skill → its
params; else DEFAULTS. (Per-field merging was rejected: an agent omitting `model` would
silently override a skill's `model`.)

`SkillDef.inputs`, populated from `metadata.inputs` with legacy top-level `inputs` accepted
as fallback, are the NAMED variables the procedure interpolates (e.g. `locale`, `namespace`)
— distinct from the free `prompt`.

## Code map (pure first, IO second — the testing rule depends on this split)

`lib/ai/compose.ts` — PURE `composeRun({ prompt, agent?, skill?, inputs?, includeResources? })`
→ `{ messages:[{role,content}], model, temperature, maxTokens, timeoutMs }`. No fs/network/
`server-only` → importable and 100%-unit-tested. Throws on empty prompt. Resource filter is
TOLERANT (a requested-but-missing relPath is ignored, never crashes the request).

`lib/ai/parse-agent.ts`, `lib/ai/parse-skill.ts` — PURE frontmatter parsers (fail-fast).
`parse-skill.ts` is metadata-aware: it reads the recommended `metadata:` block and still
accepts legacy top-level fields as fallback. When both are present, `metadata` wins.

`lib/ai/skill-pure.ts` — PURE `serializeSkillResources` / `validateSkillInputs`
(pass-through of undeclared keys, required-key enforcement). No `server-only`, no `AiError`,
so it stays importable by Vitest.

`lib/ai/skill-io.ts` — THIN IO `loadSkill(id)` (recursive, deterministic walk: binary sort by
relative path, `/` separators, `SKILL.md` excluded). This module is server-only and is not
covered by mocked unit tests; it is covered by E2E/integration. Client-never exposure is
guaranteed by no client component importing this file.

`lib/ai/agent.ts` — `runPrompt({ ...composed, request, logTag })` is the NETWORK kernel ONLY
(timeout+signal, `generateText(messages)`, anchored `User Safety:` strip, truncation guard
throwing ONLY on `finishReason === 'length'` — never on `content-filter` / `other` which may
carry usable text — and error normalization with no re-wrapping of an already-normalized
`AiError`; OpenRouter `reasoning: { effort: "low", exclude: true }` on every call, because
reasoning models behind `openrouter/free` spend hidden tokens from `maxTokens` and can end on
`length` with EMPTY text — keep `maxTokens` generous, it is a ceiling, not a cost). `run({ prompt, agentId?, skillId?, inputs?, includeResources?, request, logTag })`
is the ORCHESTRATOR: load (fs) → validate → composeRun (pure) → runPrompt. Every
load/validate/compose failure (bad/missing capability, empty prompt) maps to
`AiError('invalid', 400)` HERE, before the network, so `runPrompt` only sees model failures.
`runAgent` / `runSkill` / `buildSkillPayload` NO LONGER EXIST — do not reintroduce them.

## HTTP

`app/api/run/route.ts` is THE entry; body `{ prompt (required), agentId?, skillId?, inputs?, includeResources? }`.
The route owns HTTP concerns (best-effort rate limit, body parse, locale resolution, injecting
`locale` into `inputs`); composition/network live in `lib/ai`.

`app/api/hello/route.ts` is a LEGACY ADAPTER calling `run({ agentId:'hello', prompt:<fixed> })`
so the showcase greeting button and the E2E mock (`**/api/hello`) keep working unchanged; its
body still accepts `{ locale, input }` but `input` is ignored (the `input` field no longer
exists on agents — see the _Agent contract_ heading below).

## Agent contract — `capabilities/agents/<id>.md`

frontmatter delimited by `---` head AND tail; scalar pairs `key: value` (colon + space, else
the line is ignored); `id` REQUIRED; `name` defaults to `id`; `model` defaults to
`openrouter/free`; `temperature` / `maxTokens` / `timeoutMs` default to 0.7/300/25000 and MUST be
finite (NaN/Infinity is an authoring error and throws, never silently defaults);
`maxPromptChars` (default `DEFAULT_MAX_PROMPT_CHARS` = 8000, must be > 0) is the SERVER bound on
the trimmed prompt: `composeRun` throws above it (no agent ⇒ the default applies), so `run` maps
it to `AiError('invalid', 400)` before any network call and the reserved credit is refunded.
Set it to the tool's client `maxLength` (the client bound is a convenience, a direct POST is
not bounded by it); the body is
the system prompt with `{locale}` (and any `{input}`-style) placeholders. The former
`input: none|optional|required` field is REMOVED — in the unified model the prompt is always
the user message and always required, so an "expects/doesn't expect a prompt" guard was dead
and contradictory. Parser: `lib/ai/parse-agent.ts` (fail-fast, BOM/CRLF tolerant).

## Skill contract — `capabilities/skills/<id>/SKILL.md` (+ resource files/subdirs)

A skill is a DIRECTORY, not a flat file. The manifest `SKILL.md` has `---` frontmatter with
`name` and `description` REQUIRED.

Axons-specific fields should live under `metadata:` to avoid conflicting with editor-owned
agent schemas, such as VS Code agent validation. The supported metadata keys are:

- `metadata.inputs`
- `metadata.outputs`
- `metadata.model`
- `metadata.temperature`
- `metadata.maxTokens`
- `metadata.timeoutMs`

`metadata.inputs` and `metadata.outputs` are YAML lists, either inline:

```yaml
metadata:
    inputs: [locale, namespace]
    outputs: [messages patch]
```

or block-style:

```yaml
metadata:
    inputs:
        - locale
        - namespace
    outputs:
        - messages patch
```

`metadata.model`, `metadata.temperature`, `metadata.maxTokens`, and `metadata.timeoutMs` are
optional scalars. Defaults are:

- `model`: `openrouter/free`
- `temperature`: `0.3`
- `maxTokens`: `2000`
- `timeoutMs`: `25000`

Legacy top-level `inputs`, `outputs`, `model`, `temperature`, `maxTokens`, and `timeoutMs`
fields remain accepted as fallback during migration. However, when both legacy top-level
fields and `metadata` fields are present, `metadata` wins.

`metadata.outputs` is currently descriptive. It is not enforced as a response schema by
`skill-pure.ts` or `skill-io.ts`.

The body is the procedure, with `{placeholder}` substituted from caller-supplied `inputs`.
Every other file in the directory is a RESOURCE loaded alongside the manifest.

Adding a skill: drop `capabilities/skills/<id>/SKILL.md` (+ resources), then POST `/api/run`
with `{ prompt, skillId, inputs }`; the route stays thin.

Recommended example:

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

## Language invariant

`AGENTS.md`, `docs/**`, every `capabilities/agents/*.md` body, and every
`capabilities/skills/**/SKILL.md` (frontmatter values + body) are written in ENGLISH — they
are model-facing and English yields stable behavior. NEVER localize them. The reply LANGUAGE
is driven by the `{locale}` placeholder (agents) or caller-supplied `inputs.locale` (skills),
not by the file's language. Only user-facing copy is localized, in `messages/`.

## Deploy note (known risk, not introduced by the `capabilities/` rename)

`capabilities/` files are read at runtime via `process.cwd()` and are NOT imported, so the
function tracer does not include them by default. Under Turbopack builds
`outputFileTracingIncludes` is not applied (vercel/vercel#17554), so there is no clean
config-side fix today. The rename does not change this (`next.config.ts` references neither
the old nor the new path); if a serverless invocation ever fails on a missing `.md`/`SKILL.md`,
the fix is to ship the content as imported modules or via a tracked mechanism, NOT to edit
`next.config.ts` with a flag Turbopack ignores.

## Rate limit

Two server layers run BEFORE the model, in both `/api/run` and `/api/hello` (one shared
counter, like the client quota):

1. `hitRateLimit` (`lib/ai/rate-limit.ts`): free, in function memory, per instance. A cheap
   filter against naive floods, NOT a quota.
2. `reserveQuota` (`lib/ai/quota.ts`): the OPPOSABLE quota, on Netlify Blobs (store
   `ai-quota`, `consistency: "strong"`). Three limits: burst per minute per IP
   (`AI_RATE_PER_MIN`), daily per IP (`NEXT_PUBLIC_AI_DAILY_LIMIT`, the SAME value the client
   reads via `constants/site.ts`), and a global daily cap across all IPs
   (`AI_GLOBAL_DAILY_CAP`). Days are cut in `NEXT_PUBLIC_AI_QUOTA_TZ` (UTC when empty) by the
   pure `lib/day.ts`, shared by `lib/usage.ts` (client counter), `lib/ai/quota-pure.ts` (keys,
   `Retry-After`) and the purge function — never compute a "day" anywhere else.

Every store round (reserve AND refund) is bounded by `withDeadline` (`STORE_DEADLINE_MS`,
4 s). `@netlify/blobs` silently retries 429/5xx/network errors (5 × 5 s): unbounded, the
function is killed by Netlify (~30 s, opaque 502) before the fail mode ever applies. A
`QuotaTimeoutError` is handled like any store failure (`AI_QUOTA_FAIL_MODE`). The Blobs
client gets a logging `fetch` that records each failed HTTP status as `[ai:quota] blobs HTTP
<status>` (never the URL: it may carry a signed token); 404 and 412 are normal protocol replies.

The Blobs client MUST get `blobsFetch` (`lib/ai/quota.ts`), never the global `fetch`. Inside
a Route Handler the global `fetch` is patched by Next, which `tee()`s every response for its
cache; Blobs does `await res.body.cancel()` on a 404, and cancelling one tee branch never
resolves while the other is open: the first CAS read hangs forever (observed in production).
`blobsFetch` uses Next's original fetch (`_nextOriginalFetch`, `cache: "no-store"`, which also
keeps quota counters out of Next's cache) and fully buffers the body (`bufferResponse`) as a
fallback if that internal property ever disappears.

Reserve-then-refund, never check-then-count: the credit is reserved atomically before the
model call; `refundQuota(ticket)` gives the daily, burst and global credit back when `run`
throws or the reply is empty: only USEFUL replies count, matching the client (in-flight calls
keep their burst slot, which bounds per-IP parallelism). Error codes: daily/global denial =
`rate` ("try tomorrow"); burst, `hitRateLimit` and provider 429 = `busy` (transient, "retry
in a moment") — never show the daily-limit message for a transient limit. Atomicity comes from conditional
writes (`setJSON` with `onlyIfNew` / `onlyIfMatch: etag`, retried with jittered backoff);
burst and daily share ONE per-IP record, so they are decided in one compare-and-swap.
Ordering: IP record, then global; a global refusal or failure refunds the IP credit. Denials
answer `429` code `rate` with `Retry-After`.

Logic split for the 100%-branch rule: `lib/ai/quota-pure.ts` (config, keys, IP
normalization, decisions) and `lib/ai/quota-core.ts` (CAS engine on an injected `CasStore`,
plus the in-memory store) are pure and unit-tested; `lib/ai/quota.ts` is the IO adapter.

Rules that must hold:

- IPs are stored only as HMAC-SHA256 with `AI_QUOTA_SECRET` (server-only, >= 32 chars). An
  IPv6 address counts as its /64 prefix, otherwise one subscriber rotates addresses forever.
- Fail mode: if the store is missing, misconfigured (no secret) or failing in production,
  `AI_QUOTA_FAIL_MODE=closed` (default) answers `503` code `provider`; `open` lets the call
  through. Both log `[ai:quota]` via `console.error`. Never fall back to memory silently in
  production. Outside production the in-memory store is used (kept on `globalThis` so every
  route shares it; the dev reset button clears BOTH the client counter and this store via
  `POST /api/dev/reset-quota`, which answers 404 outside `next dev`).
- Netlify Blobs has NO TTL. Keys are prefixed by the quota day (`<day>/ip/<hash>`,
  `<day>/global`) and the scheduled function `netlify/functions/ai-quota-purge.ts` deletes
  past days daily. It must import only pure code (no `server-only`).
- The global counter is a single hot key: conditional writes serialize it (roughly tens of
  reservations per second). Past that, shard it rather than raising retries.
- The quota is not a financial guarantee. The hard cap is a credit limit on the OpenRouter
  key; set it on every deployment that uses a paid model.

## Caching, response safety & abuse guardrails

Next 16 does NOT guarantee a Route Handler is uncacheable by default; never assume the
previous version's behavior. An OpenRouter reply is user-specific and costly, so a shared
cache could mix user data or serve a stale answer. Ensure AI handlers are not cached
(shared) — make the intent explicit at the handler (e.g. force-dynamic / no-store semantics
appropriate to the installed Next), rather than relying on a default. Verify the current
`app/api/run/route.ts` against the file on disk before claiming compliance.

The model's output is TEXT. Render it as text (the toast escapes it); NEVER interpret it as
HTML or code (`dangerouslySetInnerHTML`, eval, or piping it into a renderer is forbidden).
Generated HTML/code stays server-side and is never sent to the client.

If `OPENROUTER_API_KEY` is absent, answer `503` "service not configured" — do NOT let it
surface as a confusing `502` provider error. Bound the prompt and each input server-side
(the parsers already slice to 10 000 chars); enforce that bound at the edge of `run`.

A size cap is NOT an abuse shield. Real protection needs authentication (if the product
allows), durable rate limiting, and cost rules at the provider — the in-memory per-IP limit
and the client quota are convenience, not security; the durable layer is `reserveQuota`
(see the Rate limit heading). For a progressive UI, `generateText` is
non-streamed; if you later want streaming, use `streamText` + flux adaptation in the handler,
and validate it THROUGH the Netlify adapter, not only in `next dev` (local dev proves
nothing about function limits, prod env, or platform cache). Keep `timeoutMs` + the 4 s quota
deadline BELOW the Netlify function limit (observed ~30 s), or the function dies before the
model replies and the client gets an opaque 502 instead of `timeout`.
