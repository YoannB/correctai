// @vitest-environment node
import { LS_THEME_MODE, LS_USAGE, readLS, writeLS } from "@/lib/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type LocalStorageStub = {
    store: Map<string, string>;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

type WindowStub = {
    localStorage: LocalStorageStub;
};

function createLocalStorageStub(
    behaviour: Partial<Pick<LocalStorageStub, "getItem" | "setItem">> = {},
): LocalStorageStub {
    const store = new Map<string, string>();

    return {
        store,
        getItem(key) {
            if (behaviour.getItem) {
                return behaviour.getItem(key);
            }

            return store.get(key) ?? null;
        },
        setItem(key, value) {
            if (behaviour.setItem) {
                behaviour.setItem(key, value);
                return;
            }

            store.set(key, String(value));
        },
    };
}

const globalRef = globalThis as typeof globalThis & {
    window?: WindowStub;
};

let originalWindow: WindowStub | undefined;

function setWindow(value: WindowStub | undefined) {
    Object.defineProperty(globalThis, "window", {
        value,
        configurable: true,
        writable: true,
    });
}

beforeEach(() => {
    originalWindow = globalRef.window;
    setWindow(undefined);
});

afterEach(() => {
    setWindow(originalWindow);
});

describe("storage — constants", () => {
    it("exposes the centrally declared localStorage keys", () => {
        expect(LS_USAGE).toBe("usage");
        expect(LS_THEME_MODE).toBe("theme-mode");
    });
});

describe("readLS — SSR branch (typeof window === undefined)", () => {
    it("returns the fallback immediately", () => {
        expect(readLS("any", "fallback")).toBe("fallback");
    });
});

describe("readLS — client branch", () => {
    it("returns the fallback when the key is missing", () => {
        const storage = createLocalStorageStub();
        setWindow({ localStorage: storage });

        expect(readLS("missing", "fallback")).toBe("fallback");
    });

    it("returns the fallback when the stored value is an empty string", () => {
        const storage = createLocalStorageStub();
        storage.store.set("empty", "");
        setWindow({ localStorage: storage });

        expect(readLS("empty", "fallback")).toBe("fallback");
    });

    it("parses a valid JSON value", () => {
        const storage = createLocalStorageStub();
        storage.store.set("usage", JSON.stringify({ date: "2026-10-20", count: 2 }));
        setWindow({ localStorage: storage });

        expect(readLS<{ date: string; count: number } | null>("usage", null)).toEqual({
            date: "2026-10-20",
            count: 2,
        });
    });

    it("returns the fallback when JSON.parse throws", () => {
        const storage = createLocalStorageStub();
        storage.store.set("broken", "{");
        setWindow({ localStorage: storage });

        expect(readLS("broken", "fallback")).toBe("fallback");
    });

    it("allows a null fallback", () => {
        const storage = createLocalStorageStub();
        setWindow({ localStorage: storage });

        expect(readLS<string | null>("missing", null)).toBeNull();
    });
});

describe("writeLS — SSR branch", () => {
    it("does not throw and writes nowhere", () => {
        expect(() => writeLS("any", { a: 1 })).not.toThrow();
    });
});

describe("writeLS — client branch", () => {
    it("serializes the value to JSON", () => {
        const storage = createLocalStorageStub();
        setWindow({ localStorage: storage });

        writeLS("theme", { mode: "dark" });

        expect(storage.store.get("theme")).toBe('{"mode":"dark"}');
    });

    it("stores a string as a JSON value", () => {
        const storage = createLocalStorageStub();
        setWindow({ localStorage: storage });

        writeLS("raw", "v");

        expect(storage.store.get("raw")).toBe('"v"');
    });

    it("silently swallows a setItem error", () => {
        const storage = createLocalStorageStub({
            setItem: () => {
                throw new Error("QuotaExceededError");
            },
        });
        setWindow({ localStorage: storage });

        expect(() => writeLS("any", 1)).not.toThrow();
    });
});
