// components/ui/Loader.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ComponentType } from "react";
import { useState } from "react";
import { AppSplash } from "./AppSplash";
import { Loader, SplashLoader } from "./Loader";

/**
 * Loader uses useTranslations("common") => a next-intl provider is required in isolation.
 * Minimal fallback; can be removed if preview.tsx already mounts the app providers
 * with the real messages. The annotation is on the PARAMETER (Dialog.stories.tsx pattern):
 * annotating the VARIABLE (withSplashDom: ComponentType = ...) broke the Story typing
 * (TS2604/2786, "Story: {}").
 */
const fallbackMessages = {
    common: { loading: "Loading…" },
} as unknown as ComponentProps<typeof NextIntlClientProvider>["messages"];

const withTranslations = (Story: ComponentType) => (
    <NextIntlClientProvider locale="en" messages={fallbackMessages}>
        <Story />
    </NextIntlClientProvider>
);

/**
 * Rebuilds the server #app-splash container (full-screen fixed, see styles/ui/loader.css)
 * to demonstrate the "full-page splash screen" loader and the dismissal mechanics.
 * The real server markup (Logo with .splash-logo + bar, per SPLASH in constants/site.ts) is AppSplash,
 * shown by the SplashWithLogo / SplashBarOnly stories below.
 */
const withSplashContainer = (Story: ComponentType) => (
    <div id="app-splash">
        <Story />
    </div>
);

/**
 * Dismissal trigger. Plain native HTML button (NOT the material Button facade):
 * a neutral component story must not couple neutral->material, which would break
 * if the MUI layer were replaced. The click mounts SplashLoader (user intent,
 * per react-effects.md); its effect adds .is-leaving => #app-splash fades out.
 */
function DismissDemo() {
    const [dismissed, setDismissed] = useState(false);
    return (
        <>
            <Loader size={96} />
            {!dismissed && (
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    style={{
                        marginTop: 4,
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid var(--border-2, #2a3658)",
                        background: "var(--surface-2, #131a30)",
                        color: "var(--text-1, #eaf0ff)",
                        font: "inherit",
                        cursor: "pointer",
                    }}
                >
                    Hide the splash
                </button>
            )}
            {dismissed && <SplashLoader />}
        </>
    );
}

const meta = {
    title: "UI/Loader",
    component: Loader,
    tags: ["autodocs"],
    decorators: [withTranslations],
    parameters: {
        docs: {
            description: {
                component:
                    'Neutral loading indicators. `Loader`: declarative block (role="status", aria-live="polite", constant aria-label) made of the Logo (size via `size`), an animated bar (`showBar`) and a localized label (`showText`) — used in Suspense / AI calls. `SplashLoader`: returns null and hides the pre-hydration #app-splash via the .is-leaving class (opacity/visibility transition, node never removed from the DOM).',
            },
        },
    },
    argTypes: {
        size: {
            control: { type: "number", min: 16, max: 160, step: 4 },
            description: "Size of the Logo (site icon) in px. Default 56.",
        },
        showIcon: {
            control: "boolean",
            description: "Show the Logo. Default true.",
        },
        showBar: {
            control: "boolean",
            description: "Show the progress bar. Default true.",
        },
        showText: {
            control: "boolean",
            description: "Show the localized label. Default true.",
        },
    },
    args: { size: 56, showIcon: true, showBar: true, showText: true },
    render: (args) => <Loader {...args} />,
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Icon + progress + text (default behavior). */
export const Default: Story = {};

/** Icon only (no bar, no text). */
export const IconOnly: Story = {
    args: { showBar: false, showText: false },
};

/** Progress only (no logo, no text). */
export const ProgressOnly: Story = {
    args: { showIcon: false, showText: false },
};

/** Progress + text, no icon. */
export const BarAndText: Story = {
    args: { showIcon: false },
};

/** Different site icon sizes (size passed to the Logo). */
export const Sizes: Story = {
    render: (args) => (
        <div
            style={{
                display: "flex",
                gap: "2rem",
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            {[24, 40, 56, 80].map((s) => (
                <div key={s} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                    <Loader {...args} size={s} showText={false} />
                    <small style={{ color: "var(--muted, #7c8aa8)", fontSize: "0.7rem" }}>{s}px</small>
                </div>
            ))}
        </div>
    ),
};

/** Full-screen splash screen: #app-splash (fixed, z:9999) + centered loader.
 *  Deliberately covers the canvas: that is the real effect of a startup screen. */
export const FullPageSplash: Story = {
    decorators: [withSplashContainer],
    render: () => <Loader size={96} />,
    parameters: {
        docs: {
            description: {
                story: "Structure of the full-screen splash (rebuilt #app-splash container + large Loader): this checks the centered fixed container and the animated bar. The real server markup is AppSplash (see SplashWithLogo).",
            },
        },
    },
};

/** Dismissal mechanics: splash visible, then fades out on click (SplashLoader -> .is-leaving). */
export const SplashDismissal: Story = {
    decorators: [withSplashContainer],
    render: () => <DismissDemo />,
    parameters: {
        docs: {
            description: {
                story: "Before the click: #app-splash visible (Loader + trigger). On click, SplashLoader mounts and its effect adds .is-leaving => opacity/visibility/pointer-events fade, without removing the node from the DOM (additive mutation, per react-effects.md). The container being fixed z:9999, it covers the canvas during the demo.",
            },
        },
    },
};

/** The REAL pre-hydration splash (AppSplash, as app/layout.tsx renders it) with SPLASH = { logo: true }:
 *  the Logo with .splash-logo (animated by CSS) above the bar, grouped in the center. */
export const SplashWithLogo: Story = {
    render: () => <AppSplash logo bar />,
    parameters: {
        docs: {
            description: {
                story: "AppSplash with `logo` and `bar`: the server markup of #app-splash with `SPLASH = { logo: true }` (constants/site.ts). The logo is the real `Logo` (ids from useId) with the `.splash-logo` class, animated by styles/ui/loader.css. Fixed z:9999: it covers the canvas.",
            },
        },
    },
};

/** The default splash (SPLASH.logo false): the progress bar only. */
export const SplashBarOnly: Story = {
    render: () => <AppSplash logo={false} bar />,
};
