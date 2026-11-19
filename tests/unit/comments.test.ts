// @vitest-environment node
import {
    collectionHasComments,
    commentsActive,
    disqusLanguage,
    disqusThreadConfig,
    resolveComments,
    threadIdentifier,
    validateCommentsSwitch,
} from "@/lib/comments";
import { describe, expect, it } from "vitest";

const DISQUS = { provider: "disqus" } as const;
const ON = { provider: "disqus", shortname: "demo" } as const;

describe("resolveComments — provider + NEXT_PUBLIC_DISQUS_SHORTNAME", () => {
    it("no provider => off, whatever the env says (disabled by default)", () => {
        expect(resolveComments(undefined, undefined)).toBeNull();
        expect(resolveComments(undefined, "demo")).toBeNull();
    });
    it("declared but no shortname anywhere => off", () => {
        expect(resolveComments(DISQUS, undefined)).toBeNull();
        expect(resolveComments(DISQUS, "  ")).toBeNull();
        expect(resolveComments({ provider: "disqus", shortname: " " }, "")).toBeNull();
    });
    it("the site shortname when the env is empty", () => {
        expect(resolveComments({ provider: "disqus", shortname: "site-forum" }, "")).toEqual({
            provider: "disqus",
            shortname: "site-forum",
        });
    });
    it("the env shortname WINS over the site one (trimmed, lower-cased)", () => {
        expect(resolveComments({ provider: "disqus", shortname: "site-forum" }, " Preview-Forum ")).toEqual({
            provider: "disqus",
            shortname: "preview-forum",
        });
        expect(resolveComments(DISQUS, "env1")).toEqual({ provider: "disqus", shortname: "env1" });
    });
    it.each(["my_forum", "-demo", "demo-", "demo.com", "a b", "https://demo.disqus.com"])(
        "a malformed shortname fails the build (%j)",
        (bad) => {
            expect(() => resolveComments(DISQUS, bad)).toThrow("Invalid Disqus shortname");
        },
    );
});

describe("validateCommentsSwitch", () => {
    it("absent or boolean is fine", () => {
        expect(() => validateCommentsSwitch({}, "x")).not.toThrow();
        expect(() => validateCommentsSwitch({ comments: false }, "x")).not.toThrow();
    });
    it("anything else throws with its place", () => {
        expect(() => validateCommentsSwitch({ comments: 1 as unknown as boolean }, 'collection "a"')).toThrow(
            'Invalid collection "a": comments must be a boolean (got 1).',
        );
    });
});

describe("collectionHasComments / commentsActive", () => {
    it("needs resolved comments", () => {
        expect(collectionHasComments(null, { comments: true }, { comments: true })).toBe(false);
    });
    it("the collection's own switch wins over the default, default off", () => {
        expect(collectionHasComments(ON, {}, {})).toBe(false);
        expect(collectionHasComments(ON, {}, { comments: true })).toBe(true);
        expect(collectionHasComments(ON, { comments: false }, { comments: true })).toBe(false);
        expect(collectionHasComments(ON, { comments: true }, {})).toBe(true);
    });
    it("active when at least one ENABLED collection shows them", () => {
        expect(commentsActive(ON, [{ enabled: false, comments: true }], {})).toBe(false);
        expect(commentsActive(ON, [{ enabled: true }, { enabled: true, comments: true }], {})).toBe(true);
        expect(commentsActive(null, [{ enabled: true, comments: true }], {})).toBe(false);
        expect(commentsActive(ON, [], { comments: true })).toBe(false);
    });
});

describe("thread identity", () => {
    it("identifier = <collection>/<entry id>/<locale>: one thread per translation, slug-independent", () => {
        expect(threadIdentifier("articles", "writing-articles", "fr")).toBe("articles/writing-articles/fr");
    });
    it.each([
        ["fr", "fr"],
        ["en", "en"],
        ["es", "es_ES"],
        ["de", "de"],
        ["it", "it"],
        ["pt", "pt_EU"],
        ["nl", "en"],
    ])("Disqus language of %s = %s", (locale, language) => {
        expect(disqusLanguage(locale)).toBe(language);
    });
    it("config = identifier + absolute canonical url + title + language", () => {
        expect(
            disqusThreadConfig({
                collection: "articles",
                entryId: "writing-articles",
                locale: "pt",
                url: "https://example.com/pt/artigos/escrever",
                title: "Escrever",
            }),
        ).toEqual({
            identifier: "articles/writing-articles/pt",
            url: "https://example.com/pt/artigos/escrever",
            title: "Escrever",
            language: "pt_EU",
        });
    });
});
