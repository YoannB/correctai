// @vitest-environment node
import { findCollection, hiddenHrefs, validateCollections, type CollectionConfig } from "@/lib/articles/collections";
import { describe, expect, it } from "vitest";

const collection = (o: Partial<CollectionConfig> = {}): CollectionConfig => ({
    id: "reminders",
    enabled: true,
    href: "/reminders",
    itemHref: "/reminders/[slug]",
    namespace: "pages.reminders",
    schemaType: "TechArticle",
    ...o,
});

describe("validateCollections", () => {
    it("returns valid collections unchanged", () => {
        const list = [collection({ id: "articles", href: "/articles", itemHref: "/articles/[slug]" }), collection()];
        expect(validateCollections(list)).toBe(list);
    });

    it("rejects a non kebab-case id", () => {
        expect(() => validateCollections([collection({ id: "Reminders" })])).toThrow(
            'Invalid collection "Reminders": id must be kebab-case',
        );
    });

    it("rejects a duplicate id", () => {
        expect(() => validateCollections([collection(), collection()])).toThrow('Duplicate collection "reminders"');
    });

    it("rejects a dynamic listing href", () => {
        expect(() => validateCollections([collection({ href: "/reminders/[slug]" })])).toThrow(
            "must be a static route",
        );
    });

    it("rejects an entry href that does not end with /[slug]", () => {
        expect(() => validateCollections([collection({ itemHref: "/reminders/[id]" })])).toThrow(
            'itemHref "/reminders/[id]" must end with "/[slug]"',
        );
    });

    it("accepts badge rules and rejects invalid ones (lib/articles/status.ts validateRules)", () => {
        expect(validateCollections([collection({ newForDays: 90, archiveBefore: "2018-01-01" })])).toHaveLength(1);
        expect(() => validateCollections([collection({ newForDays: -1 })])).toThrow(
            'Invalid collection "reminders": newForDays',
        );
    });
});

describe("validateCollections — comments switch", () => {
    it("accepts a boolean, rejects anything else", () => {
        expect(validateCollections([collection({ comments: true })])).toHaveLength(1);
        expect(() => validateCollections([collection({ comments: "yes" as unknown as boolean })])).toThrow(
            'Invalid collection "reminders": comments must be a boolean',
        );
    });
});

describe("hiddenHrefs", () => {
    it("lists both routes of every disabled collection only", () => {
        expect(
            hiddenHrefs([collection({ id: "a", href: "/a", itemHref: "/a/[slug]", enabled: false }), collection()]),
        ).toEqual(["/a", "/a/[slug]"]);
    });
});

describe("findCollection", () => {
    it("returns the collection with that id", () => {
        const list = [collection({ id: "a" }), collection()];
        expect(findCollection(list, "reminders")).toBe(list[1]);
    });

    it("throws on an unknown id, naming the known ones", () => {
        expect(() => findCollection([collection()], "remiders")).toThrow(
            'Unknown collection "remiders" (known: reminders)',
        );
    });
});
