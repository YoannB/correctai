// components/ui/material/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { Button } from "../Button"; // neutral facade → tests the public API, not MUI
const meta = {
    title: "UI/Button",
    component: Button,
    tags: ["autodocs"],
    argTypes: {
        variant: { control: "select", options: ["primary", "secondary", "ghost"] },
        size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {
    args: { variant: "primary", children: "Primary button" },
};
export const Loading: Story = {
    args: { variant: "primary", loading: true, children: "Sending…" },
};
export const Disabled: Story = {
    args: { variant: "secondary", disabled: true, children: "Secondary" },
};

// LINK MODE: `href` renders a real <a> styled as the button (never <a><button>). An internal
// pathname goes through next-intl's Link, which reads the locale => provider in isolation.
const withLocale: NonNullable<Story["decorators"]> = [
    (Story) => (
        <NextIntlClientProvider locale="fr" messages={{}}>
            <Story />
        </NextIntlClientProvider>
    ),
];
export const AsLink: Story = {
    args: { variant: "secondary", size: "lg", href: "/sitemap", children: "Sitemap" },
    decorators: withLocale,
    parameters: {
        docs: {
            description: {
                story: "With `href`, the button is a real `<a>` link (same glow/gradient): a single tab stop, Enter navigates. Internal path => localized URL (`/fr/plan-du-site`, the decorator forces the `fr` locale).",
            },
        },
    },
};
export const AsLinkPrimary: Story = {
    args: { variant: "primary", href: "/", children: "Back to home" },
    decorators: withLocale,
};
export const ExternalLink: Story = {
    args: { variant: "ghost", href: "https://github.com/example/app", children: "Source code" },
};
export const DisabledLink: Story = {
    args: { variant: "secondary", href: "/sitemap", disabled: true, children: "Sitemap" },
    decorators: withLocale,
    parameters: {
        docs: {
            description: {
                story: "A disabled link loses its `href` and becomes a `<button disabled>` again: neither focusable nor navigable.",
            },
        },
    },
};

// `external`: new tab (target/rel set by the adapter) + a visually hidden "(new tab)" read from
// common.newTab => the provider must carry that message.
const withNewTabMessage: NonNullable<Story["decorators"]> = [
    (Story) => (
        <NextIntlClientProvider locale="en" messages={{ common: { newTab: "(new tab)" } }}>
            <Story />
        </NextIntlClientProvider>
    ),
];
export const External: Story = {
    args: { variant: "secondary", href: "https://github.com/example/app", external: true, children: "Source code" },
    decorators: withNewTabMessage,
    parameters: {
        docs: {
            description: {
                story: '`external` opens the link in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) and appends a visually hidden, localized "(new tab)" to its accessible name. Only accepted with `href` (type error otherwise).',
            },
        },
    },
};
export const Busy: Story = {
    args: { variant: "primary", busy: true, children: "Saving…" },
    parameters: {
        docs: {
            description: {
                story: "`busy`: same spinner and look as `loading`, but `aria-disabled` + `aria-busy` instead of the native `disabled`: the button keeps the focus (Tab to it) while clicks and Enter/Space are ignored.",
            },
        },
    },
};
export const BusySecondary: Story = {
    args: { variant: "secondary", busy: true, children: "Checking…" },
};
