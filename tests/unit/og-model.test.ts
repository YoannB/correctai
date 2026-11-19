// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
    buildOgPages,
    coverMime,
    dataUri,
    displayHost,
    entryLogicalPath,
    matchEntry,
    ogImagePath,
    ogPathSegments,
    OG_SIZE,
    parseOgSegments,
    socialImageMetadata,
    titleSize,
    truncate,
} from "@/lib/og/model";

describe("ogPathSegments / ogImagePath", () => {
    it("names the home index.png", () => {
        expect(ogPathSegments("/")).toEqual(["index.png"]);
        expect(ogImagePath("fr", "/")).toBe("/og/fr/index.png");
    });

    it("turns a static route into one file", () => {
        expect(ogPathSegments("/legal")).toEqual(["legal.png"]);
        expect(ogImagePath("en", "/legal")).toBe("/og/en/legal.png");
    });

    it("keeps the folders of a nested route (an entry)", () => {
        expect(ogPathSegments("/articles/a-b")).toEqual(["articles", "a-b.png"]);
        expect(ogImagePath("de", "/articles/a-b")).toBe("/og/de/articles/a-b.png");
    });
});

describe("parseOgSegments", () => {
    it("is the inverse of ogPathSegments", () => {
        for (const path of ["/", "/legal", "/articles/a-b"]) expect(parseOgSegments(ogPathSegments(path))).toBe(path);
    });

    it("rejects a path without the .png file", () => {
        expect(parseOgSegments(["legal"])).toBeUndefined();
        expect(parseOgSegments([])).toBeUndefined();
    });

    it("rejects a bare .png", () => {
        expect(parseOgSegments([".png"])).toBeUndefined();
    });

    it("an index.png inside a folder is not the home", () => {
        expect(parseOgSegments(["articles", "index.png"])).toBe("/articles/index");
    });
});

describe("matchEntry", () => {
    const routes = ["/articles/[slug]", "/reminders/[slug]"] as const;

    it("finds the collection route and the slug", () => {
        expect(matchEntry(routes, "/reminders/git-reset")).toEqual({
            itemHref: "/reminders/[slug]",
            slug: "git-reset",
        });
    });

    it("ignores the listing itself (no slug)", () => {
        expect(matchEntry(routes, "/articles/")).toBeUndefined();
        expect(matchEntry(routes, "/articles")).toBeUndefined();
    });

    it("ignores a deeper path", () => {
        expect(matchEntry(routes, "/articles/a/b")).toBeUndefined();
    });

    it("ignores another route", () => {
        expect(matchEntry(routes, "/legal")).toBeUndefined();
    });
});

describe("entryLogicalPath", () => {
    it("fills the slug in the entry route", () => {
        expect(entryLogicalPath("/articles/[slug]", "hello")).toBe("/articles/hello");
    });
});

describe("truncate", () => {
    it("keeps a short text as is, whitespace collapsed", () => {
        expect(truncate("  Un   texte\ncourt ", 20)).toBe("Un texte court");
    });

    it("keeps a text exactly at the limit", () => {
        expect(truncate("abcde", 5)).toBe("abcde");
    });

    it("cuts on a word boundary with an ellipsis, within the limit", () => {
        const out = truncate("Informations relatives à l'éditeur, à l'hébergeur", 30);
        expect(out).toBe("Informations relatives à…");
        expect(out.length).toBeLessThanOrEqual(30);
    });

    it("drops trailing punctuation before the ellipsis", () => {
        expect(truncate("Mentions légales, et plus encore", 20)).toBe("Mentions légales…");
    });

    it("cuts inside a word when the last space is too early", () => {
        expect(truncate("a Supercalifragilisticexpialidocious", 12)).toBe("a Supercali…");
    });
});

describe("titleSize", () => {
    it("shrinks with the length", () => {
        expect(titleSize("x".repeat(32))).toBe(76);
        expect(titleSize("x".repeat(33))).toBe(64);
        expect(titleSize("x".repeat(60))).toBe(64);
        expect(titleSize("x".repeat(61))).toBe(54);
    });
});

describe("displayHost", () => {
    it("keeps the host (with port), drops the protocol and www.", () => {
        expect(displayHost("https://www.example.com")).toBe("example.com");
        expect(displayHost("http://localhost:3000")).toBe("localhost:3000");
    });
});

describe("coverMime", () => {
    it("knows PNG, JPEG and SVG, any case", () => {
        expect(coverMime("/a/cover.PNG")).toBe("image/png");
        expect(coverMime("/a/cover.jpg")).toBe("image/jpeg");
        expect(coverMime("/a/cover.jpeg")).toBe("image/jpeg");
        expect(coverMime("/a/cover.svg")).toBe("image/svg+xml");
    });

    it("skips formats Satori cannot draw", () => {
        expect(coverMime("/a/cover.webp")).toBeUndefined();
    });
});

describe("dataUri", () => {
    it("encodes the bytes in base64", () => {
        expect(dataUri("image/svg+xml", new TextEncoder().encode("<svg/>"))).toBe("data:image/svg+xml;base64,PHN2Zy8+");
    });
});

describe("buildOgPages", () => {
    it("merges the sources in order", () => {
        expect(
            buildOgPages({ "/": "meta.home" }, { "/articles": "pages.articles" }, { "/about": "pages.about" }),
        ).toEqual({ "/": "meta.home", "/articles": "pages.articles", "/about": "pages.about" });
    });

    it("throws on a page declared twice", () => {
        expect(() => buildOgPages({ "/legal": "pages.legal" }, { "/legal": "pages.other" })).toThrow(
            /"\/legal".*twice/,
        );
    });

    it("throws on a dynamic route", () => {
        expect(() => buildOgPages({ "/reminders/[slug]": "pages.reminders" })).toThrow(/dynamic route/);
    });
});

describe("socialImageMetadata", () => {
    it("describes the same PNG for Open Graph and the Twitter large card", () => {
        const url = "https://example.com/og/fr/legal.png";
        const { images, twitter } = socialImageMetadata({ url, alt: "Mentions", title: "T", description: "D" });

        expect(images).toEqual([
            { url, width: OG_SIZE.width, height: OG_SIZE.height, alt: "Mentions", type: "image/png" },
        ]);
        expect(twitter).toEqual({
            card: "summary_large_image",
            title: "T",
            description: "D",
            images: [{ url, alt: "Mentions", width: 1200, height: 630 }],
        });
    });
});
