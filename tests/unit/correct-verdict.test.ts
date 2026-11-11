import {
    classifyOp,
    correctionFromReply,
    levenshtein,
    looksLikeEnvelope,
    parseCorrection,
    repairJson,
    verdictFor,
} from "@/lib/correct/verdict";
import { diffWords } from "@/lib/text/diff";
import { similarityPercent } from "@/lib/text/similarity";
import { describe, expect, it } from "vitest";

describe("levenshtein", () => {
    it("identical => 0", () => expect(levenshtein("abc", "abc")).toBe(0));
    it("empty side => other length", () => {
        expect(levenshtein("", "abc")).toBe(3);
        expect(levenshtein("abc", "")).toBe(3);
    });
    it("substitution, insertion, deletion", () => {
        expect(levenshtein("kitten", "sitting")).toBe(3);
        expect(levenshtein("rappel", "rappelle")).toBe(2);
    });
});

describe("classifyOp", () => {
    it("equal and whitespace-only ops => none", () => {
        expect(classifyOp({ type: "equal", text: "mot" })).toBe("none");
        expect(classifyOp({ type: "insert", text: " " })).toBe("none");
    });
    it("inserted/deleted punctuation => form", () => {
        expect(classifyOp({ type: "insert", text: "," })).toBe("form");
        expect(classifyOp({ type: "delete", text: "!" })).toBe("form");
    });
    it("inserted/deleted word => content", () => {
        expect(classifyOp({ type: "insert", text: "vraiment" })).toBe("content");
        expect(classifyOp({ type: "delete", text: "très" })).toBe("content");
    });
    it("replace with the same skeleton (accent/case) => form", () => {
        expect(classifyOp({ type: "replace", text: "côté", old: "coté" })).toBe("form");
    });
    it("replace with a close skeleton (typo) => form", () => {
        expect(classifyOp({ type: "replace", text: "rappelle", old: "rappel" })).toBe("form");
    });
    it("replace with a different word => content", () => {
        expect(classifyOp({ type: "replace", text: "excellent", old: "beau" })).toBe("content");
    });
    it("replace without old (defensive) => compares against an empty skeleton", () => {
        expect(classifyOp({ type: "replace", text: "mot" })).toBe("content");
    });
});

describe("verdictFor", () => {
    it("form-only corrections => ready to post, no tag", () => {
        // 1 fix over 12 words => 92% (above the review threshold).
        const before = "Je suis très content de vous écrire, tout se passe bien de votre coté.";
        const after = "Je suis très content de vous écrire, tout se passe bien de votre côté.";
        const ops = diffWords(before, after);
        const v = verdictFor(ops, similarityPercent(ops, before, after));
        expect(v).toEqual({
            formCount: 1,
            contentCount: 0,
            requireAiTag: false,
            readyToPost: true,
            reviewAdvised: false,
        });
    });
    it("a rewording => AI tag required, not ready", () => {
        const before = "Un beau partage.";
        const after = "Un excellent partage.";
        const ops = diffWords(before, after);
        const v = verdictFor(ops, similarityPercent(ops, before, after));
        expect(v.requireAiTag).toBe(true);
        expect(v.readyToPost).toBe(false);
        expect(v.reviewAdvised).toBe(false);
    });
    it("form-only but below the review threshold => review advised", () => {
        const v = verdictFor([{ type: "replace", text: "côté", old: "coté" }], 80);
        expect(v.reviewAdvised).toBe(true);
    });
    it("custom threshold", () => {
        expect(verdictFor([], 95, 99).reviewAdvised).toBe(true);
    });
});

describe("repairJson", () => {
    it("valid JSON is left untouched", () => {
        const ok = '{"language":"fr","corrected":"a\\nb \\u00e9 \\"q\\" \\\\ \\/"}';
        expect(repairJson(ok)).toBe(ok);
    });
    it("escapes raw control characters inside strings only", () => {
        expect(repairJson('{\n"corrected":"a\nb\tc\rd"\n}')).toBe('{\n"corrected":"a\\nb\\tc\\rd"\n}');
    });
    it("drops the backslash of an invalid escape", () => {
        expect(repairJson('{"corrected":"l\\\'an \\é"}')).toBe('{"corrected":"l\'an é"}');
    });
    it("a dangling backslash at the very end is dropped", () => {
        expect(repairJson('"abc\\')).toBe('"abc');
    });
    it("escapes an unescaped straight quote inside the text", () => {
        expect(JSON.parse(repairJson('{"corrected":"Il a dit "bonjour" hier"}'))).toEqual({
            corrected: 'Il a dit "bonjour" hier',
        });
    });
    it("typographic quotes: straight as delimiters, kept as text", () => {
        expect(JSON.parse(repairJson("{“language”: “fr”, “corrected”: “Un ”mot” ici”}"))).toEqual({
            language: "fr",
            corrected: "Un ”mot” ici",
        });
    });
    it("drops trailing commas", () => {
        expect(JSON.parse(repairJson('{"corrected":"x", "list":[1,2,],}'))).toEqual({ corrected: "x", list: [1, 2] });
    });
});

