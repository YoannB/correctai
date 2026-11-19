# Articles & Markdown collections (content, localized URLs)

## Storage & front matter

One folder per article, one Markdown file per locale: `content/articles/<id>/<locale>.md`.
`<id>` is the STABLE identifier (kebab-case, never shown in a URL, never translated). Each file
opens with a YAML header closed by `---`:

```yaml
---
title: "Human title (page h1 + <title>)"
slug: translated-kebab-slug # last URL segment, unique per locale
date: 2026-11-10 # publication day YYYY-MM-DD (quoted or not: YAML 1.2 keeps it a string)
description: "One sentence: meta description, listing summary, social cards."
image: /articles/<id>/cover.png # optional, site-absolute, file in public/articles/<id>/
archived: true # optional boolean: Archive badge; false exempts this translation from archiveBefore
---
```

The body is GitHub-flavored Markdown. Prettier formats the prose but NOT the code inside
fenced blocks (`.prettierrc.json` override: `embeddedLanguageFormatting: "off"` for
`content/**/*.md`), so article snippets stay as written. Fenced code blocks name their language
(` ```js `, `ts`, `bash`/`sh`, `html`/`xml`, `css`, `scss`, `stylus`, `json`, `yaml`,
`markdown`, … — lowlight's `common` set + `stylus`); see _Code highlighting_ below. Do not repeat the title as `# Heading` (a body `h1` is
demoted to `h2`; the page title is the `h1`). Raw HTML in the body is NOT interpreted
(`react-markdown`, no `dangerouslySetInnerHTML`). Social cards: every entry shares as a generated
1200x630 PNG (title, description, collection badge) into which the cover is embedded as a
thumbnail when it is PNG, JPEG or SVG (other formats are skipped); see docs/seo-layout.md →
Social images.

Validation is fail-fast at BUILD time (`lib/articles/parse.ts`): a missing/empty field, a bad
slug or date, a non-boolean `archived`, a relative image, an empty body, an unclosed header or a slug used twice in the
same locale throws with the file path. Never "fix" a failing build by catching that error.

## Code map

The articles are the DEFAULT Markdown collection; everything below applies to every
collection ("reminders", …), with `content/<collection>/` in place of
`content/articles/`. See _Collections_ for declaring one.

- `lib/articles/parse.ts` — PURE (no fs, no next-intl), 100% branch-covered by
  `tests/unit/articles-parse.test.ts`: front-matter split, validation, catalog (grouping, sort
  newest first by latest translation date then id), fallback resolution, listing, slug lookup.
- `lib/articles/status.ts` — PURE, 100% branch-covered by `tests/unit/articles-status.test.ts`:
  badge rules (`validateRules`, `resolveRules`), `isArchived`, `entryStatus` (today INJECTED),
  `pickLatest` (the "latest" block). See _New and archive badges_.
- `lib/articles/source.ts` — `server-only` IO: reads `content/<collection>/` via `process.cwd()`,
  cached per render and collection (`React.cache`), feeds `routing.locales` /
  `routing.defaultLocale`. `getCollectionCatalog` / `getEntries` / `getEntry` take the collection
  id; `getCatalog` / `getArticles` / `getArticle` are the articles shortcuts; `collectionToday(locale)` is
  the request's calendar day in next-intl's `timeZone`.
- `components/content/CollectionPages.tsx` — page FACTORIES `collectionListing(id)` and
  `collectionEntry(id)` (metadata + page, `notFound()` when the collection is off or the slug is
  unknown). `app/[locale]/articles/page.tsx` and `app/[locale]/articles/[slug]/page.tsx` only
  delegate to them.
- `lib/articles/collections.ts` — PURE, 100% branch-covered by `tests/unit/collections.test.ts`:
  `CollectionConfig`, `validateCollections`, `findCollection`, `hiddenHrefs`.
- `constants/site.ts` — `ARTICLES_COLLECTION`, `COLLECTIONS` (validated at build),
  `COLLECTION_DEFAULTS`, `getCollection`, `HIDDEN_HREFS`.
