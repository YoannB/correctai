import { DEFAULT_MAX_PROMPT_CHARS, parseAgent, renderPrompt } from "@/lib/ai/parse-agent";
import { describe, expect, it } from "vitest";

// Pure BASELINE (no fs/network/mock). NB: the `input` field no longer exists in the agent
// contract (unified model: prompt always required, see docs/ai-capabilities.md) — the cases that
// tested it were removed, not replaced by decorative ones.

const FULL = `---
id: hello
name: Salutation IA
model: openrouter/free
temperature: 0.7
maxTokens: 200
timeoutMs: 25000
---
Salue dans la langue {locale}.
`;

describe("parseAgent — nominal path", () => {
    it("extracts frontmatter + prompt (regex OK, all keys present)", () => {
        expect(parseAgent(FULL)).toEqual({
            id: "hello",
            name: "Salutation IA",
            model: "openrouter/free",
            temperature: 0.7,
            maxTokens: 200,
            timeoutMs: 25000,
            maxPromptChars: DEFAULT_MAX_PROMPT_CHARS,
            systemPrompt: "Salue dans la langue {locale}.",
        });
    });
    it("tolerates CRLF", () => {
        expect(parseAgent(FULL.replace(/\n/g, "\r\n")).id).toBe("hello");
    });
    it("tolerates BOM + leading/trailing whitespace", () => {
        expect(parseAgent("\uFEFF\n\n" + FULL + "\n\n").id).toBe("hello");
    });
    it("normalizes spaces around key/value", () => {
        const a = parseAgent("---\n  id  :  hello  \n---\nb");
        expect(a.id).toBe("hello");
        expect(a.name).toBe("hello");
    });
    it("preserves an inner '---' in the body (lazy capture)", () => {
        expect(parseAgent("---\nid: x\n---\nintro\n---\nfin").systemPrompt).toBe("intro\n---\nfin");
    });
    it("empty body => ''", () => {
        expect(parseAgent("---\nid: x\n---\n").systemPrompt).toBe("");
    });
});

describe("parseAgent — defaults (?? DEFAULTS branch)", () => {
    it("requires only id", () => {
        expect(parseAgent("---\nid: x\n---\nbody")).toMatchObject({
            id: "x",
            name: "x",
            model: "openrouter/free",
            temperature: 0.7,
            maxTokens: 300,
            timeoutMs: 25000,
            maxPromptChars: DEFAULT_MAX_PROMPT_CHARS,
        });
    });
    it("ignores a line without ': '", () => {
        expect(parseAgent("---\nid: x\ntemperature0.9\n---\nb").temperature).toBe(0.7);
    });
    it("coerces numerics written as strings", () => {
        const a = parseAgent("---\nid: x\ntemperature: 0.9\nmaxTokens: 512\ntimeoutMs: 30000\n---\nb");
        expect(a.temperature).toBe(0.9);
        expect(a.maxTokens).toBe(512);
        expect(a.timeoutMs).toBe(30000);
    });
});

describe("parseAgent — maxPromptChars (server bound on the prompt)", () => {
    it("reads a positive value", () => {
        expect(parseAgent("---\nid: x\nmaxPromptChars: 3000\n---\nb").maxPromptChars).toBe(3000);
    });
    it("rejects a non-numeric value", () => {
        expect(() => parseAgent("---\nid: x\nmaxPromptChars: lots\n---\nb")).toThrow(/maxPromptChars/);
    });
    it("rejects 0 (would refuse every call)", () => {
        expect(() => parseAgent("---\nid: x\nmaxPromptChars: 0\n---\nb")).toThrow(/must be > 0/);
    });
    it("rejects a negative value", () => {
        expect(() => parseAgent("---\nid: x\nmaxPromptChars: -5\n---\nb")).toThrow(/must be > 0/);
    });
});

describe("parseAgent — authoring errors (throw branches)", () => {
    it("rejects a missing closing '---'", () => {
        expect(() => parseAgent("---\nid: x\nbody")).toThrow(/frontmatter/);
    });
    it("rejects a missing opening '---'", () => {
        expect(() => parseAgent("id: x\n---\nbody")).toThrow(/frontmatter/);
    });
    it("rejects an empty string", () => {
        expect(() => parseAgent("")).toThrow(/frontmatter/);
    });
    it("rejects a missing id", () => {
        expect(() => parseAgent("---\nname: y\n---\nbody")).toThrow(/id field required/);
    });
    it("rejects an empty id", () => {
        expect(() => parseAgent("---\nid:\n---\nbody")).toThrow(/id field required/);
    });
    it("rejects a non-finite temperature (NaN)", () => {
        expect(() => parseAgent("---\nid: x\ntemperature: abc\n---\nb")).toThrow(/temperature/);
    });
    it("rejects timeoutMs Infinity", () => {
        expect(() => parseAgent("---\nid: x\ntimeoutMs: Infinity\n---\nb")).toThrow(/timeoutMs/);
    });
    it("accepts empty maxTokens => 0 (Number('') is finite, does NOT throw)", () => {
        expect(parseAgent("---\nid: x\nmaxTokens: \n---\nb").maxTokens).toBe(0);
    });
});

describe("renderPrompt", () => {
    it("replaces known placeholders", () => {
        expect(renderPrompt("Hello {locale}", { locale: "fr" })).toBe("Hello fr");
    });
    it("empties unknown placeholders (?? '')", () => {
        expect(renderPrompt("A {missing} B", {})).toBe("A  B");
    });
    it("replaces every occurrence (/g)", () => {
        expect(renderPrompt("{x}-{x}", { x: "1" })).toBe("1-1");
    });
    it("ignores a placeholder with a space (\\w+ does not match)", () => {
        expect(renderPrompt("{a b} ok", { "a b": "z" })).toBe("{a b} ok");
    });
});
