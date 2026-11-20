// External micro-store (factory, NOT a global singleton → no cross-request leak during SSR).
// Components access it via useSyncExternalStore (hooks/use-store.ts):
// no synchronous state update in a useEffect (see docs/react-effects.md).
import { COOKIE_CONSENT, COOKIE_THEME, getCookie } from "./cookies";
import { LS_THEME_MODE, LS_USAGE, readLS } from "./storage";
import { normalizeUsage, todayISO, type UsageState } from "./usage";
export type ThemeMode = "light" | "dark" | "system";
export interface Consent {
    necessary: true;
    analytics: boolean;
    ads: boolean;
    // Third-party comments (Disqus) load without asking under every entry that has them.
    comments: boolean;
}
export interface ToastItem {
    id: string;
    severity: "success" | "info" | "warning" | "error";
    message: string;
    duration?: number;
}
export interface AppState {
    themeMode: ThemeMode;
    consent: Consent | null;
    // In-memory: the visitor re-opened the consent banner ("Manage cookies"). Never persisted.
    consentPromptOpen: boolean;
    usage: UsageState;
    aiPending: boolean;
    // Date.now() when the current AI call started (null when idle). Set by setAiPending in the
    // event handler, read by useElapsedSeconds to show the wait time without any effect state.
    aiPendingSince: number | null;
    toasts: ToastItem[];
    // PURELY IN-MEMORY state (never persisted): survives SPA navigation (the provider
    // stays mounted) but resets to false on a full reload (new
    // document → new store via the factory). That is exactly the "kept during
    // navigation, back to normal after a reload" behavior wanted for the pinned video.
    // getServerState() returns SERVER_DEFAULT (false) => SSR and hydration both render
    // "not closed" identically => no hydration mismatch.
    videoDismissed: boolean;
}
const SERVER_DEFAULT: AppState = {
    themeMode: "system",
    consent: null,
    consentPromptOpen: false,
    usage: { date: todayISO(), count: 0 },
    aiPending: false,
    aiPendingSince: null,
    toasts: [],
    videoDismissed: false,
};
// SYNCHRONOUS read of the persisted data when the store is created (external system read
// during render, not an effect, no setState) → no cascade, no mismatch.
function hydrateClient(base: AppState): AppState {
    if (typeof window === "undefined") return base;
    const usage = normalizeUsage(readLS<UsageState>(LS_USAGE, { date: "", count: 0 }));
    const themeRaw = readLS<ThemeMode | null>(LS_THEME_MODE, null) ?? (getCookie(COOKIE_THEME) as ThemeMode | null);
    const themeMode: ThemeMode =
        themeRaw === "light" || themeRaw === "dark" || themeRaw === "system" ? themeRaw : "system";
    let consent: Consent | null = null;
    try {
        const c = getCookie(COOKIE_CONSENT);
        if (c) {
            const parsed = JSON.parse(c) as Partial<Consent>;
            consent = {
                necessary: true,
                analytics: !!parsed.analytics,
                ads: !!parsed.ads,
                comments: !!parsed.comments,
            };
        }
    } catch {
        consent = null;
    }
    // videoDismissed is NOT hydrated: it stays at its base value (false), because it must
    // reset on every document load (see the comment in AppState).
    return { ...base, usage, themeMode, consent };
}
export interface Store {
    getState(): AppState;
    getServerState(): AppState;
    subscribe(cb: () => void): () => void;
    setThemeMode(m: ThemeMode): void;
    setConsent(c: Consent | null): void;
    reopenConsent(): void;
    incrementUsage(): void;
    resetUsage(): void;
    setAiPending(v: boolean): void;
    pushToast(t: Omit<ToastItem, "id">): string;
    dismissToast(id: string): void;
    // Closes the pinned video for good for the current browsing session:
    // the player goes back to its place (flow) and is never re-pinned on scroll. Reset on reload.
    dismissVideo(): void;
}
export function createStore(init: Partial<AppState>): Store {
    let state: AppState = hydrateClient({ ...SERVER_DEFAULT, ...init });
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((l) => l());
    const set = (patch: Partial<AppState>) => {
        state = { ...state, ...patch };
        emit();
    };
    return {
        getState: () => state,
        getServerState: () => SERVER_DEFAULT,
        subscribe: (cb) => {
            listeners.add(cb);
            return () => {
                listeners.delete(cb);
            };
        },
        setThemeMode: (m) => set({ themeMode: m }),
        setConsent: (c) => set({ consent: c, consentPromptOpen: false }),
        reopenConsent: () => set({ consentPromptOpen: true }),
        incrementUsage: () => {
            const u = normalizeUsage(state.usage);
            const next = { date: u.date, count: u.count + 1 };
            if (typeof window !== "undefined") {
                try {
                    window.localStorage.setItem(LS_USAGE, JSON.stringify(next));
                } catch {
                    /* quota */
                }
            }
            set({ usage: next });
        },
        resetUsage: () => {
            const next = { date: todayISO(), count: 0 };
            if (typeof window !== "undefined") {
                try {
                    window.localStorage.setItem(LS_USAGE, JSON.stringify(next));
                } catch {
                    /* quota */
                }
            }
            set({ usage: next });
        },
        setAiPending: (v) => set({ aiPending: v, aiPendingSince: v ? Date.now() : null }),
        pushToast: (t) => {
            const id = Math.random().toString(36).slice(2);
            set({ toasts: [...state.toasts, { ...t, id }] });
            return id;
        },
        dismissToast: (id) => set({ toasts: state.toasts.filter((x) => x.id !== id) }),
        dismissVideo: () => set({ videoDismissed: true }),
    };
}
