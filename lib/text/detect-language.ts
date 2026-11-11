// Pure, dictionary-free guess of the language a text is written in, among the six locales
// Axons ships (fr, en, es, de, it, pt). Stop-word voting on accent/apostrophe-insensitive
// tokens: good enough to preselect a language flag next to an editor, NOT a classifier
// (short or mixed texts may fail; the caller passes a fallback, usually the UI locale).
// No React, no IO; generic for any text tool (docs/text-tools.md).

export type DetectableLanguage = "fr" | "en" | "es" | "de" | "it" | "pt";

const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, " ").toLowerCase();

/** Lower-cased, accent-free word tokens (apostrophes split words: "aujourd'hui" -> aujourd, hui). */
export function languageTokens(text: string): string[] {
    return norm(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

// Frequent function words, chosen to be as DISTINCTIVE as possible between the six languages
// (words shared by several languages, e.g. "a", "de", "e", "la", "se", "no", vote for all of
// them and are left out on purpose).
const STOP_WORDS: Record<DetectableLanguage, readonly string[]> = {
    fr: "le les des une est sont vous nous je il elle ne pas plus tres aussi mais donc car qui dont ou avec sans pour dans sur chez et mon ton votre leur mes vos ce cette ces suis avez ete etre avoir faire tout tous bien aujourd hui merci bonjour".split(
        " ",
    ),
    en: "the and is are was were you your that this these those with for not have has had would could should will very hope but because from they them their we our my me he she it its at by of to do does did be been can may must thanks hello".split(
        " ",
    ),
    es: "el los las una es son muy pero porque que quien tambien espero yo ella ellos nosotros mas para por en con sin y como mi su este esta estos del al todo todos bien ser tener hola gracias".split(
        " ",
    ),
    de: "der die das und ist sind sehr aber weil nicht auch ich du er sie es wir ihr mit fur auf zu aus bei nach oder wenn dann doch kein eine einen einem einer mein dein sein unser dieser diese war haben hatte werden konnen mussen hoffe nur noch schon danke hallo".split(
        " ",
    ),
    it: "il lo gli un uno una che chi ma perche non anche molto piu meno con senza per da tra fra io lui lei noi voi loro mio tuo questo questa quello sono essere avere fare spero bene oggi ciao grazie".split(
        " ",
    ),
    pt: "o os um uma umas que quem mas porque nao tambem muito mais com sem para do da em no na nos nas eu ele ela eles elas meu seu nosso este esse essa sou ser ter fazer espero bem hoje ola obrigado".split(
        " ",
    ),
};

const PROFILES = (Object.keys(STOP_WORDS) as DetectableLanguage[]).map((code) => ({
    code,
    words: new Set(STOP_WORDS[code]),
}));

/**
 * The language whose stop words appear most often in `text`; `fallback` when no stop word
 * matches (empty, too short, or another language). Ties keep the first profile in the list
 * order above (fr, en, es, de, it, pt).
 */
export function detectLanguage<F extends string | null>(text: string, fallback: F): DetectableLanguage | F {
    const tokens = languageTokens(text);
    let best: DetectableLanguage | F = fallback;
    let bestScore = 0;
    for (const { code, words } of PROFILES) {
        let score = 0;
        for (const t of tokens) if (words.has(t)) score++;
        if (score > bestScore) {
            bestScore = score;
            best = code;
        }
    }
    return best;
}
