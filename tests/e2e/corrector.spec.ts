import { expect, test, type Page } from "@playwright/test";
import { firstToast, mockRun, mockRunSequence, mockRunWithCounter } from "./support/ai";
import { usageCount } from "./support/storage";

// CorrectAI tool (components/home/Corrector.tsx). /api/run is mocked: no spec reaches the model.
// "/fr" forces French (headless Chromium negotiates English on "/").

async function ready(page: Page) {
    await page.goto("/fr");
    await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
}

const tool = (page: Page) => page.locator("section.corrector");
const input = (page: Page) => tool(page).getByRole("textbox", { name: "Texte à corriger" });
const result = (page: Page) => tool(page).getByRole("region", { name: "Texte corrigé" });
const runButton = (page: Page) => tool(page).getByRole("button", { name: /Lancer la correction|Correction…/ });
const example = (page: Page, name: string) => tool(page).getByRole("radio", { name });

// Retries until React owns the field: under `next dev` a fill can land before hydration ends.
async function typeText(page: Page, text: string) {
    await expect(async () => {
        await input(page).fill(text);
        await expect(input(page)).toHaveValue(text, { timeout: 500 });
    }).toPass();
}

const reply = (corrected: string) => ({ text: JSON.stringify({ language: "fr", corrected }) });

test.describe("Corrector — examples, guard, stale result", () => {
    test("arrives on the default example with its stored correction (no AI call)", async ({ page }) => {
        const counter = await mockRunWithCounter(page, { body: reply("x") });
        await ready(page);
        await expect(example(page, "Un texte plus long")).toBeChecked();
        await expect(input(page)).toHaveValue(/de votre coté/);
        await expect(result(page).locator("mark.diff--replace")).toHaveText("côté");
        await expect(tool(page).getByText("Très bon !")).toBeVisible();
        await expect(tool(page).getByText("Prêt à poster")).toBeVisible();
        expect(counter.hits).toBe(0);
    });

    test("switching examples needs no confirmation; typed text does", async ({ page }) => {
        await ready(page);
        await example(page, "Un message pro").click();
        await expect(input(page)).toHaveValue(/vous contacté/);

        await typeText(page, "Mon propre texte avec une faute.");
        // The old result no longer matches the source: placeholder + "Modifié" flag.
        await expect(result(page)).toContainText("Le texte corrigé apparaîtra ici");
        await expect(tool(page).getByText("Modifié")).toBeVisible();

        await example(page, "Un commentaire LinkedIn").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("Un commentaire LinkedIn");
        await dialog.getByRole("button", { name: "Annuler" }).click();
        await expect(input(page)).toHaveValue("Mon propre texte avec une faute.");

        await tool(page)
            .getByRole("button", { name: /Vider les deux zones/ })
            .click();
        await page.getByRole("dialog").getByRole("button", { name: "Réinitialiser" }).click();
        await expect(input(page)).toHaveValue("");
        await expect(runButton(page)).toBeDisabled();
    });

    test("the detected language follows the typed text", async ({ page }) => {
        await ready(page);
        await typeText(page, "I hope you are doing well and that this message finds you in good health.");
        await expect(tool(page).locator(".corrector__lang")).toContainText("English");
    });

    test("the French LinkedIn example is detected as French (not Español)", async ({ page }) => {
        await ready(page);
        await example(page, "Un commentaire LinkedIn").click();
        await expect(input(page)).toHaveValue(/Tres beau partage/);
        await expect(tool(page).locator(".corrector__lang")).toContainText("Français");
    });
});

test.describe("Corrector — AI call (client boundary)", () => {
    test("useful reply: pending guard, diff + verdict, credit consumed", async ({ page }) => {
        const counter = await mockRunWithCounter(page, {
            delayMs: 400,
            body: reply("Bonjour à tous, la réunion est décalée."),
        });
        await ready(page);
        await typeText(page, "Bonjour a tous, la reunion est decalee.");
        await runButton(page).click();
        await expect(input(page)).toBeDisabled();
        await expect(result(page).locator("mark.diff--replace").first()).toHaveText("à");
        await expect(input(page)).toBeEnabled();
        expect(counter.hits).toBe(1);
        expect(await usageCount(page)).toBe(1);
    });

    test("a reply outside the JSON envelope is used as the correction", async ({ page }) => {
        await mockRun(page, { body: { text: "Bonjour à tous." } });
        await ready(page);
        await typeText(page, "Bonjour a tous.");
        await runButton(page).click();
        await expect(result(page)).toContainText("Bonjour à tous.");
    });

    test("a broken JSON envelope is repaired: emoji decoded, credit consumed", async ({ page }) => {
        // Escaped surrogate pair + trailing text with braces: JSON.parse fails on the whole reply.
        await mockRun(page, {
            body: { text: '{"language":"fr","corrected":"Bravo à tous \\ud83d\\udc4f"} (note : {fin})' },
        });
        await ready(page);
        await typeText(page, "Bravo a tous 👏");
        await runButton(page).click();
        await expect(result(page).locator("mark.diff--replace")).toHaveText("à");
        await expect(result(page)).toContainText("Bravo à tous 👏");
        await expect(result(page)).not.toContainText("corrected");
        expect(await usageCount(page)).toBe(1);
    });

    test("an unusable JSON envelope is never shown: error toast, credit not consumed", async ({ page }) => {
        // Truncated reply: no complete "corrected" string can be recovered.
        await mockRun(page, { body: { text: '{"language":"fr","corrected":"Très beau partage ! Cela me rappelle' } });
        await ready(page);
        await typeText(page, "Tres beau partage ! Cela me rappel un projet.");
        await runButton(page).click();
        await expect(firstToast(page)).toContainText("La génération IA a échoué");
        await expect(runButton(page)).toBeEnabled();
        await expect(result(page)).not.toContainText("corrected");
        await expect(result(page)).toContainText("Le texte corrigé apparaîtra ici");
        expect(await usageCount(page)).toBeNull();
    });

    for (const [name, mock] of [
        ["HTTP error", { status: 500, body: { error: { code: "provider", message: "provider" } } }],
        ["empty 200 reply", { body: { text: "" } }],
        ["rate limit", { status: 429, body: { error: { code: "rate", message: "quota" } } }],
    ] as const) {
        test(`${name}: error toast, button re-enabled, credit not consumed`, async ({ page }) => {
            await mockRun(page, mock);
            await ready(page);
            await typeText(page, "Un texte a corriger.");
            await runButton(page).click();
            await expect(firstToast(page)).toBeVisible();
            await expect(runButton(page)).toBeEnabled();
            expect(await usageCount(page)).toBeNull();
        });
    }

    test("credit consumed only on a useful reply: error then success", async ({ page }) => {
        await mockRunSequence(page, [
            { status: 429, body: { error: { code: "rate", message: "quota" } } },
            { body: reply("Un texte à corriger.") },
        ]);
        await ready(page);
        await typeText(page, "Un texte a corriger.");
        await runButton(page).click();
        await expect(firstToast(page)).toBeVisible();
        expect(await usageCount(page)).toBeNull();
        await runButton(page).click();
        await expect(result(page).locator("mark.diff--replace")).toHaveText("à");
        expect(await usageCount(page)).toBe(1);
    });
});
