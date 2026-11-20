"use client";
import { COOKIE_THEME, setCookie } from "@/lib/cookies";
import { LS_THEME_MODE, writeLS } from "@/lib/storage";
import type { ThemeMode } from "@/lib/store";
import { useEffect } from "react";
import { useHydrated } from "./use-hydrated";
import { useMediaQuery } from "./use-media-query";
import { useStore, useThemeMode } from "./use-store";

export function useTheme() {
    const store = useStore();
    const mode = useThemeMode(); // read from the store (already hydrated synchronously)
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const hydrated = useHydrated();

    // "system" resolution = value derived DURING render (no state, no effect).
    const effective: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

    // DOM synchronization (external system): mutation only, NO setState → legitimate effect.
    // NEVER from server snapshots: during the hydration render `mode` is the store's server
    // default ("system") and `prefersDark` is false, so `effective` would be "light" whatever the
    // visitor chose or the OS says. The boot script (lib/boot-script.ts) already painted the right
    // value; React writes only once it reads the client snapshots, which resolve to that same value.
    useEffect(() => {
        if (!hydrated) return;
        document.documentElement.dataset.theme = effective;
    }, [hydrated, effective]);

    // Persisted write: user intent → handler (legitimate), double storage on purpose.
    const setMode = (m: ThemeMode) => {
        store.setThemeMode(m); // updates the store (derived re-render)
        setCookie(COOKIE_THEME, m); // read by the anti-flash inline script in <head>
        writeLS(LS_THEME_MODE, m); // read by hydrateClient() on the next load
    };
    const toggle = () => setMode(effective === "dark" ? "light" : "dark");

    return { mode, effective, setMode, toggle };
}