- `components/content/ArticleTeaser.tsx` (server-compatible card), `ArticleFeed.tsx` (server:
  date formatting + fallback badge + status badges, `collection` prop), `EntryBadges.tsx` (New /
  Archive badges through the neutral `Chip`), `ArticleBody.tsx` (Markdown renderer + server-side
  code highlighting); `components/home/LatestArticles.tsx` (3 most recent non-archived entries of a
  collection, `collection` prop, default articles; renders nothing without entries).
- `lib/comments.ts` — PURE comment rules (config resolution, per-collection switch, thread
  identity, Disqus language); `components/content/EntryComments.tsx` (client: consent gate +
  on-demand Disqus), `CommentsGate.tsx` (neutral placeholder, story), `DisqusThread.tsx` (the only
  `disqus-react` import). See _Comments_.
- `lib/seo.ts` — `articleMetadata` (with the entry's social image, `/og/<locale>/<route>/<slug>.png`)
  / `articleJsonLd` (optional `itemHref` / `schemaType`) /
  `articlePath` / `entryPath`; `app/sitemap.ts` adds one entry per served translation of every
  ENABLED collection.

## Cards without an image

`ArticleTeaser`'s thumbnail is the front-matter `image` when there is one. Otherwise it is a
typographic cover (`.article-teaser__cover`, `styles/articles.css`) showing the entry's FULL
title, clamped by CSS (`line-clamp`: 4 lines in the 200px desktop thumb, 3 in the wide mobile
one, whole words per line, ellipsis at the end), sized on the thumb's width (container query
units), with the collection's `title` message (`collectionLabel`, passed by `ArticleFeed`) as a
small label above it. Server-rendered, no client JS. The whole thumb link stays decorative
(`aria-hidden`, `tabIndex={-1}`): the heading link is the only title assistive tech reads.

Colours come from the tokens only: `--text-1` on a light tint of `--accent-1` / `--accent-2`
over `--surface-2` (tint strength `--cover-tint-1` / `--cover-tint-2`, lower in light mode),
plus a full-strength accent bar on the leading edge. Text stays AA in both themes whatever the
accent hue; recolour the cover through its tokens in `styles/tokens.css`, never in
`components/content/`. Keep the text on the TINT (never on the raw accent
gradient: white on `--accent-2` is ~1.8:1).

## New and archive badges

Two optional, generic statuses, shown as TEXT badges (neutral `Chip`, label in `--text-1` on a
tinted chip: AA in both themes) on every card (`ArticleTeaser`) and next to the date on the entry
page. Labels live in `messages/<locale>.json` → `entryStatus` (`new`, `archive`, `archiveNotice`).

Rules, in `constants/site.ts` (both OPTIONAL; absent = no badge at all):

```ts
// Every collection, the articles included:
export const COLLECTION_DEFAULTS: CollectionDefaults = { newForDays: 90, archiveBefore: "2018-01-01" };
// One collection overrides it (each field separately; 0 switches New off for it):
{ id: "reminders", /* … */ newForDays: 0, archiveBefore: "2016-01-01" } // in COLLECTIONS
```

- **New**: `0 <= days(today − date) < newForDays`, days counted in CALENDAR days (a future date
  counts as new). `0` or absent disables the badge. An archive is never new.
- **Archive**: front matter `archived: true`, else `date < archiveBefore` (exclusive, YYYY-MM-DD).
  `archived: false` exempts one translation from the rule. Both forms exist on purpose: the rule
  archives a migrated back-catalogue in one line, the flag handles exceptions either way. The
  entry page adds a short notice (`entryStatus.archiveNotice`) above the body: the content is old
  and kept as it was.
- Validation fails the build on a negative / non-integer `newForDays`, a malformed
  `archiveBefore` (site defaults and each collection) or a non-boolean `archived`.

**Testing the badges.** The demo publishes NO archived (or new) entry: a fixture article would
show on the public site. The rules are unit-tested (`tests/unit/articles-status.test.ts`, today
injected), the status → badge mapping and the card in `tests/unit/entry-badges.test.tsx`, and the
render of an archive in `tests/unit/collection-entry-archive.test.tsx`: an in-memory entry (the
content source is mocked) goes through the real `collectionEntry` page and `ArticleFeed`, which
must show the Archive badge and the notice, never New, and no comments. Storybook shows the card
(`ArticleTeaser` → `ArchivedEntry`, `ArchivedFallback`). The e2e only checks that the default
rules show no badge. To SEE an archive locally, set `archived: true` on a demo translation (or an
`archiveBefore` after its date) and do not commit it.

