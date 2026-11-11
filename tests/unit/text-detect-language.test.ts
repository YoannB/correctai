import { detectLanguage, languageTokens } from "@/lib/text/detect-language";
import { describe, expect, it } from "vitest";

describe("languageTokens", () => {
    it("lower-cases, strips accents and splits apostrophes", () => {
        expect(languageTokens("Aujourd'hui, ÉTÉ — très bien !")).toEqual(["aujourd", "hui", "ete", "tres", "bien"]);
    });
    it("no word => []", () => expect(languageTokens(" … !? ")).toEqual([]));
});

describe("detectLanguage", () => {
    it.each([
        ["fr", "Je suis très content de vous écrire aujourd'hui. J'espère que tout se passe bien de votre côté."],
        ["en", "I hope you are doing well and that this message finds you in good health."],
        ["es", "Espero que todo esté bien y que tengas un buen día con tu familia."],
        ["de", "Ich hoffe, dass es dir gut geht und dass wir uns bald wieder sehen."],
        ["it", "Spero che tu stia bene e che questo messaggio ti trovi in salute."],
        ["pt", "Espero que você esteja bem e que tenha um ótimo dia com a sua família."],
    ])("%s", (code, text) => {
        expect(detectLanguage(text, null)).toBe(code);
    });
    it("no stop word => fallback", () => {
        expect(detectLanguage("Xyzzy plugh", "fr")).toBe("fr");
        expect(detectLanguage("", null)).toBeNull();
    });
    it("a tie keeps the first profile in list order", () => {
        // "con" is a stop word of both es and it: es comes first in the list.
        expect(detectLanguage("con", null)).toBe("es");
    });
});
