// CorrectAI tool settings (site-specific; constants/site.ts stays the Axons-shaped site config).

/** Input cap: the LinkedIn post norm. Mirrors `maxPromptChars` in capabilities/agents/correct.md. */
export const MAX_CHARS = 3000;
/** Visible lines of BOTH panes (same `rows` => same height, docs/text-tools.md). */
export const EDITOR_ROWS = 10;
/** Example ids, in display order; copy in messages/*.json → corrector.examples.<id>. */
export const EXAMPLE_IDS = ["linkedin", "pro", "long"] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];
/** Example loaded on arrival (its stored correction is shown, no AI call). */
export const DEFAULT_EXAMPLE: ExampleId = "long";
/** Agent file id (capabilities/agents/<id>.md). */
export const CORRECT_AGENT_ID = "correct";
/** Score bands (lib/text/similarity): 100 / 95-99 / 90-94 / below 90. */
export const BAND_TONES = { perfect: "success", great: "success", good: "warning", low: "error" } as const;
