import { ArticleBody } from "@/components/content/ArticleBody";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const html = (markdown: string) => renderToStaticMarkup(<ArticleBody markdown={markdown} />);
const block = (lang: string, code: string) => "```" + lang + "\n" + code + "\n```";

describe("ArticleBody — code highlighting (server render, no client JS)", () => {
    it("highlights a JavaScript block with hljs token classes", () => {
        const out = html(block("js", "const answer = 42; // done"));
        expect(out).toContain('<code class="hljs language-js">');
        expect(out).toContain('<span class="hljs-keyword">const</span>');
        expect(out).toContain('<span class="hljs-number">42</span>');
        expect(out).toContain('<span class="hljs-comment">// done</span>');
    });

    it.each([
        ["bash", 'echo "hi"', "hljs-built_in"],
        ["sh", 'echo "hi"', "hljs-string"],
        ["html", '<a href="/x">x</a>', "hljs-tag"],
        ["css", ".a { color: red; }", "hljs-selector-class"],
        ["json", '{ "a": 1 }', "hljs-attr"],
        ["ts", "type A = string;", "hljs-keyword"],
        ["stylus", ".a\n  color red", "hljs-selector-class"],
    ])("highlights %s", (lang, code, token) => {
        expect(html(block(lang, code))).toContain(`class="${token}"`);
    });

    it("leaves an unknown language as plain text, without throwing", () => {
        const out = html(block("klingon", "qapla' <b>"));
        expect(out).toContain('<code class="hljs language-klingon">');
        expect(out).not.toContain("<span");
        expect(out).toContain("qapla&#x27; &lt;b&gt;");
    });

    it("does not auto-detect a block without language", () => {
        const out = html(block("", "const a = 1;"));
        expect(out).toContain("<code>const a = 1;\n</code>");
        expect(out).not.toContain("hljs");
    });

    it("leaves inline code untouched", () => {
        expect(html("Use `const a = 1` here.")).toContain("<code>const a = 1</code>");
    });
});
