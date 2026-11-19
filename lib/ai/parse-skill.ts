// Skill contract: capabilities/skills/<id>/SKILL.md.
// The manifest frontmatter must contain name and description.
// App-specific fields should live under metadata: to avoid conflicting with
// editor-owned agent schemas. Legacy top-level inputs/outputs/model/... are
// still accepted as fallback, but metadata wins when both are present.
// Pure parser: no fs, no network, no server-only.

export interface SkillDef {
    name: string;
    description: string;
    inputs: string[];
    outputs: string[];
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    procedure: string;
}

const DEFAULTS = {
    model: "openrouter/free",
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 25000,
} as const;

interface FrontmatterBucket {
    scalars: Record<string, string>;
    lists: Record<string, string[]>;
}

function createBucket(): FrontmatterBucket {
    return { scalars: {}, lists: {} };
}

function finiteOrThrow(raw: string | undefined, field: string, fallback: number): number {
    if (raw === undefined) return fallback;

    const n = Number(raw);

    if (!Number.isFinite(n)) {
        throw new Error(`Invalid skill: field "${field}" is not numeric (${JSON.stringify(raw)}).`);
    }

    return n;
}

// List written as a scalar: inline `[a, b]`, or a multi-line `- a` value.
function parseListValue(value: string): string[] {
    const v = value.trim();

    if (v.startsWith("[") && v.endsWith("]")) {
        return v
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return v
        .split(/\r?\n/)
        .map((item) => item.replace(/^-\s*/, "").trim())
        .filter(Boolean);
}

function splitFrontmatter(raw: string): { front: string; body: string } {
    const cleaned = raw
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .trim();
    const lines = cleaned.split("\n");

    if (lines[0]?.trim() !== "---") {
        throw new Error("Invalid skill: missing frontmatter (opening and closing --- required).");
    }

    let endIndex = -1;

    for (let i = 1; i < lines.length; i += 1) {
        if (lines[i].trim() === "---") {
            endIndex = i;
            break;
        }
    }

    if (endIndex === -1) {
        throw new Error("Invalid skill: missing frontmatter (opening and closing --- required).");
    }

    return {
        front: lines.slice(1, endIndex).join("\n"),
        body: lines
            .slice(endIndex + 1)
            .join("\n")
            .trim(),
    };
}

function parseFrontmatterBuckets(front: string): {
    top: FrontmatterBucket;
    metadata: FrontmatterBucket;
} {
    const top = createBucket();
    const metadata = createBucket();

    let currentTopList: string | null = null;
    let currentMetaList: string | null = null;
    let inMetadata = false;

    for (const rawLine of front.split(/\r?\n/)) {
        const line = rawLine.replace(/\t/g, "  ");

        if (!line.trim()) continue;

        const indent = line.length - line.trimStart().length;
        const content = line.trim();

        const kv = content.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);

        if (kv) {
            const [, key, rest] = kv;
            const value = (rest ?? "").trim();

            if (indent === 0) {
                currentMetaList = null;
                currentTopList = null;

                inMetadata = key === "metadata" && value === "";

                if (inMetadata) continue;

                if (value === "") {
                    currentTopList = key;
                    top.lists[key] ??= [];
                } else {
                    top.scalars[key] = value;
                }

                continue;
            }

            if (inMetadata) {
                currentTopList = null;
                currentMetaList = null;

                if (value === "") {
                    currentMetaList = key;
                    metadata.lists[key] ??= [];
                } else {
                    metadata.scalars[key] = value;
                }

                continue;
            }

            // Indented keys outside metadata are ignored on purpose.
            continue;
        }

        const item = content.match(/^-\s*(.*)$/);

        if (item) {
            const itemValue = item[1].trim();

            if (!itemValue) continue;

            if (indent > 0 && inMetadata && currentMetaList) {
                metadata.lists[currentMetaList].push(itemValue);
            } else if (currentTopList) {
                top.lists[currentTopList].push(itemValue);
            }
        }
    }

    return { top, metadata };
}

function resolveBucketList(bucket: FrontmatterBucket, key: string): string[] | undefined {
    const scalar = bucket.scalars[key];

    if (scalar !== undefined) return parseListValue(scalar);

    return bucket.lists[key];
}

function pickList(top: FrontmatterBucket, metadata: FrontmatterBucket, key: string): string[] {
    const metadataValue = resolveBucketList(metadata, key);

    if (metadataValue !== undefined) return metadataValue;

    const topValue = resolveBucketList(top, key);

    if (topValue !== undefined) return topValue;

    return [];
}

function pickScalar(top: FrontmatterBucket, metadata: FrontmatterBucket, key: string): string | undefined {
    return metadata.scalars[key] ?? top.scalars[key];
}

export function parseSkill(raw: string): SkillDef {
    const { front, body } = splitFrontmatter(raw);
    const { top, metadata } = parseFrontmatterBuckets(front);

    const name = top.scalars.name;

    if (!name) {
        throw new Error("Invalid skill: name field required.");
    }

    const description = top.scalars.description;

    if (!description) {
        throw new Error("Invalid skill: description field required.");
    }

    return {
        name,
        description,
        inputs: pickList(top, metadata, "inputs"),
        outputs: pickList(top, metadata, "outputs"),
        model: pickScalar(top, metadata, "model") ?? DEFAULTS.model,
        temperature: finiteOrThrow(pickScalar(top, metadata, "temperature"), "temperature", DEFAULTS.temperature),
        maxTokens: finiteOrThrow(pickScalar(top, metadata, "maxTokens"), "maxTokens", DEFAULTS.maxTokens),
        timeoutMs: finiteOrThrow(pickScalar(top, metadata, "timeoutMs"), "timeoutMs", DEFAULTS.timeoutMs),
        procedure: body,
    };
}
