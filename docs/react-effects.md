# React state, effects, store & hydration

## Effects discipline ("You Might Not Need an Effect")

- No synchronous `setState` in a `useEffect` body to mirror props or derive state; derive
  during render (e.g. `useTheme().effective`, resolved icon mode).
- Subscribe to external stores with `useSyncExternalStore` (`hooks/use-store.ts`,
  `hooks/use-media-query.ts`), not Effect + setState.
- React to user intent in event handlers (`setMode`, `decide`, `call`, `switchTo`, reset).
- Effects ONLY to synchronize an external system: a non-destructive DOM mutation
  (`documentElement.dataset.theme`), a third-party script append, or an
  IntersectionObserver/matchMedia subscription. Inside such Effects, `setState` may be
  called only from the external system's callback, never to recompute React state from
  React state.

## Never destructively mutate a React-owned DOM node

A pre-hydration splash rendered in layout JSX belongs to the React tree; `el.remove()`
corrupts reconciliation (`NotFoundError: insertBefore/removeChild`). Hide via a CSS class
(`.is-leaving` → opacity/visibility/pointer-events); the node stays inert. The only allowed
Effect DOM mutations are additive/non-destructive on nodes React does not own.

## Keeping public pages static + client-only data

Do NOT read `cookies()`, `headers()`, or `searchParams` in Server Components/layouts of
public pages (makes the route dynamic). Theme, cookie consent, and the daily counter are
client-only, hydrated SYNCHRONOUSLY in the `lib/store.ts` constructor (reading window/cookie
during render via `useSyncExternalStore`'s client snapshot). `getServerSnapshot` returns
deterministic defaults → no hydration mismatch, no cascade. The boot script (see
_Boot-script placement_ in `docs/architecture.md`) prevents FOUC/banner-flash without React state.

## Theme persistence & single source of truth

All `localStorage` keys are declared ONLY in `lib/storage.ts` (`LS_USAGE`, `LS_THEME_MODE`, and
any new one next to them, never a string literal elsewhere);
never redeclare them in `lib/store.ts` (duplicate = divergent sources = broken hydration).
The theme mode is persisted TWICE on user intent: a cookie (read by the boot script before
hydration) and localStorage (read by `hydrateClient` on next load). Reading persisted
theme/consent/usage is centralized in `lib/store.ts` `hydrateClient`; `hooks/use-theme.ts`
only derives, syncs the DOM, and writes — it never re-reads storage. (The MUI-theme build
and light-mode tokens live in `docs/ui-material.md`.)

Single source of the painted theme: BEFORE hydration the boot script (`lib/boot-script.ts`,
built from the `LS_THEME_MODE` / `COOKIE_THEME` constants) sets `data-theme`, resolving the mode
exactly like `hydrateClient` (localStorage JSON-decoded first — `writeLS` stores `"dark"` WITH
quotes —, then the cookie, then `prefers-color-scheme`). AFTER hydration `useTheme`'s Effect
writes `data-theme`, but ONLY from client snapshots: it is gated by `useHydrated()`
(`hooks/use-hydrated.ts`, a `useSyncExternalStore` whose server snapshot is `false`). During the
hydration render every store reads its SERVER snapshot (`themeMode: "system"`,
`prefersDark: false`), so an ungated Effect wrote `light` over the boot script's `dark` — a flash
for every dark-system visitor and every explicit choice that differs from the system. Rule: an
Effect that writes the DOM must never act on values that are only server defaults.
`tests/e2e/theme-flash.spec.ts` records EVERY `data-theme` write (MutationObserver, old values
included) in both directions; a final-state assertion cannot catch a corrected flash.

## React 19 authoring notes

Functional-component `defaultProps` is gone: use parameter default values instead, and prefer
TypeScript prop types over runtime `propTypes` (React no longer checks function `propTypes`).
Use the modern JSX transform from the toolchain; never reach for `ReactDOM.render`. Tests go
through React Testing Library / `act`, not historical test APIs. View Transitions and Fragment
Refs are STABLE in React 19.3 — that is not a reason to adopt them: introduce an API only
when a concrete use case exists, and verify it against the actually-installed Next/React
versions. This project has repeatedly deleted speculative features; do not re-add them.
