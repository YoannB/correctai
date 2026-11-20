import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
    stories: ["../components/**/*.stories.@(ts|tsx)"],
    addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
    framework: { name: "@storybook/nextjs-vite", options: {} },
    // public/ (site assets) + Storybook-only assets served under /storybook-assets (stories must not
    // depend on the demo articles, which a site built from this one replaces).
    staticDirs: ["../public", { from: "./assets", to: "/storybook-assets" }],
};
export default config;
