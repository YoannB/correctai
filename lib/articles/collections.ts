// PURE module (no next-intl, no process.env, no fs): what a Markdown collection is and the
// build-time checks of the collections declared in constants/site.ts (docs/articles.md → Collections).
import { validateCommentsSwitch, type CommentsSwitch } from "../comments";
import { validateRules, type CollectionRules } from "./status";

/** `COLLECTION_DEFAULTS`: badge rules + the comments switch, applied to every collection. */
export type CollectionDefaults = CollectionRules & CommentsSwitch;

/** schema.org type emitted as JSON-LD on an entry page. */
export type CollectionSchemaType = "BlogPosting" | "TechArticle" | "Article";

/**
 * A Markdown collection: `content/<id>/<entry>/<locale>.md`, a listing route and an entry route
 * (both declared in i18n/pathnames.ts). The articles are the default collection (`id: "articles"`).
 */
export interface CollectionConfig extends CollectionRules, CommentsSwitch {
    /** Folder under content/ (kebab-case), also the collection key used by the page factories. */
    readonly id: string;
    /** false => listing and entries answer 404, and the nav / sitemap entries disappear. */
    readonly enabled: boolean;
    /** Logical key of the listing route (static), e.g. "/reminders". */
    readonly href: string;
    /** Logical key of the entry route, ending with "/[slug]", e.g. "/reminders/[slug]". */
    readonly itemHref: string;
    /** Messages namespace: title, intro, empty, publishedOn, onlyIn (+ latestTitle, archivesTitle, viewAll). */
    readonly namespace: string;
    readonly schemaType: CollectionSchemaType;
}

const COLLECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Checks the collections (ids, uniqueness, route shapes) and returns them unchanged. */
export function validateCollections<C extends CollectionConfig>(collections: readonly C[]): readonly C[] {
    const seen = new Set<string>();
    for (const c of collections) {
        const where = `collection "${c.id}"`;
        if (!COLLECTION_ID.test(c.id)) throw new Error(`Invalid ${where}: id must be kebab-case (content/<id>/).`);
        if (seen.has(c.id)) throw new Error(`Duplicate ${where} (ids must be unique).`);
        seen.add(c.id);
        if (c.href.includes("[")) throw new Error(`Invalid ${where}: href "${c.href}" must be a static route.`);
        if (!c.itemHref.endsWith("/[slug]")) {
            throw new Error(`Invalid ${where}: itemHref "${c.itemHref}" must end with "/[slug]".`);
        }
        validateRules(c, where);
        validateCommentsSwitch(c, where);
    }
    return collections;
}

/** Routes (listing + entry) of the DISABLED collections: hidden from nav and sitemap.xml. */
export function hiddenHrefs(collections: readonly CollectionConfig[]): string[] {
    return collections.filter((c) => !c.enabled).flatMap((c) => [c.href, c.itemHref]);
}

/** The collection `id`, or an error naming the known ids (a typo in a page file fails the build). */
export function findCollection<C extends CollectionConfig>(collections: readonly C[], id: string): C {
    const found = collections.find((c) => c.id === id);
    if (!found) throw new Error(`Unknown collection "${id}" (known: ${collections.map((c) => c.id).join(", ")}).`);
    return found;
}