**How "New" disappears.** "Today" is `collectionToday(locale)`: `getNow()` read in next-intl's
`timeZone` (`i18n/request.ts`, the zone the site's dates are read in), turned into a calendar day
by `lib/day.ts` `dayIn`. Every route under `[locale]` renders ON DEMAND (`ƒ` in the build output:
the root layout resolves the locale per request), so the badge is computed per request on the
server and disappears on the first request after the window, with no rebuild, no revalidation and
no client code (hence no hydration mismatch). If a page under `[locale]` ever becomes static
(prerendered), the badge would freeze at BUILD time and only change on the next build/deploy:
re-check the build output before making such a change, and never move the computation to the
client (server and client days differ around midnight → hydration mismatch).

**The "latest" block** (`LatestArticles`, `pickLatest`): the 3 most recent NON-archived entries
under `latestTitle`. When every entry of the collection is an archive, it shows the 3 most recent
archives under `archivesTitle` (each with its Archive badge) instead of disappearing: a site whose
content is all old keeps a home block, but never presents it as news. With the defaults
nothing is archived, so the block is unchanged.

## Comments (Disqus, behind consent)

Optional comments under the NON-archived entries of chosen collections. Off by default: without
configuration nothing renders, no Disqus code ships, the CSP and the cookie banner are unchanged.

Configuration (`constants/site.ts`; pure rules in `lib/comments.ts`, 100% branch-covered by
`tests/unit/comments.test.ts`):

```ts
const COMMENTS_PROVIDER: SiteComments = { provider: "disqus", shortname: "my-forum" }; // shortname optional
export const COLLECTION_DEFAULTS: CollectionDefaults = { comments: true }; // every collection
{ id: "reminders", /* … */ comments: false } // in COLLECTIONS: a collection's own value wins
```

- **Shortname priority**: `NEXT_PUBLIC_DISQUS_SHORTNAME` (build-time, inlined) WINS over
  `COMMENTS_PROVIDER.shortname`, so one codebase can point a preview at another forum. The env
  alone never turns comments on: a provider must be declared. No shortname from either source =>
  off. A malformed shortname (anything but letters, digits, inner hyphens) fails the build, and so
  does a non-boolean `comments`.
- **Active** (`COMMENTS_ENABLED`) = resolved shortname AND at least one enabled collection with
  comments. It switches on the `comments` consent purpose (`CONSENT_REQUIRED` becomes true), the
  `when: ["comments"]` legal paragraphs (docs/i18n.md → Legal copy follows the site switches) and
  the Disqus CSP origins (docs/architecture.md → Security headers).
- **The demo**: `COMMENTS_PROVIDER = { provider: "disqus" }` + `COLLECTION_DEFAULTS = { comments: true }`
  with NO shortname, so the preview shows comments only when Netlify has
  `NEXT_PUBLIC_DISQUS_SHORTNAME` (Site configuration → Environment variables, scope Builds, then
  redeploy: the value is inlined at build). CI sets a FAKE one for the e2e specs.

Where: `collectionEntry` (`components/content/CollectionPages.tsx`) renders `EntryComments` after
the `<article>` only when the collection has comments AND `entryStatus(...).isArchived` is false.
Never on an archived entry, a listing or any other page.

Thread identity (`disqusThreadConfig`): `identifier` = `<collection>/<entry id>/<locale>`, stable
across URL and slug changes; `url` = the translation's ABSOLUTE canonical URL (`entryUrl`, on
`SITE_URL`); `title` = the front-matter title; `language` = the Disqus code of the locale (`fr`,
`en`, `es_ES`, `de`, `it`, `pt_EU`; unknown => `en`). ONE THREAD PER TRANSLATION, on purpose: a
Disqus thread stores a single URL and title, readers answer in the page's language, and moderation
emails and "recent comments" would otherwise point every language at whichever translation opened
the thread first. Changing this scheme orphans existing threads (Disqus has a URL/identifier
mapper, but plan it as a migration).

