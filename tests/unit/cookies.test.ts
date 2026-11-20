// @vitest-environment node
import { COOKIE_CONSENT, COOKIE_THEME, getCookie, setCookie } from "@/lib/cookies";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type DocumentStub = {
    jar: Map<string, string>;
    cookie: string;
};

function createDocumentStub(initial: Record<string, string> = {}): DocumentStub {
    const jar = new Map(Object.entries(initial));

    return {
        jar,
        get cookie() {
            return Array.from(jar.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join("; ");
        },
        set cookie(input: string) {
            const [pair] = input.split(";");
            const eq = pair.indexOf("=");

            if (eq === -1) {
                return;
            }

            const name = pair.slice(0, eq);
            const value = pair.slice(eq + 1);

            if (/(?:^|;)\s*max-age=0(?:;|$)/.test(input)) {
                jar.delete(name);
            } else {
                jar.set(name, value);
            }
        },
    };
}

const globalRef = globalThis as typeof globalThis & {
    document?: DocumentStub;
};

let originalDocument: DocumentStub | undefined;

function setDocument(value: DocumentStub | undefined) {
    Object.defineProperty(globalThis, "document", {
        value,
        configurable: true,
        writable: true,
    });
}

beforeEach(() => {
    originalDocument = globalRef.document;
    setDocument(undefined);
});

afterEach(() => {
    setDocument(originalDocument);
});

describe("cookies — constants", () => {
    it("exposes the non-httpOnly cookie names", () => {
        expect(COOKIE_THEME).toBe("theme");
        expect(COOKIE_CONSENT).toBe("consent");
    });
});

describe("setCookie — SSR branch (typeof document === undefined)", () => {
    it("does not throw and writes nowhere", () => {
        expect(() => setCookie("any", "value")).not.toThrow();
    });
});

describe("getCookie — SSR branch (typeof document === undefined)", () => {
    it("returns null", () => {
        expect(getCookie("any")).toBeNull();
    });
});

describe("setCookie/getCookie — client branch", () => {
    beforeEach(() => {
        setDocument(createDocumentStub());
    });

    it("writes then reads a simple value", () => {
        setCookie(COOKIE_THEME, "dark");

        expect(getCookie(COOKIE_THEME)).toBe("dark");
        expect(globalRef.document?.jar.get(COOKIE_THEME)).toBe("dark");
    });

    it("encodes then decodes reserved characters", () => {
        const value = "a b;c=d?e";

        setCookie("query", value);

        expect(globalRef.document?.jar.get("query")).toBe(encodeURIComponent(value));
        expect(getCookie("query")).toBe(value);
    });

    it("returns null when the cookie is missing", () => {
        expect(getCookie("missing")).toBeNull();
    });

    it("returns an empty string for a cookie with an empty value", () => {
        setCookie("empty", "");

        expect(getCookie("empty")).toBe("");
    });

    it("overwrites the same key", () => {
        setCookie("theme", "light");
        setCookie("theme", "dark");

        expect(getCookie("theme")).toBe("dark");
        expect(globalRef.document?.jar.size).toBe(1);
    });

    it("reads several distinct cookies", () => {
        setCookie("theme", "dark");
        setCookie("consent", "accepted");

        expect(getCookie("theme")).toBe("dark");
        expect(getCookie("consent")).toBe("accepted");
    });

    it("reads a cookie name containing a dot", () => {
        setCookie("a.b", "1");

        expect(getCookie("a.b")).toBe("1");
    });
});
