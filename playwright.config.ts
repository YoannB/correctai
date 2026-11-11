import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same .env* resolution as `next` (process env wins over files), so specs see the SAME
// NEXT_PUBLIC_* as the server under test (e.g. the default locale, tests/e2e/support/locale-path.ts).
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
    testDir: "./tests/e2e",
    testMatch: "**/*.spec.ts", // Vitest unit tests (*.test.*) are NOT here
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["html", { open: "never" }], ["list"]],
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    // CI serves the PRODUCTION build made by the previous step (`next start`): no on-demand
    // compilation, so pages answer in milliseconds instead of timing out under load, and the
    // tested bundle is the deployed one. Locally `next dev` keeps the edit loop fast.
    webServer: {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
});
