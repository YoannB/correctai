// components/content/ArticleTeaser.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ArticleTeaser } from "./ArticleTeaser";

const meta = {
    title: "Content/ArticleTeaser",
    component: ArticleTeaser,
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Preview of an internal article (the `/articles` list and the home page's \"latest articles\" block). Server Component compatible: no hook, labels arrive already formatted. The title is a real link to the localized URL of the displayed translation; the thumbnail is a decorative duplicate (`aria-hidden`, out of the tab order): the front-matter `image`, else a typographic cover with the title itself (clamped with an ellipsis, optional collection label, colours from the theme tokens). On a language fallback, a badge shows the original's language and the title/summary carry `lang`. Optional status badges (`badges`): **New** (dated less than the collection's `newForDays` ago) and **Archive** (front matter `archived: true` or the collection's `archiveBefore` rule), rendered as text through the neutral Chip.",
            },
        },
    },
    args: {
        title: "Writing an article",
        description: "One folder per article, one Markdown file per language: from the front matter to the sitemap.",
        slug: "writing-an-article",
        locale: "en",
        date: "2026-11-10",
        dateLabel: "Published on November 10, 2026",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: 24, maxWidth: 860 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ArticleTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCover: Story = { args: { image: "/storybook-assets/story-cover.svg" } };
export const WithoutCover: Story = { args: { collectionLabel: "Articles" } };
export const WithoutCoverShortTitle: Story = {
    args: {
        title: "Closures",
        description: "The smallest possible title on a title cover.",
        collectionLabel: "Articles",
    },
};
export const WithoutCoverLongTitle: Story = {
    args: {
        title: "Configuring Webpack, Babel and ESLint together for a React project without losing your mind in the process",
        description: "A title too long for the cover: it is clamped on whole words with an ellipsis.",
        collectionLabel: "Articles",
    },
};
export const WithoutCoverNoLabel: Story = {};
export const LanguageFallback: Story = {
    args: {
        title: "Écrire un article",
        description: "Un dossier par article, un fichier Markdown par langue : de l'entête YAML au sitemap.",
        slug: "ecrire-un-article",
        locale: "fr",
        dateLabel: "Published on November 3, 2026",
        fallback: { flag: "🇫🇷", label: "Français", title: "Only available in Français" },
    },
};
export const InHomeBlock: Story = { args: { headingLevel: "h3", image: "/storybook-assets/story-cover.svg" } };
export const NewEntry: Story = {
    args: { image: "/storybook-assets/story-cover.svg", badges: [{ kind: "new", label: "New" }] },
};
export const ArchivedEntry: Story = {
    args: {
        title: "Debugging JavaScript in 2015",
        description: "An old entry kept online as it was published: the card says so with an Archive badge.",
        slug: "debugging-javascript",
        date: "2015-03-12",
        dateLabel: "Published on March 12, 2015",
        badges: [{ kind: "archive", label: "Archive" }],
    },
};
export const ArchivedFallback: Story = {
    args: {
        ...LanguageFallback.args,
        date: "2015-03-12",
        dateLabel: "Published on March 12, 2015",
        badges: [{ kind: "archive", label: "Archive" }],
    },
};
