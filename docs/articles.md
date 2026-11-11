# Articles (Markdown content, localized URLs)

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
---
```

The body is GitHub-flavored Markdown. Do not repeat the title as `# Heading` (a body `h1` is
demoted to `h2`; the page title is the `h1`). Raw HTML in the body is NOT interpreted
(`react-markdown`, no `dangerouslySetInnerHTML`). For social cards prefer PNG/JPG covers: most
networks ignore SVG `og:image`.

Validation is fail-fast at BUILD time (`lib/articles/parse.ts`): a missing/empty field, a bad
slug or date, a relative image, an empty body, an unclosed header or a slug used twice in the
same locale throws with the file path. Never "fix" a failing build by catching that error.

## Code map

- `lib/articles/parse.ts` — PURE (no fs, no next-intl), 100% branch-covered by
  `tests/unit/articles-parse.test.ts`: front-matter split, validation, catalog (grouping, sort
  newest first by latest translation date then id), fallback resolution, listing, slug lookup.
- `lib/articles/source.ts` — `server-only` IO: reads `content/articles` via `process.cwd()`,
  cached per render (`React.cache`), feeds `routing.locales` / `routing.defaultLocale`.
- `app/[locale]/articles/page.tsx` (listing) and `app/[locale]/articles/[slug]/page.tsx`
  (article: `generateStaticParams` per locale, `notFound()` for any other slug).
- `components/content/ArticleTeaser.tsx` (server-compatible card), `ArticleFeed.tsx` (server:
  date formatting + fallback badge), `ArticleBody.tsx` (Markdown renderer);
  `components/home/LatestArticles.tsx` (3 most recent, renders nothing without articles).
- `lib/seo.ts` — `articleMetadata` / `articleJsonLd` / `articlePath`; `app/sitemap.ts` adds one
  entry per served translation.

## Locales, fallback, SEO

Only SERVED locales count (`NEXT_PUBLIC_LOCALES`): files of other locales stay in the repo but
are not published; an article with no served translation is dropped. When the visited locale
has no translation, the listing shows the article in its fallback language (default locale,
else the first served one that has it) with a language badge, linking to the ORIGINAL's own URL:
no duplicate page is ever generated. hreflang lists only the translations that exist; canonical
is the page's own locale URL; x-default is the default-locale version, else the page itself.
The article page also emits a schema.org `BlogPosting` (JSON-LD, `<` escaped).

Localized URL segments live in `i18n/routing.ts` (`/articles`, `/articles/[slug]`); the slug is
the per-locale front-matter `slug`. The language switcher cannot translate a slug by itself: on
a dynamic route it reads the page's own `<link rel="alternate" hreflang>` at click time
(`lib/locale-switch.ts`, pure) and falls back to the parent route (the listing) when the target
locale has no translation.

## Runtime & deploy

Routes under `[locale]` render on demand (the root layout resolves the locale per request), so
the Markdown files must ship with the server function. The literal
`path.join(process.cwd(), "content", "articles")` is picked up by the file tracer (verify with
`.next/server/app/[locale]/articles/[slug]/page.js.nft.json`); keep that literal form, never
build the root from a variable. An unknown slug renders the 404 page as a SOFT 404 (HTTP 200 +
`robots: noindex`): `app/[locale]/loading.tsx` starts streaming before `notFound()` runs, the
same as every other page under `[locale]`.

## Turning the section off

`ARTICLES_ENABLED` in `constants/site.ts` is the single switch. `false` removes every article
surface at once: the `/articles` nav entry (header, footer, HTML sitemap page), the home
"latest articles" block, the `sitemap.xml` entries, and both routes (`notFound()`, no
`generateStaticParams` output). `content/articles/` is left untouched (the files are simply not
published) and `tests/e2e/articles.spec.ts` skips itself. Do not delete the routes or the
`pathnames` entries to turn the section off: flipping the constant back must be enough.

## Adding an article (one article = one PR)

Create `content/articles/<id>/` with one `<locale>.md` per supported locale (translate the
`slug`, keep `date` identical), put any image in `public/articles/<id>/`, run the Definition of
done, open a PR. The article is online after the Netlify redeploy of `main` (a few minutes),
not on a simple refresh. The E2E `tests/e2e/articles.spec.ts` relies on the two demo articles
(`writing-articles`, `architecture-tour`): a derived site replacing them updates that spec.