Consent (CNIL): Disqus places third-party cookies, so NOTHING is requested from it before an
explicit choice. `EntryComments` (client) first renders `CommentsGate`: a notice naming Disqus as a
third-party service, a link to its privacy policy, "Show comments" (this page only, local state set
in the click handler) and "Always show comments" (`allowComments`: records the `comments` purpose,
other purposes unchanged, refused when none was chosen yet). The cookie banner lists the configured
purposes, `comments` included, and "Accept" grants it. The consent's server snapshot is `null`, so
SSR and hydration always render the placeholder; a returning visitor who granted the purpose sees
the thread load right after hydration. Refusing never hides the entry. Withdrawing a granted
purpose reloads the page, as for GTM (an injected Disqus cannot be unloaded). A consent cookie
written before this feature has no `comments` field: it reads as refused (never implied).

Loading: `disqus-react` (`DiscussionEmbed`) is imported ONLY by `components/content/DisqusThread.tsx`,
itself loaded through `next/dynamic` with `ssr: false` once the visitor chose: no Disqus JS in any
page bundle, and no request before the choice (`tests/e2e/comments.spec.ts` aborts every Disqus
request and asserts none happens before the click or the consent). `disqus-react` requires
`prop-types` without declaring it; it resolves to the copy MUI already installs.

Theme: the Disqus iframe is transparent over `--bg-0` and picks light or dark ONCE, from the text
colour around `#disqus_thread` (`.entry-comments__thread { color: var(--text-1) }`). A theme toggle
therefore RELOADS the thread: `DisqusThread` subscribes to the `data-theme` attribute of `<html>`
(MutationObserver through `useSyncExternalStore`, no effect state) and keys `DiscussionEmbed` on
it, so the remount happens after the new colours are painted.

Disqus side (its admin, not this repo): set the Website URL, add the production and preview hosts
to Trusted Domains, and review the Ads settings (free plans may show ads inside the thread).

## Code highlighting

`ArticleBody` runs `rehype-highlight` (highlight.js grammars through lowlight) INSIDE the
Markdown render, so tokens are `<span class="hljs-…">` in the server HTML: no client JS, the
article stays a static Server Component. Colours are the `--code-*` tokens (`styles/tokens.css`,
dark + light overrides, every token >= 6:1 on `--bg-0`, i.e. AA) applied by `styles/articles.css`.
Auto-detection is OFF: a block without language, or with an unregistered one, stays plain text
(rehype-highlight records a vfile message, nothing throws). To support another language, import
its grammar from `highlight.js/lib/languages/<name>` and add it to `HIGHLIGHT_OPTIONS` in
`components/content/ArticleBody.tsx` (+ a case in `tests/unit/article-body.test.tsx`).
Chosen over Shiki: synchronous (fits `<Markdown>`, no `MarkdownAsync`), class-based (themeable
with tokens, no inline colours), ~6 MB installed vs ~11 MB (TextMate grammars + WASM engine).
`highlight.js` is a direct dependency only for the extra grammars: keep its range equal to the
one `lowlight` declares (`~11.11.0` today), or npm installs a second copy (`npm ls highlight.js`
must show `deduped`).

## Locales, fallback, SEO

Only SERVED locales count (`NEXT_PUBLIC_LOCALES`): files of other locales stay in the repo but
are not published; an article with no served translation is dropped. When the visited locale
has no translation, the listing shows the article in its fallback language (default locale,
else the first served one that has it) with a language badge, linking to the ORIGINAL's own URL (teaser hrefs are built by `entryPath`,
like the sitemap: no prefix for the default locale; next-intl `<Link locale>` would force one and
cost a 307 per click):
no duplicate page is ever generated. hreflang lists only the translations that exist; canonical
is the page's own locale URL; x-default is the default-locale version, else the page itself.
The article page also emits a schema.org `BlogPosting` (JSON-LD, `<` escaped).

Localized URL segments live in `i18n/pathnames.ts` (`/articles`, `/articles/[slug]`); the slug is
the per-locale front-matter `slug`. The language switcher cannot translate a slug by itself: on
a dynamic route it reads the page's own `<link rel="alternate" hreflang>` at click time
(`lib/locale-switch.ts`, pure) and falls back to the parent route (the listing) when the target
locale has no translation.

## Runtime & deploy

