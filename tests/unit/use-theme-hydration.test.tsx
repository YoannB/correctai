import { useTheme } from "@/hooks/use-theme";
import { LS_THEME_MODE } from "@/lib/storage";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Server-renders, then HYDRATES (the real first-visit path): every value React writes to
// <html data-theme> is recorded. The boot script's value is simulated by presetting data-theme.

function Probe() {
    const { effective } = useTheme();
    return <span>{effective}</span>;
}
const tree = (
    <AppStateProvider initialThemeMode="system" initialConsent={null}>
        <Probe />
    </AppStateProvider>
);

let root: Root | null = null;
let container: HTMLDivElement;

function stubSystem(system: "light" | "dark") {
    vi.stubGlobal("matchMedia", (q: string) => ({
        matches: q === "(prefers-color-scheme: dark)" && system === "dark",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    }));
}

async function hydrateAndRecord(bootValue: "light" | "dark"): Promise<string[]> {
    const html = document.documentElement;
    html.dataset.theme = bootValue;
    // renderToString runs with `window` defined (jsdom) but React uses the SERVER snapshots.
    container.innerHTML = renderToString(tree);
    const writes: string[] = [];
    const observer = new MutationObserver((records) => {
        // Writes batched into one callback: each value is the NEXT record's oldValue, the last
        // one the live attribute (reading only the live value would hide a corrected flash).
        records.forEach((r, i) => writes.push((records[i + 1]?.oldValue ?? html.dataset.theme) || ""));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"], attributeOldValue: true });
    await act(async () => {
        root = hydrateRoot(container, tree);
    });
    await act(async () => undefined);
    observer.disconnect();
    return writes;
}

beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
});
afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    vi.unstubAllGlobals();
});

describe("useTheme — hydration never writes a server-snapshot theme", () => {
    it("system dark: no light write during hydration", async () => {
        stubSystem("dark");
        const writes = await hydrateAndRecord("dark");
        expect(writes).not.toContain("light");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("explicit dark over a light system: no light write", async () => {
        stubSystem("light");
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("dark"));
        const writes = await hydrateAndRecord("dark");
        expect(writes).not.toContain("light");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("explicit light over a dark system: no dark write", async () => {
        stubSystem("dark");
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("light"));
        const writes = await hydrateAndRecord("light");
        expect(writes).not.toContain("dark");
        expect(document.documentElement.dataset.theme).toBe("light");
    });
});
