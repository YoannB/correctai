import { LegalSections } from "@/components/content/LegalSections";
import { visibleLegalSections, type LegalFlags, type LegalSection } from "@/lib/legal-sections";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import it_ from "@/messages/it.json";
import pt from "@/messages/pt.json";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const ALL_ON: LegalFlags = { ai: true, ads: true, gtm: true, consent: true, comments: true };
const ALL_OFF: LegalFlags = { ai: false, ads: false, gtm: false, consent: false, comments: false };

describe("visibleLegalSections — pure filter", () => {
    const sections: LegalSection[] = [
        {
            heading: "A",
            body: [
                "always",
                { text: "no when" },
                { text: "ai only", when: ["ai"] },
                { text: "no ai", when: ["!ai"] },
                { text: "gtm and ads", when: ["gtm", "ads"] },
            ],
        },
        {
            heading: "B",
            body: [
                { list: ["item", { text: "ads item", when: ["ads"] }, { list: [] }] },
                { list: [{ text: "only ai", when: ["ai"] }] },
                { list: ["consent list"], when: ["consent"] },
            ],
        },
        { heading: "C", body: [{ text: "consent only", when: ["consent"] }] },
    ];

    it("keeps every block whose conditions hold (all on)", () => {
        expect(visibleLegalSections(sections, ALL_ON)).toEqual([
            { heading: "A", body: ["always", "no when", "ai only", "gtm and ads"] },
            { heading: "B", body: [["item", "ads item"], ["only ai"], ["consent list"]] },
            { heading: "C", body: ["consent only"] },
        ]);
    });

    it("applies negations, drops empty lists and sections left empty (all off)", () => {
        expect(visibleLegalSections(sections, ALL_OFF)).toEqual([
            { heading: "A", body: ["always", "no when", "no ai"] },
            { heading: "B", body: [["item"]] },
        ]);
    });

    it("every condition of a block must hold", () => {
        const [a] = visibleLegalSections(sections, { ...ALL_ON, ads: false });
        expect(a.body).not.toContain("gtm and ads");
    });
});

// The REAL copy, in every locale: what a site with the switches off would publish.
const LOCALES = { de, en, es, fr, it: it_, pt } as const;
const PAGES = ["legal", "privacy", "cookies"] as const;
const FLAG_RE = /^!?(ai|ads|gtm|consent|comments)$/;

function raw(locale: keyof typeof LOCALES, page: (typeof PAGES)[number]): LegalSection[] {
    return (LOCALES[locale].pages[page] as unknown as { sections: LegalSection[] }).sections;
}
function text(sections: LegalSection[], flags: LegalFlags): string {
    return JSON.stringify(visibleLegalSections(sections, flags));
}
function conditions(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(conditions);
    if (value && typeof value === "object") {
        const own = (value as { when?: string[] }).when ?? [];
        return [...own, ...Object.values(value).flatMap(conditions)];
    }
    return [];
}
// Structure only (strings → "s"): every locale must carry the same conditions at the same place.
function shape(value: unknown): unknown {
    if (typeof value === "string") return "s";
    if (Array.isArray(value)) return value.map(shape);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "when" ? v : shape(v)]));
    return value;
}

describe.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])("legal copy — %s", (locale) => {
    it.each(PAGES)("%s: only known conditions, same structure as en", (page) => {
        for (const c of conditions(raw(locale, page))) expect(c).toMatch(FLAG_RE);
        expect(shape(raw(locale, page))).toEqual(shape(raw("en", page)));
    });

    it("AI off: no page mentions OpenRouter", () => {
        for (const page of PAGES) {
            expect(text(raw(locale, page), { ...ALL_ON, ai: false })).not.toMatch(/OpenRouter/);
        }
    });

    it("AI on: OpenRouter is disclosed on the legal and privacy pages", () => {
        expect(text(raw(locale, "legal"), ALL_ON)).toMatch(/OpenRouter/);
        expect(text(raw(locale, "privacy"), ALL_ON)).toMatch(/OpenRouter/);
    });

    it("no tracker: the cookies page drops the consent and retention sections, the privacy page the consent purposes", () => {
        const on = visibleLegalSections(raw(locale, "cookies"), ALL_ON);
        const off = visibleLegalSections(raw(locale, "cookies"), {
            ...ALL_ON,
            gtm: false,
            ads: false,
            consent: false,
            comments: false,
        });
        // Consent (banner) and retention (consent + audience cookies) only describe trackers.
        expect(off.length).toBe(on.length - 2);
        const purposes = (flags: LegalFlags) =>
            visibleLegalSections(raw(locale, "privacy"), flags)[2].body.find(Array.isArray) as string[];
        expect(purposes(ALL_ON)).toHaveLength(5);
        expect(purposes(ALL_OFF)).toHaveLength(1);
    });

    it("comments off: no page mentions Disqus", () => {
        for (const page of PAGES) {
            expect(text(raw(locale, page), { ...ALL_ON, comments: false })).not.toMatch(/Disqus/);
        }
    });

    it("comments on: Disqus and its privacy policy are disclosed on the three pages", () => {
        for (const page of PAGES) {
            expect(text(raw(locale, page), ALL_ON)).toMatch(/Disqus/);
            expect(text(raw(locale, page), ALL_ON)).toContain("https://disqus.com/privacy-policy/");
        }
        const purposes = visibleLegalSections(raw(locale, "privacy"), ALL_ON)[2].body.find(Array.isArray) as string[];
        expect(purposes.filter((p) => p.includes("Disqus"))).toHaveLength(1);
    });

    it("ads without GTM, and GTM without ads: exactly one tracker paragraph on the cookies page", () => {
        const used = (flags: LegalFlags) => visibleLegalSections(raw(locale, "cookies"), flags)[1].body.length;
        expect(used({ ...ALL_ON, gtm: false })).toBe(used({ ...ALL_ON, ads: false }));
        expect(used(ALL_ON)).toBe(used({ ...ALL_ON, gtm: false }));
    });
});

describe("LegalSections — rendering", () => {
    it("renders paragraphs and lists, and only the visible blocks", () => {
        const html = renderToStaticMarkup(
            <LegalSections
                flags={ALL_OFF}
                sections={[{ heading: "H", body: ["p", { text: "ai", when: ["ai"] }, { list: ["x", "y"] }] }]}
            />,
        );
        expect(html).toBe(
            '<section class="static-page__section"><h2>H</h2><p>p</p><ul><li>x</li><li>y</li></ul></section>',
        );
    });
});
