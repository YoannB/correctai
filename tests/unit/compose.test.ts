import { composeRun } from "@/lib/ai/compose";
import { DEFAULT_MAX_PROMPT_CHARS, parseAgent } from "@/lib/ai/parse-agent";
import { parseSkill } from "@/lib/ai/parse-skill";
import type { LoadedSkill } from "@/lib/ai/skill-pure";
import { describe, expect, it } from "vitest";

// BASELINE: PURE composition, no fs/network/mock. Each it locks ONE branch of
// composeRun (required prompt, agent/skill/resources sections, tolerant filter, precedence
// by source, inputs substitution). Fixtures are really parsed (not literals) to also exercise
// parse-agent/parse-skill. NB: top-level fixtures MUST have their closing `---`
// (the parser fails fast on the frontmatter) — an omission crashes the whole module
// at import (const evaluated before any `it`), hence a "0 test / Failed Suites".

const AGENT = parseAgent(`---
id: hello
name: Greeting
model: acme/pro
temperature: 0.5
maxTokens: 120
timeoutMs: 9000
---
Reply in {locale}.
`);
const SKILL_BASE = parseSkill(`---
name: i18n-copy
description: d
inputs: [locale, namespace]
outputs: [messages patch]
model: acme/copy
temperature: 0.2
maxTokens: 1500
timeoutMs: 12000
---
Do {namespace} in {locale}.
`);
const skillWith = (resources: { relPath: string; content: string }[]): LoadedSkill => ({
    ...SKILL_BASE,
    id: "i18n-copy",
    resources,
});

describe("composeRun — required prompt", () => {
    it("throws on an empty prompt (!user branch)", () => {
        expect(() => composeRun({ prompt: "" })).toThrow(/prompt/);
    });
    it("throws on a whitespace-only prompt", () => {
        expect(() => composeRun({ prompt: "   \n " })).toThrow(/prompt/);
    });
    it("prompt over the default bound, no agent => throws (DEFAULT_MAX_PROMPT_CHARS branch)", () => {
        expect(() => composeRun({ prompt: "a".repeat(DEFAULT_MAX_PROMPT_CHARS + 1) })).toThrow(/too long/);
    });
    it("prompt exactly at the default bound => accepted", () => {
        expect(composeRun({ prompt: "a".repeat(DEFAULT_MAX_PROMPT_CHARS) }).messages).toHaveLength(1);
    });
    it("agent bound wins over the default (agent.maxPromptChars branch)", () => {
        const short = parseAgent("---\nid: s\nmaxPromptChars: 5\n---\nsys");
        expect(() => composeRun({ prompt: "abcdef", agent: short })).toThrow(/6 > 5/);
        expect(composeRun({ prompt: "  abcde  ", agent: short }).messages[1].content).toBe("abcde");
    });
    it("prompt only => user message only + DEFAULTS (!system branch, src undefined)", () => {
        const c = composeRun({ prompt: " hi " });
        expect(c.messages).toEqual([{ role: "user", content: "hi" }]);
        expect(c).toMatchObject({
            model: "openrouter/free",
            temperature: 0.7,
            maxTokens: 300,
            timeoutMs: 25000,
        });
    });
});

describe("composeRun — system sections", () => {
    it("agent only => Agent profile section rendered, agent params", () => {
        const c = composeRun({
            prompt: "t",
            agent: AGENT,
            inputs: { locale: "fr" },
        });
        expect(c.messages[0]).toEqual({
            role: "system",
            content: "## Agent profile\nReply in fr.",
        });
        expect(c.messages[1]).toEqual({ role: "user", content: "t" });
        expect(c).toMatchObject({
            model: "acme/pro",
            temperature: 0.5,
            maxTokens: 120,
            timeoutMs: 9000,
        });
    });
    it("skill only => Skill procedure section (+ no resources => no resources section)", () => {
        const c = composeRun({
            prompt: "t",
            skill: skillWith([]),
            inputs: { locale: "fr", namespace: "nav" },
        });
        expect(c.messages[0]!.content).toContain("## Skill procedure\nDo nav in fr.");
        expect(c.messages[0]!.content).not.toContain("## Skill resources");
        expect(c).toMatchObject({
            model: "acme/copy",
            temperature: 0.2,
            maxTokens: 1500,
            timeoutMs: 12000,
        });
    });
    it("agent+skill => both sections, agent then skill", () => {
        const c = composeRun({
            prompt: "t",
            agent: AGENT,
            skill: skillWith([]),
            inputs: { locale: "en", namespace: "x" },
        });
        const sys = c.messages[0]!.content;
        expect(sys.indexOf("## Agent profile")).toBeLessThan(sys.indexOf("## Skill procedure"));
    });
    it("resources present => Skill resources section serialized", () => {
        const c = composeRun({
            prompt: "t",
            skill: skillWith([{ relPath: "tool.json", content: "{}" }]),
            inputs: { locale: "fr", namespace: "n" },
        });
        expect(c.messages[0]!.content).toContain("## Skill resources\n### Resource: tool.json\n{}\n");
    });
});

describe("composeRun — resource filter (tolerant)", () => {
    const skill = skillWith([
        { relPath: "a.md", content: "A" },
        { relPath: "b.json", content: "B" },
    ]);
    it("includeResources restricted to the requested relPaths", () => {
        const c = composeRun({
            prompt: "t",
            skill,
            inputs: { locale: "fr", namespace: "n" },
            includeResources: ["b.json"],
        });
        const sys = c.messages[0]!.content;
        expect(sys).toContain("### Resource: b.json");
        expect(sys).not.toContain("### Resource: a.md");
    });
    it("requested but missing path => ignored without crash (filter branch)", () => {
        const c = composeRun({
            prompt: "t",
            skill,
            inputs: { locale: "fr", namespace: "n" },
            includeResources: ["zzz.md"],
        });
        expect(c.messages[0]!.content).not.toContain("## Skill resources");
    });
    it("includeResources absent => all resources (!include branch)", () => {
        const c = composeRun({
            prompt: "t",
            skill,
            inputs: { locale: "fr", namespace: "n" },
        });
        const sys = c.messages[0]!.content;
        expect(sys).toContain("### Resource: a.md");
        expect(sys).toContain("### Resource: b.json");
    });
});

describe("composeRun — param precedence (per whole source)", () => {
    it("agent present => its params win over the skill (src=agent branch)", () => {
        const c = composeRun({
            prompt: "t",
            agent: AGENT,
            skill: skillWith([]),
            inputs: { locale: "fr", namespace: "n" },
        });
        expect(c.model).toBe("acme/pro");
        expect(c.temperature).toBe(0.5);
    });
    it("no agent, skill present => skill params (src=skill branch)", () => {
        const c = composeRun({
            prompt: "t",
            skill: skillWith([]),
            inputs: { locale: "fr", namespace: "n" },
        });
        expect(c.model).toBe("acme/copy");
    });
});

describe("composeRun — substitution inputs", () => {
    it("unknown placeholders become empty in agent AND skill (?? '')", () => {
        const c = composeRun({
            prompt: "t",
            agent: AGENT,
            skill: skillWith([]),
            inputs: {},
        });
        expect(c.messages[0]!.content).toContain("Reply in .");
        expect(c.messages[0]!.content).toContain("Do  in .");
    });
});
