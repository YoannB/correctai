import { escapeIcuText, interpolateLegal, parseAddressKind } from "@/lib/legal-messages";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import it_ from "@/messages/it.json";
import pt from "@/messages/pt.json";
import { describe, expect, it } from "vitest";

const MESSAGES = { fr, en, es, de, it: it_, pt } as const;
type Locale = keyof typeof MESSAGES;

const VARS = {
    editorName: "Jane Doe",
    tradeName: "ACME",
    siren: "123456789",
    apeCode: "6201Z",
    publicationDirector: "Jane Doe",
    contactEmail: "contact@example.com",
    declaredDate: "1 janvier 2024",
};

/** The two editor-address sentences (legal notice, privacy policy) of a locale, rendered. */
function addressSentences(locale: Locale, address: string, addressKind: string): string[] {
    const vars = { ...VARS, address, addressKind };
    const out = JSON.stringify(interpolateLegal(MESSAGES[locale], vars, locale));
    const sentences = JSON.parse(out) as { pages: Record<string, { sections: { body: unknown[] }[] }> };
    return ["legal", "privacy"].map((page) => {
        const found = JSON.stringify(sentences.pages[page].sections)
            .split('"')
            .find((s) => s.includes(VARS.siren));
        return found ?? "";
    });
}

// Today's phrasing (before LEGAL_EDITOR_ADDRESS_KIND existed): the default MUST keep it.
const STREET: Record<Locale, string> = {
    fr: "dont le siège est situé 2 rue X, 44000 Nantes",
    en: "with registered office at 2 rue X, 44000 Nantes",
    es: "situado en 2 rue X, 44000 Nantes",
    de: "mit Sitz in 2 rue X, 44000 Nantes",
    it: "con sede legale situata in 2 rue X, 44000 Nantes",
    pt: "com sede situada em 2 rue X, 44000 Nantes",
};

const CITY: Record<Locale, string> = {
    fr: "dont le siège est situé à Nantes, France",
    en: "with registered office in Nantes, France",
    es: "situado en Nantes, France",
    de: "mit Sitz in Nantes, France",
    it: "con sede legale situata a Nantes, France",
    pt: "com sede situada em Nantes, France",
};

const LOCALES = Object.keys(MESSAGES) as Locale[];

describe("parseAddressKind", () => {
    it("city → city", () => expect(parseAddressKind("city")).toBe("city"));
    it("street → street", () => expect(parseAddressKind("street")).toBe("street"));
    it("empty or unknown → street (default)", () => {
        expect(parseAddressKind("")).toBe("street");
        expect(parseAddressKind("City")).toBe("street");
    });
});

describe("escapeIcuText", () => {
    it("escapes ' { } #", () => expect(escapeIcuText("l'a{b}#")).toBe("l''a'{'b'}''#'"));
});

describe("interpolateLegal — editor-address sentences in every locale", () => {
    for (const locale of LOCALES) {
        it(`${locale}: variable absent, \`street\` or invalid → today's phrasing in both sentences`, () => {
            for (const raw of ["", "street", "bogus"]) {
                for (const s of addressSentences(locale, "2 rue X, 44000 Nantes", parseAddressKind(raw))) {
                    expect(s).toContain(STREET[locale]);
                    expect(s).not.toMatch(/[{}]/);
                }
            }
        });

        it(`${locale}: city`, () => {
            for (const s of addressSentences(locale, "Nantes, France", "city")) expect(s).toContain(CITY[locale]);
        });
    }

    it("an apostrophe in the address renders once, unescaped, in the select sentences", () => {
        for (const s of addressSentences("fr", "2 quai de l'Erdre, Nantes", "street")) {
            expect(s).toContain("situé 2 quai de l'Erdre, Nantes");
        }
        expect(addressSentences("en", "Quai d'Erdre", "city")[1]).toContain("in Quai d'Erdre");
    });
});

describe("interpolateLegal — plain substitution (unchanged behaviour)", () => {
    it("substitutes every token with the ICU-escaped value, leaves other strings alone", () => {
        const tree = { a: "{editorName} / {editorName}", b: ["x {siren}"], c: 3, d: null, e: "no token" };
        expect(interpolateLegal(tree, { editorName: "O'Neil", siren: "#1" }, "en")).toEqual({
            a: "O''Neil / O''Neil",
            b: ["x '#'1"],
            c: 3,
            d: null,
            e: "no token",
        });
    });
});
