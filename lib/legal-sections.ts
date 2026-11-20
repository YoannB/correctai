// Legal / privacy / cookies copy (messages/<locale>.json → pages.{legal,privacy,cookies}.sections)
// only describes what the build actually runs: a paragraph may carry `when` conditions on the
// site switches (AI, ads, GTM, consent banner, third-party comments), so a site with AI off never mentions OpenRouter.
// Pure: the pages pass the flags from constants/site.ts. Variants are written by REMOVING the
// clauses of a disabled feature, never by adding legal statements.

export type LegalFlag = "ai" | "ads" | "gtm" | "consent" | "comments";
export type LegalCondition = LegalFlag | `!${LegalFlag}`;
export type LegalFlags = Readonly<Record<LegalFlag, boolean>>;

/** A paragraph: plain text, conditional text, or a (conditional) bullet list of conditional items. */
export type LegalBlock =
    string | { text: string; when?: LegalCondition[] } | { list: LegalBlock[]; when?: LegalCondition[] };

export interface LegalSection {
    heading: string;
    body: LegalBlock[];
}

/** Rendered shape: a string is a paragraph, a string[] a bullet list. */
export interface VisibleLegalSection {
    heading: string;
    body: (string | string[])[];
}

function holds(when: LegalCondition[] | undefined, flags: LegalFlags): boolean {
    return (when ?? []).every((c) => (c.startsWith("!") ? !flags[c.slice(1) as LegalFlag] : flags[c as LegalFlag]));
}

function visibleText(block: LegalBlock, flags: LegalFlags): string | null {
    if (typeof block === "string") return block;
    if ("list" in block || !holds(block.when, flags)) return null;
    return block.text;
}

function visibleBlock(block: LegalBlock, flags: LegalFlags): string | string[] | null {
    if (typeof block === "string" || !("list" in block)) return visibleText(block, flags);
    if (!holds(block.when, flags)) return null;
    const items = block.list.map((item) => visibleText(item, flags)).filter((t): t is string => t !== null);
    return items.length > 0 ? items : null;
}

/** Keeps the blocks whose conditions hold; drops a section left without any paragraph. */
export function visibleLegalSections(sections: LegalSection[], flags: LegalFlags): VisibleLegalSection[] {
    return sections
        .map((s) => ({
            heading: s.heading,
            body: s.body.map((b) => visibleBlock(b, flags)).filter((b): b is string | string[] => b !== null),
        }))
        .filter((s) => s.body.length > 0);
}
