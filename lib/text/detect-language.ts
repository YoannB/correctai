// Pure, dictionary-free guess of the language a text is written in, among the six locales
// Axons ships (fr, en, es, de, it, pt). Weighted stop-word voting on accent/apostrophe-
// insensitive tokens: good enough to preselect a language flag next to an editor, NOT a
// classifier (short or mixed texts may fail; the caller passes a fallback, usually the UI
// locale, which also wins near-ties). No React, no IO; generic for any text tool
// (docs/text-tools.md).

export type DetectableLanguage = "fr" | "en" | "es" | "de" | "it" | "pt";

const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, " ").toLowerCase();

/** Lower-cased, accent-free word tokens (apostrophes split words: "aujourd'hui" -> aujourd, hui). */
export function languageTokens(text: string): string[] {
    return norm(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

// Frequent function words (articles, pronouns, prepositions, auxiliaries, elisions, greetings),
// accent-free and lower-cased like the tokens. A word may sit in several lists ("que" is
// fr/es/pt, "la" fr/es/it): it then votes 1/k for each of its k languages, so the DISTINCTIVE
// words ("notre", "the", "muy", "und", "che", "nao") decide and the shared ones only break
// away from the languages that lack them. Elided fragments count: fr "j'", "qu'", "n'"; it
// "dell'", "nell'"; en "'s", "n't" -> "t".
const LISTS: Record<DetectableLanguage, string> = {
    fr: `le la les des du au aux un une de et ou est sont etait etaient sera ont ai as avons avez avais avait
        avaient suis es sommes etes ete etre avoir fait faire vous nous je tu il ils elle elles on ne pas plus
        tres aussi mais donc car qui que quoi dont avec sans pour dans sur sous chez par en y si me te se moi
        toi lui mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ce cet cette ces cela ceci ca
        tout toute tous toutes bien deja encore toujours jamais rien peu beaucoup comme quand non oui j qu n
        m t s c d l aujourd hui merci bonjour salut cordialement`,
    en: `the a an and or but is are was were be been being am you your yours that this these those with for
        not no have has had having would could should will shall can may might must do does did done very so
        hope because from they them their we our ours us my mine me i he him his she her it its at by of to
        on in as if then than there here what which who whom whose when where why how all any some about into
        over just also only thanks thank hello hi please regards s t m ll re ve d don didn doesn isn wasn`,
    es: `el la los las lo le les un una unos unas de del al y o en es son era fue ser estar esta este estos
        estas esto eso esa ese muy pero porque que quien cuando donde como tambien yo tu ella ellos ellas
        nosotros usted ustedes mas para por con sin mi mis su sus nuestro nuestra nuestros se me te nos todo
        todos toda todas bien hay hola gracias espero estoy tengo tiene he ha han hemos ya aqui asi despues
        siempre nunca nada algo saludo saludos atentamente`,
    de: `der die das den dem des ein eine einen einem einer eines und oder aber denn weil dass ist sind war
        waren bin bist sein seine ihr ihre ihnen ich du er sie es wir euch uns mich mir dich dir sich mit fur
        auf zu zum zur aus bei nach von vor uber unter um an in im am nicht kein keine auch sehr so wie was
        wer wo wenn dann doch noch schon nur mal ja nein hier heute haben habe hat hatte werden wird wurde
        konnen kann muss will soll mein dein unser unsere unseres dieser diese dieses jetzt immer danke
        hallo bitte gut`,
    it: `il lo la gli le i un uno una di del della dei degli delle al alla alle ai dal dalla nel nella sul
        sulla dell nell all sull dall c d l e che chi ma perche non anche molto piu meno con senza per da tra
        fra io tu lui lei noi voi loro mi ti ci si mio mia tuo tua suo sua nostro nostra vostro questo questa
        questi quello quella sono siamo siete essere stato stata ho hai ha abbiamo hanno avere fare come
        quando dove cosa tutto tutti tutta bene oggi ciao grazie spero gia ancora sempre mai niente ecco cosi
        buongiorno cordiali saluti`,
    pt: `o os a as um uma uns umas de do da dos das em no na nos nas num numa pelo pela ao aos e que quem mas
        porque nao tambem muito muita mais com sem para por eu tu voce voces ele ela eles elas meu minha seu
        sua nosso nossa este esta esse essa isso isto sou ser estar estou foi tem tenho ter fazer espero bem
        hoje ola obrigado obrigada ja aqui assim depois sempre nunca nada algo tudo todos toda como quando
        onde se me te lhe bom dia cumprimentos`,
};

const LANGS = Object.keys(LISTS) as DetectableLanguage[];
const words = (list: string): string[] => list.trim().split(/\s+/);

/** The stop-word list of each language (exported for tests and tooling). */
export const STOP_WORDS: Readonly<Record<DetectableLanguage, readonly string[]>> = {
    fr: words(LISTS.fr),
    en: words(LISTS.en),
    es: words(LISTS.es),
    de: words(LISTS.de),
    it: words(LISTS.it),
    pt: words(LISTS.pt),
};

// word -> the languages it votes for (each receives 1/k).
const VOTES = new Map<string, DetectableLanguage[]>();
for (const code of LANGS) {
    // A Set: a word listed twice in the same language still votes once for it.
    for (const word of new Set(STOP_WORDS[code])) VOTES.set(word, [...(VOTES.get(word) ?? []), code]);
}

/** Below this lead (in votes) over the fallback, the fallback is kept: less than one distinctive word. */
export const LEAD_MARGIN = 0.5;

/** Weighted stop-word votes per language (a word shared by k languages counts 1/k for each). */
export function languageScores(text: string): Record<DetectableLanguage, number> {
    const scores = Object.fromEntries(LANGS.map((code) => [code, 0])) as Record<DetectableLanguage, number>;
    for (const token of languageTokens(text)) {
        const langs = VOTES.get(token);
        if (langs) for (const code of langs) scores[code] += 1 / langs.length;
    }
    return scores;
}

/**
 * The language with the most stop-word votes in `text`. The `fallback` is returned unless the
 * winner leads it by at least LEAD_MARGIN: no stop word (empty, too short, another language),
 * only words shared by several languages, or a near-tie the fallback is part of. A fallback
 * that is not a detectable language scores 0. Ties between other languages keep list order
 * (fr, en, es, de, it, pt).
 */
export function detectLanguage<F extends string | null>(text: string, fallback: F): DetectableLanguage | F {
    const scores = languageScores(text);
    let best: DetectableLanguage = LANGS[0];
    for (const code of LANGS) if (scores[code] > scores[best]) best = code;
    const fallbackScore = (LANGS as readonly (string | null)[]).includes(fallback)
        ? scores[fallback as DetectableLanguage]
        : 0;
    return scores[best] - fallbackScore < LEAD_MARGIN ? fallback : best;
}
