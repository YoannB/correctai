// Neutral Button: the `external` (new tab) and `busy` (focusable long action) modes, plus the
// unchanged defaults. Rendered in jsdom with a real React root (clicks, focus, form submit).
import { Button } from "@/components/ui/Button";
import messages from "@/messages/en.json";
import { NextIntlClientProvider } from "next-intl";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// next-intl navigation is not resolvable under Vitest: the internal-link component becomes a
// plain <a> that keeps every forwarded prop (target/rel included).
vi.mock("@/i18n/routing", async () => {
    const { forwardRef } = await import("react");
    return {
        Link: forwardRef<HTMLAnchorElement, Record<string, unknown>>(function Link({ href, ...rest }, ref) {
            return <a ref={ref} href={String(href)} data-intl-link="" {...rest} />;
        }),
    };
});

let root: Root | null = null;
let container: HTMLDivElement;

function render(ui: ReactNode, withIntl = false) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
        root!.render(
            withIntl ? (
                <NextIntlClientProvider locale="en" messages={messages}>
                    {ui}
                </NextIntlClientProvider>
            ) : (
                ui
            ),
        ),
    );
    return container.firstElementChild as HTMLElement;
}

afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
});

const spinner = (el: Element) => el.querySelector(".MuiCircularProgress-root");

describe("Button — defaults (unchanged)", () => {
    it("is a plain <button> that calls onClick, with no busy state", () => {
        const onClick = vi.fn();
        const el = render(<Button onClick={onClick}>Go</Button>);
        expect(el.tagName).toBe("BUTTON");
        expect(el.getAttribute("type")).toBe("button");
        expect(el.hasAttribute("aria-busy")).toBe(false);
        expect(el.hasAttribute("aria-disabled")).toBe(false);
        expect(el.className).not.toContain("Mui-disabled");
        act(() => el.click());
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("loading stays a natively disabled button with the spinner", () => {
        const el = render(<Button loading>Go</Button>);
        expect(el).toHaveProperty("disabled", true);
        expect(spinner(el)).not.toBeNull();
        expect(el.hasAttribute("aria-busy")).toBe(false);
    });

    it("a link without `external` opens in the same tab", () => {
        const el = render(<Button href="https://example.com">Out</Button>);
        expect(el.tagName).toBe("A");
        expect(el.hasAttribute("target")).toBe(false);
        expect(el.hasAttribute("rel")).toBe(false);
    });
});

describe("Button — busy", () => {
    it("keeps the focus, exposes aria-disabled + aria-busy, shows loading's spinner and look", () => {
        const el = render(
            <Button busy className="mine">
                Saving
            </Button>,
        );
        expect(el).toHaveProperty("disabled", false);
        expect(el.getAttribute("aria-disabled")).toBe("true");
        expect(el.getAttribute("aria-busy")).toBe("true");
        expect(el.className).toContain("Mui-disabled");
        expect(el.className).toContain("mine");
        expect(spinner(el)).not.toBeNull();
        act(() => el.focus());
        expect(document.activeElement).toBe(el);
    });

    it("applies to the outlined/text variants too (same disabled look as loading)", () => {
        const el = render(
            <Button busy variant="secondary">
                Saving
            </Button>,
        );
        expect(el.className).toContain("MuiButton-outlined");
        expect(el.className).toContain("Mui-disabled");
        expect(el).toHaveProperty("disabled", false);
    });

    it("ignores clicks: onClick is not called and a submit does not submit", () => {
        const onClick = vi.fn();
        const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
        const form = render(
            <form>
                <Button busy type="submit" onClick={onClick}>
                    Send
                </Button>
            </form>,
        );
        form.addEventListener("submit", onSubmit);
        act(() => (form.querySelector("button") as HTMLButtonElement).click());
        expect(onClick).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it.each([
        ["loading", { loading: true }],
        ["disabled", { disabled: true }],
    ])("yields to %s (native disabled, no aria-busy)", (_, extra) => {
        const el = render(
            <Button busy {...extra}>
                Go
            </Button>,
        );
        expect(el).toHaveProperty("disabled", true);
        expect(el.hasAttribute("aria-busy")).toBe(false);
    });
});

describe("Button — external", () => {
    it("opens an external URL in a new tab with a hidden, localized hint", () => {
        const el = render(
            <Button href="https://example.com" external>
                Source
            </Button>,
            true,
        );
        expect(el.tagName).toBe("A");
        expect(el.getAttribute("target")).toBe("_blank");
        expect(el.getAttribute("rel")).toBe("noopener noreferrer");
        expect(el.textContent).toBe("Source (new tab)");
        expect(el.hasAttribute("aria-label")).toBe(false);
    });

    it("works for an internal pathname too (next-intl Link) and extends an explicit aria-label", () => {
        const el = render(
            <Button href="/sitemap" external ariaLabel="Map">
                M
            </Button>,
            true,
        );
        expect(el.hasAttribute("data-intl-link")).toBe(true);
        expect(el.getAttribute("target")).toBe("_blank");
        expect(el.getAttribute("aria-label")).toBe("Map (new tab)");
    });

    it("an inactive external link is a disabled button without target nor hint (no intl needed)", () => {
        for (const extra of [{ disabled: true }, { loading: true }]) {
            const el = render(
                <Button href="https://example.com" external {...extra}>
                    Source
                </Button>,
            );
            expect(el.tagName).toBe("BUTTON");
            expect(el.hasAttribute("target")).toBe(false);
            expect(el.textContent).toBe("Source");
            act(() => root?.unmount());
            root = null;
            container.remove();
            container = document.createElement("div");
        }
    });

    it("is a type error without href, and busy is a type error on a link", () => {
        // @ts-expect-error -- `external` requires `href`
        const noHref = <Button external>x</Button>;
        const busyLink = (
            // @ts-expect-error -- `busy` belongs to the action button, not to a link
            <Button href="/" busy>
                x
            </Button>
        );
        expect([noHref, busyLink]).toHaveLength(2);
    });
});
