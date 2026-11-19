// Defensive localStorage access (SSR / private mode).
export function readLS<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const v = window.localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : fallback;
    } catch {
        return fallback;
    }
}
export function writeLS(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* quota / private mode */
    }
}
// Every localStorage key of the app, declared here ONLY (docs/react-effects.md → Theme persistence).
// Code reads them from here, never from a string literal; two features never share a key.
export const LS_USAGE = "usage";
export const LS_THEME_MODE = "theme-mode";