Routes under `[locale]` render on demand (the root layout resolves the locale per request), so
the Markdown files must ship with the server function. The literal
`path.join(process.cwd(), "content")` in `lib/articles/source.ts` is picked up by the file tracer,
which then ships the WHOLE `content/` folder (every collection) with each function importing it;
the collection folder is joined at run time. Verify in
`.next/server/app/[locale]/<route>/[slug]/page.js.nft.json` (every `content/**/*.md` listed). Keep
that literal form, never build the content root from a variable.

Collection entry routes have NO `generateStaticParams`, on purpose: nothing under `[locale]` is
prerendered anyway, and when a served locale had no entry at all Next classified the route as
SSG, so every entry page failed in production (500, `DYNAMIC_SERVER_USAGE`). Do not add it back. An unknown slug renders the 404 page as a SOFT 404 (HTTP 200 +
`robots: noindex`): `app/[locale]/loading.tsx` starts streaming before `notFound()` runs, the
same as every other page under `[locale]`.

## Turning the section off

`ARTICLES_ENABLED` (`constants/site.ts`) is the single switch. `false` removes every article
surface at once: the `/articles` nav entry (header, footer, HTML sitemap page), the home
"latest articles" block, the `sitemap.xml` entries, and both routes (`notFound()`). `content/articles/` is left untouched (the files are simply not
published) and `tests/e2e/articles.spec.ts` skips itself. Do not delete the routes or the
`pathnames` entries to turn the section off: flipping the constant back must be enough.

## Collections (more Markdown sections)

A collection = one entry in `COLLECTIONS` (`constants/site.ts`) + its folder + its routes:

1. `content/<id>/<entry>/<locale>.md`, same front matter and rules as articles (`<id>` kebab-case).
2. Both routes in `i18n/pathnames.ts`: the listing (e.g. `"/reminders"`) and the entry, ending with
   `/[slug]` (e.g. `"/reminders/[slug]"`, translated per locale like any pathname).
3. `{ id, enabled, href, itemHref, namespace, schemaType }` in `COLLECTIONS`: `enabled` is its
   on/off switch, `namespace` its messages (`title`, `intro`, `empty`, `publishedOn`, `onlyIn`, in
   every locale, in `messages/<locale>.json`; plus `latestTitle`, `archivesTitle`, `viewAll`
   if a home renders its "latest" block), `schemaType` its JSON-LD type (`BlogPosting`,
   `TechArticle`, `Article`). Optional `newForDays` / `archiveBefore` override
   `COLLECTION_DEFAULTS` (see _New and archive badges_).
4. Two page files that only delegate:
   `app/[locale]/<route>/page.tsx` → `const page = collectionListing("<id>")`, exporting
   `generateMetadata = page.generateMetadata` and `default page.Page`;
   `app/[locale]/<route>/[slug]/page.tsx` → same with `collectionEntry("<id>")`.
5. Optionally a nav entry `{ href: "<listing href>", key: "nav.<id>" }` in `NAV`
   (`constants/site.ts`: header, footer, HTML sitemap page).

Validation fails the build on a non kebab-case or duplicate id, a dynamic listing `href`, an
`itemHref` not ending with `/[slug]`, or a page file naming an unknown collection. A disabled
collection behaves like `ARTICLES_ENABLED = false`: both routes answer 404, its nav entry and its
`sitemap.xml` entries disappear (`HIDDEN_HREFS`). Fallback language, hreflang, canonical and
the slug-aware language switch work as for articles (the switcher reads the page's alternates).
The home can render a collection's "latest" block with `<LatestArticles locale={locale}
collection="<id>" />` (section id `latest-<id>`), or a plain list with
`<ArticleFeed items={getEntries("<id>", locale, 3)} locale={locale} collection="<id>" />`: pass
`collection` (not only `namespace` / `itemHref`) so the badges follow that collection's rules.

## Adding an article (one article = one PR)

Create `content/articles/<id>/` with one `<locale>.md` per supported locale (translate the
`slug`, keep `date` identical), put any image in `public/articles/<id>/`, run the Definition of
done, open a PR. The article is online after the Netlify redeploy of `main` (a few minutes),
not on a simple refresh. The E2E `tests/e2e/articles.spec.ts` (and `comments.spec.ts`) rely on the two demo
articles (`writing-articles`, `architecture-tour`): replacing the demo content means updating those specs.
