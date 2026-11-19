import stylus from "highlight.js/lib/languages/stylus";
import { common } from "lowlight";
import Markdown, { type Components } from "react-markdown";
import rehypeHighlight, { type Options as HighlightOptions } from "rehype-highlight";
import remarkGfm from "remark-gfm";

// Markdown rendered as React ELEMENTS (no dangerouslySetInnerHTML; raw HTML in the source is
// NOT interpreted). GitHub-flavored: tables, task lists, strikethrough, autolinks; highlighted code.
// The article title is the page <h1>: a "# Heading" in the body is demoted to <h2>.
// Fenced code blocks are highlighted AT RENDER (Server Component, static page): highlight.js
// grammars via lowlight emit `hljs-*` classes, coloured by tokens in styles/articles.css; no
// client JS is added. Languages = lowlight's `common` set (js/ts, bash/sh, html/xml, css, scss,
// json, yaml, markdown, …) + stylus. An unknown or missing language stays plain text (no
// auto-detection, no error: rehype-highlight only records a vfile message).
const HIGHLIGHT_OPTIONS: HighlightOptions = { languages: { ...common, stylus }, detect: false };

const components: Components = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `node` (hast) must not reach the DOM
    h1: ({ node, ...props }) => <h2 {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    a: ({ node, href, ...props }) =>
        href && /^https?:\/\//.test(href) ? (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
        ) : (
            <a href={href} {...props} />
        ),
    // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars -- Markdown images: unknown intrinsic size
    img: ({ node, alt, ...props }) => <img alt={alt ?? ""} loading="lazy" {...props} />,
};

export function ArticleBody({ markdown }: { markdown: string }) {
    return (
        <div className="article-body prose">
            <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeHighlight, HIGHLIGHT_OPTIONS]]}
                components={components}
            >
                {markdown}
            </Markdown>
        </div>
    );
}
