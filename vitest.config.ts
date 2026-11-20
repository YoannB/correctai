import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Expose ONLY the NEXT_PUBLIC_* variables TO TESTS (never OPENROUTER_API_KEY).
// Vite reads import.meta.env; Next inlines process.env.NEXT_PUBLIC_* at build time.
// Our client code uses process.env.NEXT_PUBLIC_* (literal access), so
// process.env is enough on the Vitest side. Nothing is re-injected into import.meta.env,
// but the NEXT_PUBLIC_* keys are guaranteed to be present in process.env at test runtime.
const publicEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("NEXT_PUBLIC_")));

export default defineConfig({
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./vitest.setup.ts"],
        // Playwright E2E tests (*.spec.ts in e2e/) are EXCLUDED from Vitest.
        include: [
            "tests/**/*.{test,spec}.{ts,tsx}",
            "lib/**/*.{test,spec}.{ts,tsx}",
            "hooks/**/*.{test,spec}.{ts,tsx}",
        ],
        exclude: [
            "tests/e2e/**",
            "node_modules/**",
            ".next/**",
            "storybook-static/**",
            "**/*.stories.{ts,tsx}",
            // Claude Code session worktrees (full checkouts): never collect their tests.
            ".claude/**",
        ],
        env: publicEnv,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            exclude: ["e2e/**", ".storybook/**", "**/*.stories.{ts,tsx}"],
        },
    },
});
