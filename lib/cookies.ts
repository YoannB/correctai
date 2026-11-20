// NON-httpOnly cookie persistence (readable/writable client-side; the server never reads
// these cookies → pages stay static, see docs/react-effects.md).
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function setCookie(name: string, value: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};samesite=Lax`;
}
export function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"),
    );
    return m ? decodeURIComponent(m[1]) : null;
}
export const COOKIE_THEME = "theme";
export const COOKIE_CONSENT = "consent";
