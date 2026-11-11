# Text tools kit (`lib/text/` + text-tool components)

Generic pieces for any app whose core is "the user gives a text, a tool returns another
text" (proofreading, rephrasing, summarizing with a visible delta, template filling). The
kit is AI-agnostic: it compares two strings; where the second string comes from (a model
reply, a fixed reference, a rule engine) is the app's business. Domain rules built on top
(for example an AI-disclosure verdict from the kind of edits) belong to the derived app,
NOT here.

## Pure logic (100%-branch rule, see `docs/testing.md`)

- `lib/text/diff.ts` — `tokenize` (whitespace kept as tokens, punctuation split from words),
  `diffWords(before, after)` → `DiffOp[]` (`equal | insert | delete | replace`, `old` on
  replace), `rebuildAfter` / `rebuildBefore` (both lossless). Alignment equality = same raw
  token OR same skeleton (case/accent/apostrophe-insensitive), so an accent fix is a visible
  `replace` and an inserted comma does not shift the alignment. Only two non-whitespace
  tokens fuse into a `replace`. LCS is O(n·m) in tokens: ALWAYS bound the input upstream
  (`Textarea maxLength`, and the server bound on `/api/run`: the agent's `maxPromptChars`, see
  _Agent contract_ in `docs/ai-capabilities.md`).
- `lib/text/similarity.ts` — `diffStats` (whitespace-only ops ignored), `similarityPercent`
  (one edit = one unit against the longer side's word count, clamped to [0, 100]),
  `bandFor(percent, bands?)` with `DEFAULT_BANDS` 100 / 95 / 90 / 0. Bands are data: pass your
  own; always include `min: 0` (an uncovered value throws, it is an authoring error). Labels
  live in `messages/` (`textTools.bands.*`), never in the lib.

- `lib/text/detect-language.ts` — `detectLanguage(text, fallback)`: stop-word vote among the six
  shipped locales (accent/apostrophe-insensitive tokens), `fallback` when nothing matches. A
  hint to preselect a language flag next to an editor, NOT a classifier (short or mixed texts
  can fail); derive it at render, never store it.

## Components (neutral API, `components/ui/`)

- `Textarea` — `maxLength` (native), `showCount` (counter OUTSIDE `.mui-field` so the rotating
  focus ring keeps hugging the field), `readOnly` (focusable, unlike `disabled`). Height is
  fixed by `rows` (no auto-grow).
- `DiffView` + `DiffLegend` — renders ops as React text in `<ins>/<del>/<mark>`. NEVER
  `dangerouslySetInnerHTML`: model output is text (see _Caching, response safety_ in
  `docs/ai-capabilities.md`). Its box copies the MUI multiline field (1rem, line-height
  1.4375em, 16.5px 14px padding), so `rows` equal ⇒ heights equal. Change both together.
- `EditorPair` — source | result in one grid row (equal tracks), stacked below 900px
  (start, action, end). `endId` is the scroll target after a call on small screens.
- `ChoiceChips` (MUI adapter) — single-choice radiogroup with roving tabindex; arrows move
  and select. Use it for examples/presets; `disabled` while an AI call is pending.
- `AiNotice` — disclosure lines (third-party provider, free-model quality, wait). Lines are
  passed translated (`messages/*.json` → `aiNotice`), so it stays free of next-intl.
- `Gauge tone` — `success | info | warning | error` recolors the arc (CSS beats the gradient
  attribute); map your bands to tones in the app.
- `CopyButton disabled` — copy the plain result text (never markup). `label` / `copiedLabel`
  replace the generic showcase copy; `onCopied` runs only once the clipboard write resolved
  (e.g. a toast).
- `Textarea` / `Input` `ariaLabel` — accessible name when the field has no visible `label` (a
  placeholder is not a name); ignored when `label` is set.

## Hooks

- `useDirtyGuard(isDirty)` — `run(action)` executes now, or opens a confirmation when the
  input is dirty; wire `open/confirm/cancel` to `<ConfirmDialog>`. `isDirty` is DERIVED at
  render by the caller (e.g. `input.trim() !== "" && input !== loadedExample`).
- `useElapsedSeconds(since)` — whole seconds since a `Date.now()` value; pair it with
  `useAiPendingSince()` (set by `store.setAiPending`) to show the wait on a pending button.
  A clock read through `useSyncExternalStore`: no setState in an effect.

## Wiring a real tool (pattern, not code to copy blindly)

1. Keep the source text in component state; bound it with `maxLength`.
2. `useAiCall("/api/run", buildBody, onSuccess)` with module-level `buildBody` and a stable
   `onSuccess` that stores the reply and scrolls `endId` into view when stacked. The hook keeps
   the pending guard, the quota and the error toasts; do not re-implement them.
3. Render `diffWords(source, reply)` in a `DiffView` with the same `rows` as the `Textarea`;
   compute `similarityPercent` and `bandFor` at render (no effect).
4. Disable the `Textarea`, `ChoiceChips` and reset while `pending`; guard example/reset with
   `useDirtyGuard`; show `AiNotice` under the action.
5. When the source changes after a reply, the old diff is stale: derive "stale" at render
   (`source !== sourceOfReply`) and show the placeholder instead of a misleading diff.

There is deliberately NO text-tool demo on the Axons home page: a before/after editor is a
product (e.g. a proofreading app), not a boilerplate section. The pieces are documented and
exercised in Storybook (`UI/DiffView`, `UI/EditorPair`, `UI/ChoiceChips`, `UI/AiNotice`,
`UI/Textarea`, `UI/Gauge`) and the pure logic in `tests/unit/text-*.test.ts`. `messages/*.json`
keeps the reusable `aiNotice` copy.
