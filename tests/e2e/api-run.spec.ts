import { expect, test } from "@playwright/test";

function e2eIp(suffix: string): string {
    const info = test.info();

    return `e2e-${suffix}-${info.workerIndex}-${info.testId}`;
}

test.describe("POST /api/run — server contract, no model call", () => {
    // Serial mode to limit the effects of the best-effort in-memory rate limit.
    test.describe.configure({ mode: "serial" });

    test("non-JSON body → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": e2eIp("invalid-json"),
            },
            data: "not-json",
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("missing prompt → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("missing-prompt"),
            },
            data: {},
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("empty prompt → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("empty-prompt"),
            },
            data: {
                prompt: "",
            },
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("prompt over the server bound → 400 invalid (never sent to the model)", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("long-prompt"),
            },
            // DEFAULT_MAX_PROMPT_CHARS (lib/ai/parse-agent.ts) is 8000; no agent => default bound.
            data: {
                prompt: "a".repeat(8001),
            },
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("whitespace-only prompt → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("whitespace-prompt"),
            },
            data: {
                prompt: "   ",
            },
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("unknown agentId → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("missing-agent"),
            },
            data: {
                prompt: "E2E test",
                agentId: "e2e-agent-does-not-exist",
            },
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    test("unknown skillId → 400 invalid", async ({ request }) => {
        const response = await request.post("/api/run", {
            headers: {
                "x-forwarded-for": e2eIp("missing-skill"),
            },
            data: {
                prompt: "E2E test",
                skillId: "e2e-skill-does-not-exist",
            },
        });

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body).toMatchObject({
            error: {
                code: "invalid",
            },
        });
    });

    for (const [field, value] of [
        ["agentId", "../../docs/architecture"],
        ["skillId", "../agents"],
    ] as const) {
        test(`${field} with path traversal → 400 invalid`, async ({ request }) => {
            const response = await request.post("/api/run", {
                headers: {
                    "x-forwarded-for": e2eIp(`traversal-${field}`),
                },
                data: {
                    prompt: "E2E test",
                    [field]: value,
                },
            });

            expect(response.status()).toBe(400);

            const body = await response.json();

            expect(body).toMatchObject({
                error: {
                    code: "invalid",
                },
            });
        });
    }
});
