export interface AgentDef {
    id: string;
    name: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    /** Server bound on the user prompt length (characters, after trim). See composeRun. */
    maxPromptChars: number;
    systemPrompt: string;
}

// Server-side bound on the user prompt when the agent does not set `maxPromptChars` (and for
// calls without an agent). The client bound (`Textarea maxLength`) is only a convenience: a
// direct POST to /api/run must not push an unbounded text to the provider (cost, latency, and
// the O(n·m) diff the client runs on the reply).
export const DEFAULT_MAX_PROMPT_CHARS = 8000;
// Frontmatter contract (docs/ai-capabilities.md): leading + closing `---` required; `key: value`
// pairs (colon + space, otherwise the line is ignored); `id` required; FINITE numbers (NaN/
// Infinity = author error, never a silent default); BOM/CRLF tolerated.
// NB: the `input` field NO LONGER exists — in the unified model the prompt is always the
// user message and always required (composeRun), so an "expects/does not expect a prompt" guard
// was dead and contradictory. See docs/ai-capabilities.md.
const DEFAULTS = {
    model: "openrouter/free",
    temperature: 0.7,
    maxTokens: 300,
    timeoutMs: 25000,
} as const;

function finiteOrThrow(raw: string | undefined, field: string, fallback: number): number {
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
        throw new Error(`Invalid agent: field "${field}" is not numeric (${JSON.stringify(raw)}).`);
    }
    return n;
}

function positiveOrThrow(raw: string | undefined, field: string, fallback: number): number {
    const n = finiteOrThrow(raw, field, fallback);
    if (n <= 0) throw new Error(`Invalid agent: field "${field}" must be > 0 (${JSON.stringify(raw)}).`);
    return n;
}

export function parseAgent(raw: string): AgentDef {
    const cleaned = raw.replace(/^﻿/, "").trim();
    const m = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error("Invalid agent: missing frontmatter (opening and closing --- required).");

    const meta: Record<string, string> = {};
    for (const line of m[1].split(/\r?\n/)) {
        const idx = line.indexOf(": ");
        if (idx === -1) continue;
        meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    const id = meta.id;
    if (!id) throw new Error("Invalid agent: id field required.");

    return {
        id,
        name: meta.name ?? id,
        model: meta.model ?? DEFAULTS.model,
        temperature: finiteOrThrow(meta.temperature, "temperature", DEFAULTS.temperature),
        maxTokens: finiteOrThrow(meta.maxTokens, "maxTokens", DEFAULTS.maxTokens),
        timeoutMs: finiteOrThrow(meta.timeoutMs, "timeoutMs", DEFAULTS.timeoutMs),
        maxPromptChars: positiveOrThrow(meta.maxPromptChars, "maxPromptChars", DEFAULT_MAX_PROMPT_CHARS),
        systemPrompt: m[2].trim(),
    };
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
    return template.replace(/{(\w+)}/g, (_, k) => vars[k] ?? "");
}
