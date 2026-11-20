// PURE module (no clock, no next-intl, no fs): the "New" and "Archive" status of a collection
// entry. "Today" is always INJECTED as a calendar day (YYYY-MM-DD) computed by the caller in the
// site's time zone (next-intl `timeZone`), so the logic is deterministic and testable.
// docs/articles.md → New and archive badges.
import { isValidIsoDate, type Article, type ListedArticle } from "./parse";

/** Badge rules of a collection, as declared (site defaults or one collection). Both optional. */
export interface CollectionRules {
    /** An entry is "new" for this many days after its `date`. 0 / absent => no "New" badge. */
    readonly newForDays?: number;
    /** Entries dated BEFORE this day (YYYY-MM-DD, exclusive) are archives. Absent => none. */
    readonly archiveBefore?: string;
}

/** Rules after merging collection > site defaults > none (no badge at all). */
export interface ResolvedRules {
    readonly newForDays: number;
    readonly archiveBefore?: string;
}

export interface EntryStatus {
    readonly isNew: boolean;
    readonly isArchived: boolean;
}

/** Throws (build failure) on a negative / non-integer window or a malformed archiveBefore. */
export function validateRules(rules: CollectionRules, where: string): CollectionRules {
    const { newForDays, archiveBefore } = rules;
    if (newForDays !== undefined && !(Number.isInteger(newForDays) && newForDays >= 0)) {
        throw new Error(`Invalid ${where}: newForDays must be an integer >= 0 (got ${newForDays}).`);
    }
    if (archiveBefore !== undefined && !isValidIsoDate(archiveBefore)) {
        throw new Error(`Invalid ${where}: archiveBefore "${archiveBefore}" must be a YYYY-MM-DD date.`);
    }
    return rules;
}

/** The collection's own value wins over the site default; nothing set => off. */
export function resolveRules(collection: CollectionRules, defaults: CollectionRules): ResolvedRules {
    const archiveBefore = collection.archiveBefore ?? defaults.archiveBefore;
    return {
        newForDays: collection.newForDays ?? defaults.newForDays ?? 0,
        ...(archiveBefore === undefined ? {} : { archiveBefore }),
    };
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD; negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Front-matter `archived` (true or false) wins; otherwise the collection's archiveBefore rule. */
export function isArchived(article: Pick<Article, "date" | "archived">, rules: ResolvedRules): boolean {
    if (article.archived !== undefined) return article.archived;
    return rules.archiveBefore !== undefined && article.date < rules.archiveBefore;
}

/**
 * "New" = not an archive AND dated less than `newForDays` days before `today` (day 0 = the
 * publication day; a future date counts as new). A 0 window never marks anything new.
 */
export function entryStatus(
    article: Pick<Article, "date" | "archived">,
    rules: ResolvedRules,
    today: string,
): EntryStatus {
    const isArchivedEntry = isArchived(article, rules);
    const isNew = !isArchivedEntry && rules.newForDays > 0 && daysBetween(article.date, today) < rules.newForDays;
    return { isNew, isArchived: isArchivedEntry };
}

/**
 * The "latest" block of a collection: the `limit` most recent NON-archived entries; when every
 * entry is an archive, the `limit` most recent archives with `archive: true` (the block is then
 * titled as archives, never presented as news). `items` must be sorted newest first.
 */
export function pickLatest(
    items: ListedArticle[],
    rules: ResolvedRules,
    limit: number,
): { archive: boolean; items: ListedArticle[] } {
    const fresh = items.filter(({ article }) => !isArchived(article, rules));
    if (fresh.length > 0) return { archive: false, items: fresh.slice(0, limit) };
    return { archive: items.length > 0, items: items.slice(0, limit) };
}
