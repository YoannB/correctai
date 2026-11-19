// components/content/ArticleBody.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ArticleBody } from "./ArticleBody";

const SAMPLE = `A paragraph with **bold**, _italics_, \`code\`, an [internal link](/articles) and an [external link](https://nextjs.org).

# A level-1 heading (demoted to h2)

## A list

- first item;
- [x] done task;
- [ ] task to do.

## A table (GFM)

| Field  | Role                          |
| ------ | ----------------------------- |
| \`slug\` | Last segment of the URL       |
| \`date\` | Publication day (YYYY-MM-DD)  |

## Some code

\`\`\`yaml
# front matter
title: "Writing an article"
slug: writing-an-article
\`\`\`

> A quote, and ignored raw HTML: <b>not interpreted</b>.

![Cover](/storybook-assets/story-cover.svg)
`;

const meta = {
    title: "Content/ArticleBody",
    component: ArticleBody,
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Markdown article body rendered as React elements (`react-markdown` + `remark-gfm`), without `dangerouslySetInnerHTML`: raw HTML in the source is not interpreted. Fenced code blocks are highlighted at render time (`rehype-highlight`, no client JS); an unknown language stays plain text. A `# Heading` becomes `<h2>` (the `<h1>` is the page title); external links open in a new tab with `noopener`; wide tables scroll inside their own box (no mobile overflow).",
            },
        },
    },
    args: { markdown: SAMPLE },
    decorators: [
        (Story) => (
            <div className="card" style={{ margin: 24, padding: 24, maxWidth: 760 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ArticleBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllElements: Story = {};

const CODE_SAMPLES = `JavaScript:

~~~js
import { join } from "node:path";

// Resolve the content root
export function root(dir = "articles") {
    return join(process.cwd(), "content", dir, String(42));
}
~~~

Bash:

~~~bash
# install and run
npm ci && npm run build
echo "done: $?"
~~~

HTML:

~~~html
<!-- card -->
<a class="card" href="/fr/articles" data-id="1">Lire</a>
~~~

CSS:

~~~css
.card:hover {
    color: var(--accent-2);
    margin: 0 auto 12px;
}
~~~

Stylus:

~~~stylus
$accent = #22d3ee
.card
  color $accent
  &:hover
    opacity 0.8
~~~

JSON:

~~~json
{ "slug": "writing-articles", "draft": false, "order": 3 }
~~~

Unknown language (plain text, no error):

~~~klingon
qapla' batlh
~~~
`;

// Server-rendered highlighting (rehype-highlight): toggle the theme to check both palettes.
export const CodeBlocks: Story = { args: { markdown: CODE_SAMPLES } };
export const NarrowTable: Story = {
    args: {
        markdown:
            "| a | b | c | d | e | f |\n| - | - | - | - | - | - |\n| a-long-value | a-long-value | a-long-value | a-long-value | a-long-value | a-long-value |",
    },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 320 }}>
                <Story />
            </div>
        ),
    ],
};
