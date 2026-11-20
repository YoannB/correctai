// PURE module: the subset of the message catalogue serialized to the CLIENT provider
// (NextIntlClientProvider). Every prop a Server Component passes to a Client Component lands in
// the page's RSC payload, so the full catalogue (legal pages, metadata…) would ship in every HTML
// page although only Client Components need it. See docs/i18n.md → Client messages.
/** A message catalogue (messages/<locale>.json): nested objects of strings. */
export type Messages = { [key: string]: unknown };

const isTree = (value: unknown): value is Messages =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** true when `path` (dotted, e.g. "pages.articles.title") is `paths` itself or below one of them. */
export function coversPath(paths: readonly string[], path: string): boolean {
    return paths.some((p) => path === p || path.startsWith(`${p}.`));
}

/**
 * The catalogue restricted to `paths` (dotted: "nav", "pages.articles"), with their parents kept
 * so a Client Component reads them under the same keys. A path absent from the catalogue throws:
 * a typo fails the build instead of shipping a missing label.
 */
export function pickMessages(messages: Messages, paths: readonly string[]): Messages {
    const result: Messages = {};
    for (const path of paths) {
        const keys = path.split(".");
        const value = keys.reduce<unknown>((node, key) => (isTree(node) ? node[key] : undefined), messages);
        if (value === undefined) throw new Error(`Client message path "${path}" is not in the catalogue.`);
        let target = result;
        // Parents are copied, never written through: an earlier, wider path ("pages") holds the
        // catalogue's own object, which must stay untouched.
        for (const key of keys.slice(0, -1)) {
            const node = target[key];
            target = target[key] = isTree(node) ? { ...node } : {};
        }
        target[keys[keys.length - 1]] = value;
    }
    return result;
}
