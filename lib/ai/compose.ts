import type { AgentDef } from "./parse-agent";
import { DEFAULT_MAX_PROMPT_CHARS, renderPrompt } from "./parse-agent";
import type { LoadedSkill, SkillResource } from "./skill-pure";
import { serializeSkillResources } from "./skill-pure";

// PURE composition of an AI call: prompt (user message, required) + agent? (profile:
// system section + execution params) + skill? (method: procedure + resources,
// filterable). No IO, no network, no "server-only" dependency => importable and
// 100% tested in Vitest/jsdom. Type imports from ./skill-pure are erased at
// runtime (import type), so loading compose.ts does NOT pull node:fs into the client.
export interface ComposeInput {
    prompt: string;
    agent?: AgentDef;
    skill?: LoadedSkill;
    inputs?: Record<string, string>;
    includeResources?: string[];
}

export interface ComposedRun {
    messages: { role: "system" | "user"; content: string }[];
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
}

// Baseline when there is NEITHER agent NOR skill: the boilerplate's default execution profile.
const DEFAULTS = {
    model: "openrouter/free",
    temperature: 0.7,
    maxTokens: 300,
    timeoutMs: 25000,
} as const;

// TOLERANT resource filter: if includeResources is given, only those relPaths are kept;
// a requested but missing path is IGNORED (the caller picks a subset; the whole
// request does not crash because a resource disappeared from the skill folder).
function filterResources(resources: SkillResource[], include?: string[]): SkillResource[] {
    if (!include) return resources;

    const set = new Set(include);

    return resources.filter((r) => set.has(r.relPath));
}

export function composeRun({ prompt, agent, skill, inputs = {}, includeResources }: ComposeInput): ComposedRun {
    const user = prompt?.trim();
    if (!user) throw new Error("composeRun: prompt is required and must not be empty.");
    // Server bound (the agent's, else the default): run() maps this throw to AiError('invalid', 400).
    const limit = agent ? agent.maxPromptChars : DEFAULT_MAX_PROMPT_CHARS;
    if (user.length > limit) throw new Error(`composeRun: prompt too long (${user.length} > ${limit} characters).`);

    const sections: string[] = [];

    if (agent) sections.push("## Agent profile\n" + renderPrompt(agent.systemPrompt, inputs));

    if (skill) {
        sections.push("## Skill procedure\n" + renderPrompt(skill.procedure, inputs));

        const res = filterResources(skill.resources, includeResources);
        if (res.length) sections.push("## Skill resources\n" + serializeSkillResources(res));
    }

    const system = sections.join("\n\n");

    const messages = system
        ? [
              { role: "system" as const, content: system },
              { role: "user" as const, content: user },
          ]
        : [{ role: "user" as const, content: user }];

    // Precedence BY WHOLE SOURCE (see design note): the agent is the execution
    // profile; failing that the skill; otherwise DEFAULTS. Fields are never overridden one by one.
    const src = agent ?? skill;

    return {
        messages,
        model: src ? src.model : DEFAULTS.model,
        temperature: src ? src.temperature : DEFAULTS.temperature,
        maxTokens: src ? src.maxTokens : DEFAULTS.maxTokens,
        timeoutMs: src ? src.timeoutMs : DEFAULTS.timeoutMs,
    };
}
