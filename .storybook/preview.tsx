import type { Preview } from "@storybook/react";
import { useEffect } from "react";
import "../app/globals.css";
import { StorybookProviders } from "../components/ui/material/StorybookProviders";

/**
 * Parity with the application: the theme lives on documentElement
 * (see docs/react-effects.md: "documentElement.dataset.theme"), NOT on an
 * inner <div>. Reason: MuiDialog / Snackbar / Menu / Tooltip render in a
 * PORTAL attached to <body>, outside any <div> subtree. While data-theme
 * lived on the decorator div, portals inherited :root = dark and
 * stayed dark in Light mode (the Dialog screenshot bug). With the attribute
 * on <html>, the [data-theme] tokens cascade to the whole tree, portals included.
 * The mutation is additive (setAttribute on one attribute), not destructive: it follows
 * the Effects discipline, no cleanup needed (idempotent, rewritten on every
 * globals.theme change).
 */
function ThemedCanvas({ theme, children }: { theme: "dark" | "light"; children: React.ReactNode }) {
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);
    // The div is NO LONGER responsible for the tokens (now on <html>); it
    // only keeps the padding + the full-canvas background (layout: "fullscreen").
    // var(--bg-0) resolves from <html>, so it follows the theme, Light included.
    return <div style={{ padding: 24, background: "var(--bg-0)", minHeight: "100vh" }}>{children}</div>;
}

const preview: Preview = {
    parameters: {
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        // 'fullscreen': the decorator fills the whole canvas => no more white band.
        layout: "fullscreen",
    },
    globalTypes: {
        theme: {
            name: "Theme",
            description:
                "App theme (drives data-theme on the canvas <html> => CSS tokens AND MUI portals follow; does not change the fixed hex values of theme.ts) ",
            defaultValue: "dark",
            toolbar: {
                icon: "contrast",
                items: [
                    { title: "Dark", value: "dark" },
                    { title: "Light", value: "light" },
                ],
                dynamicTitle: true,
            },
        },
    },
    decorators: [
        (Story, context) => {
            const theme = (context.globals.theme as "dark" | "light") ?? "dark";
            return (
                <ThemedCanvas theme={theme}>
                    <StorybookProviders mode={theme}>
                        <Story />
                    </StorybookProviders>
                </ThemedCanvas>
            );
        },
    ],
};

export default preview;