describe("parseCorrection", () => {
    it("plain JSON", () => {
        expect(parseCorrection('{"language":"FR","corrected":"Bonjour."}')).toEqual({
            language: "fr",
            corrected: "Bonjour.",
        });
    });
    it("JSON wrapped in prose / code fence", () => {
        expect(parseCorrection('Voici :\n```json\n{"language":"en","corrected":"Hi."}\n```')?.corrected).toBe("Hi.");
    });
    it("missing language => empty string", () => {
        expect(parseCorrection('{"corrected":"x"}')).toEqual({ language: "", corrected: "x" });
    });
    it("no object => null", () => expect(parseCorrection("no json here")).toBeNull());
    it("invalid JSON => null", () => expect(parseCorrection("{not json}")).toBeNull());
    it("corrected not a string => null", () => expect(parseCorrection('{"corrected":42}')).toBeNull());

    // The live LinkedIn reply: emoji escaped as a surrogate pair => decoded to the emoji.
    it("escaped surrogate pair => the emoji", () => {
        expect(parseCorrection('{"language":"fr","corrected":"Bravo à toute l\'équipe \\ud83d\\udc4f"}')).toEqual({
            language: "fr",
            corrected: "Bravo à toute l'équipe 👏",
        });
    });
    it("lone surrogates (split pair) are dropped", () => {
        expect(parseCorrection('{"corrected":"Bravo \\ud83d \\udc4f !"}')?.corrected).toBe("Bravo   !");
    });
    it("broken JSON is repaired (raw line break, bad escape, trailing comma)", () => {
        expect(parseCorrection('{"language":"fr","corrected":"Bonjour,\nl\\\'équipe",}')).toEqual({
            language: "fr",
            corrected: "Bonjour,\nl'équipe",
        });
    });
    it("trailing text with braces => field-level extraction", () => {
        expect(
            parseCorrection(
                '{"language":"FR","corrected":"Très \\"beau\\"\\npartage \\u00e0 tous \\x"} (note: {fini})',
            ),
        ).toEqual({ language: "fr", corrected: 'Très "beau"\npartage à tous x' });
    });
    it("field-level extraction without a closing brace nor language", () => {
        expect(parseCorrection('"corrected": "Il a dit "oui" hier"')).toEqual({
            language: "",
            corrected: 'Il a dit "oui" hier',
        });
    });
    it("a truncated reply (unterminated string) => null, never a partial correction", () => {
        expect(parseCorrection('{"language":"fr","corrected":"Très beau partage ! Cela me')).toBeNull();
    });
});

describe("looksLikeEnvelope", () => {
    it.each([
        ['{"language":"fr"', true],
        ['```json\n{"corrected"', true],
        ['Voici : "corrected": "x"', true],
        ["Voici : “language”: fr", true],
        ["Bonjour à tous, la réunion est décalée.", false],
    ])("%s => %s", (text, expected) => expect(looksLikeEnvelope(text)).toBe(expected));
});

describe("correctionFromReply", () => {
    it("parsed envelope => trimmed correction", () => {
        expect(correctionFromReply('{"language":"fr","corrected":"  Bonjour.\n"}')).toBe("Bonjour.");
    });
    it("plain text (envelope skipped) => the reply itself", () => {
        expect(correctionFromReply("Bonjour à tous.")).toBe("Bonjour à tous.");
    });
    it("an unusable envelope => null (never shown as a correction)", () => {
        expect(correctionFromReply('{"language":"fr","corrected":"Très beau partage')).toBeNull();
        expect(correctionFromReply('{"language":"fr","corrected":"  "}')).toBeNull();
    });
});
