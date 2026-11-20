// @vitest-environment node
import { OG_THEME, OgImage } from "@/components/og/OgImage";
import { COLLECTIONS, OG_PAGES } from "@/constants/site";
import type { OgImageProps } from "@/lib/og/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

// The mechanisms (declarations reach their consumers), never the configured values.
describe("OG_PAGES — which pages get their own social image", () => {
    it("always includes the home", () => {
        expect(OG_PAGES["/"]).toBeTruthy();
    });

    it("includes the listing of every ENABLED collection, under its namespace", () => {
        for (const c of COLLECTIONS) {
            if (c.enabled) expect(OG_PAGES[c.href]).toBe(c.namespace);
            else expect(OG_PAGES).not.toHaveProperty(c.href);
        }
    });
});

describe("OG_THEME — colours of the social image", () => {
    it("is 6-digit hex only (the drawing appends alpha digits to the accents)", () => {
        for (const colour of Object.values(OG_THEME)) expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    });
});

const PROPS: OgImageProps = {
    title: "Écrire un article",
    description: "Un dossier par article, un fichier par langue.",
    siteName: "Site",
    host: "example.com",
    locale: "fr",
    logo: "data:image/svg+xml;base64,PHN2Zy8+",
    theme: {
        background: "#000000",
        surface: "#111111",
        text: "#ffffff",
        muted: "#999999",
        accent1: "#7c5cff",
        accent2: "#22d3ee",
    },
    fontFamily: "Geist",
};

describe("OgImage — the drawing", () => {
    it("shows the title, description, site name, host and logo in the page language", () => {
        const html = renderToStaticMarkup(<OgImage {...PROPS} />);
        for (const text of [PROPS.title, PROPS.description, PROPS.siteName, PROPS.host]) expect(html).toContain(text);
        expect(html).toContain('lang="fr"');
        expect(html).toContain(`src="${PROPS.logo}"`);
        expect(html).toContain("font-family:Geist");
    });

    it("adds the section badge and the cover only when given", () => {
        const bare = renderToStaticMarkup(<OgImage {...PROPS} />);
        expect(bare).not.toContain("Articles");
        expect(bare.match(/<img/g)).toHaveLength(1);

        const full = renderToStaticMarkup(<OgImage {...PROPS} section="Articles" cover="data:image/png;base64,AA==" />);
        expect(full).toContain("Articles");
        expect(full).toContain('src="data:image/png;base64,AA=="');
    });

    it("omits the description block when the page has none", () => {
        const html = renderToStaticMarkup(<OgImage {...PROPS} description="" />);
        expect(html).not.toContain("font-size:30px");
    });
});
