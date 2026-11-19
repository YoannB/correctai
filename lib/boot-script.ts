// The anti-flash boot script injected by app/layout.tsx (next/script beforeInteractive): it sets
// data-theme + has-consent + lang BEFORE hydration (see docs/architecture.md → Boot-script placement).
//
// It resolves the theme mode EXACTLY like lib/store.ts hydrateClient does, so the value painted
// before hydration is the value React lands on after it (docs/react-effects.md → Theme persistence):
// localStorage FIRST, JSON-decoded (writeLS stores `"dark"`, quotes included), then the theme
// cookie (URI-encoded by setCookie); "light"/"dark" win, anything else follows the system.
// Keys come from lib/storage.ts and lib/cookies.ts: one declaration, no literal copy here.
import { COOKIE_CONSENT, COOKIE_THEME } from "./cookies";
import { LS_THEME_MODE } from "./storage";

export function buildBootScript(locales: readonly string[]): string {
    const ls = JSON.stringify(LS_THEME_MODE);
    const themeCookie = new RegExp(`(?:^|; )${COOKIE_THEME}=([^;]*)`).source;
    const consentCookie = new RegExp(`(?:^|; )${COOKIE_CONSENT}=`).source;
    return (
        "(function(){try{var d=document.documentElement;" +
        `var m=null;try{m=JSON.parse(localStorage.getItem(${ls}))}catch(e){}` +
        `if(m==null){var c=/${themeCookie}/.exec(document.cookie);if(c)m=decodeURIComponent(c[1]);}` +
        "var sys=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
        "d.dataset.theme=(m==='light'||m==='dark')?m:sys;" +
        `if(/${consentCookie}/.test(document.cookie))d.classList.add('has-consent');` +
        "var seg=location.pathname.split('/')[1];" +
        `if(${JSON.stringify(locales)}.indexOf(seg)>-1)d.setAttribute('lang',seg);` +
        "}catch(e){}})();"
    );
}
