// @vitest-environment node
// Pure "New" / "Archive" logic: "today" is always injected, never read from the clock.
import type { ListedArticle } from "@/lib/articles/parse";
import {
    daysBetween,
    entryStatus,
    isArchived,
    pickLatest,
    resolveRules,
    validateRules,
    type ResolvedRules,
} from "@/lib/articles/status";
import { describe, expect, it } from "vitest";

const OFF: ResolvedRules = { newForDays: 0 };
const EZ: ResolvedRules = { newForDays: 90, archiveBefore: "2018-01-01" };

const listed = (id: string, date: string, archived?: boolean): ListedArticle => ({
    article: {
        id,
        locale: "en",
        slug: id,
        title: id,
        description: "d",
        date,
        body: "b",
        ...(archived === undefined ? {} : { archived }),
    },
    isFallback: false,
});

describe("validateRules", () => {
    it("accepts empty rules, a 0 window and a valid day", () => {
        const rules = { newForDays: 0, archiveBefore: "2018-01-01" };
        expect(validateRules({}, "x")).toEqual({});
        expect(validateRules(rules, "x")).toBe(rules);
    });

    it.each([-1, 1.5, Number.NaN])("rejects the window %s", (n) => {
        expect(() => validateRules({ newForDays: n }, "site defaults")).toThrow(
            `Invalid site defaults: newForDays must be an integer >= 0 (got ${n}).`,
        );
    });

    it.each(["2018", "2018-02-30"])("rejects archiveBefore %s", (day) => {
        expect(() => validateRules({ archiveBefore: day }, "c")).toThrow(`archiveBefore "${day}" must be a YYYY-MM-DD`);
    });
});

describe("resolveRules", () => {
    it("defaults to no badge at all (the default)", () => {
        expect(resolveRules({}, {})).toEqual({ newForDays: 0 });
    });

    it("takes the site defaults when the collection sets nothing", () => {
        expect(resolveRules({}, { newForDays: 90, archiveBefore: "2018-01-01" })).toEqual(EZ);
    });

    it("lets the collection win, a 0 window included", () => {
        expect(resolveRules({ newForDays: 0, archiveBefore: "2020-01-01" }, EZ)).toEqual({
            newForDays: 0,
            archiveBefore: "2020-01-01",
        });
    });
});

describe("daysBetween", () => {
    it("counts calendar days across months, leap day and DST changes", () => {
        expect(daysBetween("2026-11-16", "2026-11-16")).toBe(0);
        expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
        expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
        expect(daysBetween("2026-11-17", "2026-11-16")).toBe(-1);
    });
});

describe("isArchived", () => {
    it("is false without a rule nor a flag", () => {
        expect(isArchived({ date: "2001-01-01" }, OFF)).toBe(false);
    });

    it("follows archiveBefore (exclusive bound)", () => {
        expect(isArchived({ date: "2017-12-31" }, EZ)).toBe(true);
        expect(isArchived({ date: "2018-01-01" }, EZ)).toBe(false);
    });

    it("lets the front-matter flag win over the rule, both ways", () => {
        expect(isArchived({ date: "2026-01-01", archived: true }, OFF)).toBe(true);
        expect(isArchived({ date: "2015-01-01", archived: false }, EZ)).toBe(false);
    });
});

describe("entryStatus", () => {
    const today = "2026-11-16";

    it("never marks anything new with a 0 window", () => {
        expect(entryStatus({ date: today }, OFF, today)).toEqual({ isNew: false, isArchived: false });
    });

    it("is new from the publication day up to newForDays - 1 days later", () => {
        expect(entryStatus({ date: today }, EZ, today).isNew).toBe(true);
        expect(entryStatus({ date: "2026-08-19" }, EZ, today).isNew).toBe(true); // 89 days
        expect(entryStatus({ date: "2026-08-18" }, EZ, today).isNew).toBe(false); // 90 days
    });

    it("counts a future date as new", () => {
        expect(entryStatus({ date: "2026-12-01" }, EZ, today).isNew).toBe(true);
    });

    it("never marks an archive as new, even a recent one", () => {
        expect(entryStatus({ date: today, archived: true }, EZ, today)).toEqual({ isNew: false, isArchived: true });
        expect(entryStatus({ date: "2015-06-01" }, { ...EZ, newForDays: 100_000 }, today)).toEqual({
            isNew: false,
            isArchived: true,
        });
    });
});

describe("pickLatest", () => {
    it("keeps the most recent non-archived entries, skipping archives", () => {
        const items = [listed("a", "2026-11-10"), listed("old", "2026-11-05", true), listed("b", "2026-01-01")];
        expect(pickLatest(items, OFF, 3)).toEqual({ archive: false, items: [items[0], items[2]] });
        expect(pickLatest(items, OFF, 1).items).toEqual([items[0]]);
    });

    it("is identical to a plain slice when nothing is archived (the default)", () => {
        const items = [listed("a", "2026-11-10"), listed("b", "2026-11-03"), listed("c", "2026-01-01")];
        expect(pickLatest(items, OFF, 2)).toEqual({ archive: false, items: items.slice(0, 2) });
    });

    it("falls back to the most recent archives, flagged, when every entry is one", () => {
        const items = [listed("a", "2015-03-01"), listed("b", "2014-01-01"), listed("c", "2013-01-01")];
        expect(pickLatest(items, EZ, 2)).toEqual({ archive: true, items: items.slice(0, 2) });
    });

    it("returns nothing (and no archive title) for an empty collection", () => {
        expect(pickLatest([], EZ, 3)).toEqual({ archive: false, items: [] });
    });
});
