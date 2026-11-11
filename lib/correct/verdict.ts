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

// Lone UTF-16 surrogates (a model escaping an emoji as "\ud83d \udc4f" or cutting a pair):
// they render as "�", so they are dropped.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function toCorrection(language: unknown, corrected: unknown): Correction | null {
    if (typeof corrected !== "string") return null;
    return {
        language: typeof language === "string" ? language.toLowerCase() : "",
        corrected: corrected.replace(LONE_SURROGATE, ""),
    };
}

/**
 * Repairs the usual JSON breakages of free models, string-aware: raw control characters
 * (line breaks, tabs) inside a string are escaped, invalid escapes ("\'", "\é") lose their
 * backslash, a quote inside a string that is not followed by , : } ] is text (kept, escaped
 * if straight), typographic quotes used as delimiters become straight quotes, and trailing
 * commas before "}" / "]" are dropped.
 */
export function repairJson(text: string): string {
    let out = "";
    let inString = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (!inString) {
            if (ch === '"' || ch === "“" || ch === "”") {
                inString = true;
                out += '"';
            } else if (ch === "," && /^\s*[}\]]/.test(text.slice(i + 1))) {
                // trailing comma: dropped
            } else out += ch;
            continue;
        }
        if (ch === "\\") {
            const next = text[i + 1] ?? "";
            if (/^["\\/bfnrt]$/.test(next) || /^u[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 6))) {
                out += ch + next;
                i++;
            }
            // else: invalid escape, the backslash is dropped and `next` is read as a plain char.
        } else if (ch === '"' || ch === "”") {
            // A quote ends the string only where JSON expects it to (before , : } ]); otherwise
            // it is an unescaped quote INSIDE the text.
            if (/^\s*[,:}\]]/.test(text.slice(i + 1))) {
                inString = false;
                out += '"';
            } else out += ch === '"' ? '\\"' : ch;
        } else if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += ch;
    }
    return out;
}

function parseObject(json: string): Correction | null {
    let obj: unknown;
    try {
        obj = JSON.parse(json);
    } catch {
        return null;
    }
    // The candidate starts with "{" and ends with "}": a successful parse is an object.
    const { language, corrected } = obj as { language?: unknown; corrected?: unknown };
    return toCorrection(language, corrected);
}

/** Decodes the body of a JSON string literal leniently (unknown escapes keep their char). */
function unescapeJsonString(body: string): string {
    return body.replace(/\\(u[0-9a-fA-F]{4}|[\s\S])/g, (_, e: string) => {
        if (e.length === 5) return String.fromCharCode(parseInt(e.slice(1), 16));
        return { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[e] ?? e;
    });
}

/**
 * Tolerant extraction of the agent's JSON reply ({"language","corrected"}): free models may
 * wrap it in prose or a code fence, break the JSON (raw line breaks, bad escapes, smart quotes,
 * trailing commas, trailing text) or escape emojis into lone surrogates. Tries, in order: the
 * outermost {…} as is, the same repaired, then a field-level extraction of a COMPLETE
 * "corrected" string. Returns null when no usable correction is found (a truncated reply
 * included: a partial correction would read as deletions).
 */
export function parseCorrection(raw: string): Correction | null {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? (parseObject(match[0]) ?? parseObject(repairJson(match[0]))) : null;
    if (parsed) return parsed;
    // The string must be COMPLETE: its closing quote is followed by "," "}" or the end (a quote
    // followed by anything else is an unescaped quote inside the text).
    const field = raw.match(/["“”]corrected["“”]\s*:\s*"((?:[^"\\]|\\[\s\S]|"(?!\s*(?:[,}]|$)))*)"\s*(?:[,}]|$)/);
    if (!field) return null;
    const language = raw.match(/["“”]language["“”]\s*:\s*"([A-Za-z-]+)"/)?.[1];
    return toCorrection(language, unescapeJsonString(field[1]));
}

/** True when `text` still looks like the agent's JSON envelope (never show it as a correction). */
export function looksLikeEnvelope(text: string): boolean {
    return /^\s*(?:```\w*\s*)?\{/.test(text) || /["“”](?:corrected|language)["“”]\s*:/.test(text);
}

/**
 * The correction to display for a model reply: the parsed "corrected" field (trimmed), else
 * the reply itself when the model skipped the envelope (plain corrected text), else null — a
 * reply that still looks like a JSON envelope is unusable and must never be shown or diffed.
 */
export function correctionFromReply(reply: string): string | null {
    const corrected = parseCorrection(reply)?.corrected.trim();
    if (corrected) return corrected;
    return looksLikeEnvelope(reply) ? null : reply;
}
