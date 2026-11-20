# Social image fonts

`Geist-Regular.ttf` and `Geist-Bold.ttf` draw the social images (`components/og/OgImage.tsx`,
loaded by `lib/og/assets.ts`). Geist is © 2023 Vercel in collaboration with basement.studio, under
the SIL Open Font License 1.1 (`OFL.txt`, no Reserved Font Name).

Source: the npm package `geist@1.9.2`, `dist/fonts/geist-sans/`. Modified version: the `GPOS`
table is removed (fontTools 4.64: `del font["GPOS"]`), because Satori (`next/og`) applied its
kerning around spaces and drew irregular gaps between words. Every glyph (accented Latin of the six
supported locales included) is unchanged.
