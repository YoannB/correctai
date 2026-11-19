import { ogImageResponse, ogStaticParams } from "@/lib/og/render";

// Social image of every page: /og/<locale>/<logical path>.png (lib/og/model.ts), a 1200x630 PNG
// referenced by og:image and twitter:image (lib/seo.ts). EVERY image is prerendered at build time
// (generateStaticParams: OG_PAGES + each served translation of every enabled collection entry) and
// served as a static response; any other path answers 404 (dynamicParams = false), so no image
// is ever drawn at request time. The ".png" dot keeps it out of the locale middleware.
// Guide: docs/seo-layout.md → Social images.

export const dynamicParams = false;

export function generateStaticParams() {
    return ogStaticParams();
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; path: string[] }> }) {
    const { locale, path } = await params;
    return ogImageResponse(locale, path);
}
