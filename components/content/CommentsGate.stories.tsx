// components/content/CommentsGate.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { CommentsGate } from "./CommentsGate";

const meta = {
    title: "Content/CommentsGate",
    component: CommentsGate,
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Placeholder shown under a non-archived collection entry INSTEAD of the Disqus thread, until the visitor chooses (CNIL: nothing from Disqus is requested before). `Show comments` loads the thread for this page only; `Always show comments` records the `comments` consent purpose. Copy arrives translated (`comments` messages): the component stays neutral. Wrapped by `EntryComments`, which owns the decision and the on-demand Disqus chunk.",
            },
        },
    },
    argTypes: {
        onShow: { description: "Loads the comments for this page only." },
        onAlways: { description: "Grants the comments purpose, then loads them." },
    },
    args: {
        notice: "Comments are provided by Disqus, a third-party service. Showing them loads Disqus, which may place its own cookies and process your data under its privacy policy.",
        showLabel: "Show comments",
        alwaysLabel: "Always show comments",
        policyLabel: "Disqus privacy policy",
        policyUrl: "https://disqus.com/privacy-policy/",
        onShow: fn(),
        onAlways: fn(),
    },
} satisfies Meta<typeof CommentsGate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const French: Story = {
    args: {
        notice: "Les commentaires sont fournis par Disqus, un service tiers. Les afficher charge Disqus, qui peut déposer ses propres cookies et traiter vos données selon sa politique de confidentialité.",
        showLabel: "Afficher les commentaires",
        alwaysLabel: "Toujours afficher les commentaires",
        policyLabel: "Politique de confidentialité de Disqus",
    },
};
