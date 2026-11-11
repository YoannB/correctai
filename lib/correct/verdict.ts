// CorrectAI domain rules on top of the generic text kit (lib/text/): what KIND of edits the
// model made, and the AI-disclosure verdict that follows (EU AI Act, art. 50 — assistive
// editing exception). Pure: no React, no IO. Axons keeps the generic measure (diff, similarity,
// bands); the legal meaning of an edit belongs here (docs/text-tools.md).
import { isPunctuation, isWhitespace, skeletonOf, type DiffOp } from "@/lib/text/diff";

/** Similarity ratio (on skeletons) at or above which a word replacement is a FORM fix (typo). */
export const FORM_RATIO = 0.6;
/** Below this similarity (%), a form-only correction is still worth a careful re-read. */
export const REVIEW_THRESHOLD = 90;

export type EditKind = "none" | "form" | "content";

/** Levenshtein distance (two rolling rows). */
export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    let curr = new Array<number>(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
}

/**
 * FORM = spelling/accent/case/typo or punctuation; CONTENT = a word added, removed or swapped
 * for a different one (a rewording). Whitespace-only edits do not count.
 */
export function classifyOp(op: DiffOp): EditKind {
    if (op.type === "equal" || isWhitespace(op.text)) return "none";
    if (op.type === "insert" || op.type === "delete") return isPunctuation(op.text) ? "form" : "content";
    const before = skeletonOf(op.old ?? "");
    const after = skeletonOf(op.text);
    if (before === after) return "form";
    const longest = Math.max(before.length, after.length);
    return 1 - levenshtein(before, after) / longest >= FORM_RATIO ? "form" : "content";
}

export interface Verdict {
    formCount: number;
    contentCount: number;
    /** Any rewording => the AI touched the substance: an "AI-generated" label is advised. */
    requireAiTag: boolean;
    /** Form-only corrections: the text stays the author's own, ready to post. */
    readyToPost: boolean;
    /** Ready to post, but so many fixes that a careful re-read is advised (UX, not legal). */
    reviewAdvised: boolean;
}

export function verdictFor(ops: DiffOp[], percent: number, reviewThreshold = REVIEW_THRESHOLD): Verdict {
    let formCount = 0;
    let contentCount = 0;
    for (const op of ops) {
        const kind = classifyOp(op);
        if (kind === "form") formCount++;
        else if (kind === "content") contentCount++;
    }
    const requireAiTag = contentCount > 0;
    const readyToPost = !requireAiTag;
    return {
        formCount,
        contentCount,
        requireAiTag,
        readyToPost,
        reviewAdvised: readyToPost && percent < reviewThreshold,
    };
}

export interface Correction {
    language: string;
    corrected: string;
}

/**
 * Tolerant extraction of the agent's JSON reply ({"language","corrected"}): free models may
 * wrap it in prose or a code fence. Returns null when no usable object is found.
 */
export function parseCorrection(raw: string): Correction | null {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    // The match starts with "{" and ends with "}": JSON.parse yields an object or throws.
    let obj: { language?: unknown; corrected?: unknown };
    try {
        obj = JSON.parse(match[0]) as typeof obj;
    } catch {
        return null;
    }
    const { language, corrected } = obj;
    if (typeof corrected !== "string") return null;
    return { language: typeof language === "string" ? language.toLowerCase() : "", corrected };
}
