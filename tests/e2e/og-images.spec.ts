import { expect, test, type APIRequestContext } from "@playwright/test";
import { ARTICLES_ENABLED } from "../../constants/site";
import { lp } from "./support/locale-path";
import { localized } from "./support/pathnames";

// Social images (docs/seo-layout.md → Social images): every page names a 1200x630 PNG in
// og:image and twitter:image, drawn in the page's language and prerendered at build time.
// Fetched through `request` (no browser): the tags are in the server HTML.

/** content of <meta property|name="key" content="…"> in the page HTML (wherever React put it). */
function meta(html: string, key: string): string | undefined {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]*>`))?.[0];
    return tag?.match(/content="([^"]*)"/)?.[1].replace(/&amp;/g, "&");
}

/** Width and height of a PNG, read from its IHDR chunk (bytes 16..23, big-endian). */
function pngSize(body: Buffer): { width: number; height: number } {
    expect(body.subarray(1, 4).toString("latin1")).toBe("PNG");
    return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

async function checkPage(request: APIRequestContext, url: string, expectedImage: RegExp) {
    const page = await request.get(url);
    expect(page.status(), url).toBe(200);
    const html = await page.text();

    const image = meta(html, "og:image");
    expect(image, `og:image of ${url}`).toBeTruthy();
    // Absolute URL on NEXT_PUBLIC_SITE_URL; fetched on the server under test by its path.
    expect(image).toMatch(/^https?:\/\//);
    const path = new URL(image as string).pathname;
    expect(path).toMatch(expectedImage);
    expect(meta(html, "og:image:width")).toBe("1200");
    expect(meta(html, "og:image:height")).toBe("630");
    expect(meta(html, "og:image:alt")).toBeTruthy();
    expect(meta(html, "twitter:card")).toBe("summary_large_image");
    expect(meta(html, "twitter:image")).toBe(image);

    const png = await request.get(path);
    expect(png.status(), path).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");
    expect(pngSize(await png.body())).toEqual({ width: 1200, height: 630 });
}

test.describe("Social images", () => {
    for (const locale of ["fr", "en"]) {
        test(`home (${locale})`, async ({ request }) => {
            await checkPage(request, lp(locale, "/"), new RegExp(`^/og/${locale}/index\\.png$`));
        });

        test(`legal page (${locale})`, async ({ request }) => {
            await checkPage(request, localized(locale, "/legal"), new RegExp(`^/og/${locale}/legal\\.png$`));
        });
    }

    test.describe("article entry", () => {
        test.skip(!ARTICLES_ENABLED, "articles section disabled (ARTICLES_ENABLED = false)");
        const entries = [
            { locale: "fr", path: "/articles/ecrire-un-article" },
            { locale: "en", path: "/articles/writing-an-article" },
        ];
        for (const { locale, path } of entries) {
            test(`${path} (${locale})`, async ({ request }) => {
                const image = new RegExp(`^/og/${locale}${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.png$`);
                await checkPage(request, lp(locale, path), image);
            });
        }
    });

    test("an unknown image answers 404", async ({ request }) => {
        expect((await request.get("/og/fr/no-such-page.png")).status()).toBe(404);
        expect((await request.get("/og/xx/index.png")).status()).toBe(404);
    });
});
