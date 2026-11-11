import {
    detectLanguage,
    LEAD_MARGIN,
    languageScores,
    languageTokens,
    STOP_WORDS,
    type DetectableLanguage,
} from "@/lib/text/detect-language";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import it_ from "@/messages/it.json";
import pt from "@/messages/pt.json";
import { describe, expect, it } from "vitest";

const LANGS: DetectableLanguage[] = ["fr", "en", "es", "de", "it", "pt"];

// Short, typo-laden social-media texts (the hard case: few words, missing accents). The French
// one was detected as Spanish ("que", "en") before the weighted lists.
const FIXTURES: [DetectableLanguage, string][] = [
    [
        "fr",
        "Tres beau partage ! Cela me rappel un projet que j'avais mener l'an dernier, on avait réussis a doublé notre impact en 6 mois. Bravo a toute l'equipe 🙌",
    ],
    [
        "en",
        "Very nice share! This remind me of a project I had led last year, we managed to doubled our impact in 6 months. Well done to the hole team 🙌",
    ],
    [
        "es",
        "Muy buen compartido ! Esto me recuerda un proyecto que abia llevado el año pasado, logramos duplicar nuestro impacto en 6 meses. Enhorabuena a todo el equipo 🙌",
    ],
    [
        "de",
        "Sehr schoener Beitrag ! Das erinnert mich an ein projekt das ich letztes jahr geleitet habe, wir haben es geschafft unsere wirkung in 6 monaten zu verdoppeln. Gluckwunsch an das ganze Team 🙌",
    ],
    [
        "it",
        "Bellissima condivisione ! Questo mi ricorda un progetto che avevo condotto l'anno scorso, siamo riusciti a raddoppiare il nostro impatto in 6 mesi. Complimenti a tutto il team 🙌",
    ],
    [
        "pt",
        "Muito boa partilha ! Isto lembra-me um projeto que tinha liderado no ano passado, conseguimos duplicar o nosso impacto em 6 meses. Parabens a toda a equipa 🙌",
    ],
];

// Plus every text tool example shipped in messages/*.json (`corrector.examples.*.raw` and
// `.corrected` in apps that have them; none in a bare boilerplate): each must be detected as
// its own locale.
type Examples = { corrector?: { examples?: Record<string, { raw: string; corrected: string }> } };
// Read through `object`: a bare boilerplate's messages have no `corrector` key at all.
const MESSAGES: Record<DetectableLanguage, object> = { fr, en, es, de, it: it_, pt };
const CASES: [string, DetectableLanguage, string][] = [
    ...FIXTURES.map(([code, text]): [string, DetectableLanguage, string] => [`${code} fixture`, code, text]),
    ...LANGS.flatMap((code) =>
        Object.entries((MESSAGES[code] as Examples).corrector?.examples ?? {}).flatMap(([id, ex]) => [
            [`${code} corrector.examples.${id}.raw`, code, ex.raw] as [string, DetectableLanguage, string],
            [`${code} corrector.examples.${id}.corrected`, code, ex.corrected] as [string, DetectableLanguage, string],
        ]),
    ),
];

describe("languageTokens", () => {
    it("lower-cases, strips accents and splits apostrophes", () => {
        expect(languageTokens("Aujourd'hui, ÉTÉ — très bien !")).toEqual(["aujourd", "hui", "ete", "tres", "bien"]);
    });
    it("no word => []", () => expect(languageTokens(" … !? ")).toEqual([]));
});

describe("STOP_WORDS", () => {
    it("every list is non-empty, accent-free and lower-case (tokens are normalized the same way)", () => {
        for (const code of LANGS) {
            expect(STOP_WORDS[code].length).toBeGreaterThan(50);
            for (const w of STOP_WORDS[code]) expect(languageTokens(w)).toEqual([w]);
        }
    });
});

describe("languageScores", () => {
    it("a word shared by k languages votes 1/k for each", () => {
        // "que" is fr/es/pt; "notre" is fr only.
        const s = languageScores("que notre");
        expect(s.fr).toBeCloseTo(1 + 1 / 3);
        expect(s.es).toBeCloseTo(1 / 3);
        expect(s.pt).toBeCloseTo(1 / 3);
        expect(s.en + s.de + s.it).toBe(0);
    });
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

    // Whatever the fallback (the UI locale the visitor happens to browse in).
    it.each(CASES)("%s", (_name, code, text) => {
        for (const fallback of [null, ...LANGS]) expect(detectLanguage(text, fallback)).toBe(code);
    });

    it("no stop word => fallback", () => {
        expect(detectLanguage("Xyzzy plugh", "fr")).toBe("fr");
        expect(detectLanguage("", null)).toBeNull();
    });
    it("only words shared by many languages (lead < LEAD_MARGIN) => fallback", () => {
        // "se" is fr/es/pt (1/3 each): no language leads by half a vote.
        expect(detectLanguage("se", null)).toBeNull();
        expect(detectLanguage("se", "de")).toBe("de");
    });
    it("a near-tie the fallback is part of keeps the fallback", () => {
        // "con" is es/it (0.5 each): the fallback it wins over es, first in list order.
        expect(detectLanguage("con", "it")).toBe("it");
        // fr ("notre" = 1) leads the fallback it ("con" = 0.5) by exactly LEAD_MARGIN => fr.
        expect(detectLanguage("notre con", "it")).toBe("fr");
    });
    it("a tie between non-fallback languages keeps the first profile in list order", () => {
        expect(detectLanguage("con", null)).toBe("es");
        expect(detectLanguage("con", "xx")).toBe("es");
    });
    it("LEAD_MARGIN is less than one distinctive word", () => {
        expect(LEAD_MARGIN).toBeGreaterThan(0);
        expect(LEAD_MARGIN).toBeLessThan(1);
    });
    it("a clear lead overrides the fallback", () => {
        expect(detectLanguage("Bravo à toute l'équipe, notre impact a doublé.", "es")).toBe("fr");
    });
});
