import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next@16 ships ESLint 9 configs in flat format.
 * This only normalizes the case where a config would be a single object
 * rather than an array.
 *
 * @param {unknown} config
 * @returns {import('eslint').Linter.Config[]}
 */
const toConfigArray = (config) => (Array.isArray(config) ? config : [config]);

/** @type {import('eslint').Linter.Config[]} */
const config = [
    {
        name: "app/global-ignores",
        ignores: [
            "node_modules/**",
            ".netlify/**",
            ".next/**",
            "out/**",
            "build/**",
            "coverage/**",
            "storybook-static/**",
            "playwright-report/**",
            "test-results/**",
            "next-env.d.ts",
            // Claude Code session worktrees (.claude/worktrees/*: full checkouts with their own
            // .next, storybook-static, node_modules…). Flat config does not read .gitignore.
            ".claude/**",
        ],
    },

    ...toConfigArray(nextCoreWebVitals),
    ...toConfigArray(nextTypescript),

    {
        name: "app/material-ui-boundary",
        files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
        ignores: [
            // @mui imports are only allowed in the Material UI adapter folder.
            // In flat config, a non-global ignore must target files: `dir/**`, not `dir/`.
            "components/ui/material/**",
        ],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["@mui/*", "@mui/**"],
                            message: "@mui imports stay confined to components/ui/material (see AGENTS.md).",
                        },
                    ],
                },
            ],
        },
    },
];

export default config;
