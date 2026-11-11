import { SITE_NAME, SITE_URL } from "@/constants/site";
import { LOCALES } from "@/i18n/locales";
import { getLocale } from "next-intl/server";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

// REAL root layout: this is the only place where next/script can hoist a
// strategy="beforeInteractive" script into the HTML shell, outside the hydratable React tree.
// The <html> used to live in app/[locale]/layout.tsx (a segment layout): Next did not
// hoist the script, it stayed in the tree -> "Encountered a script tag while rendering
// React component" warning. The localized lang is kept via getLocale().
export const metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${SITE_NAME} – AI spelling & grammar checker`,
        template: `%s · ${SITE_NAME}`,
    },
    description: "Fix spelling, grammar and punctuation with AI without changing your style.",
    openGraph: { siteName: SITE_NAME, type: "website", url: SITE_URL },
};

// Anti-flash boot: sets data-theme + has-consent BEFORE hydration.
// Also reads the locale from the pathname to set lang (the root does not receive params.locale):
// every SERVED locale is recognized (the list is serialized from i18n/locales.ts at build time).
const bootScript = `(function(){try{var d=document.documentElement;var m=localStorage.getItem('axons-theme-mode')||(/axons-theme=([^;]+)/.exec(document.cookie)||[])[1];var sys=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=(m==='light'||m==='dark')?m:sys;if(/axons-consent=/.test(document.cookie))d.classList.add('has-consent');var seg=location.pathname.split('/')[1];if(${JSON.stringify(LOCALES)}.indexOf(seg)>-1)d.setAttribute('lang',seg);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
    // getLocale() reads the locale resolved from the request context (set by middleware.ts / next-intl),
    // including at static build time. Fallback: 'en' (the routing defaultLocale).
    const locale = (await getLocale()) ?? "en";

    return (
        <html lang={locale} data-theme="dark" suppressHydrationWarning>
            <head>
                <Script id="axons-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: bootScript }} />
            </head>
            <body>
                {/* Pre-hydration splash: server node, hidden (never removed) by SplashLoader,
            which lives under the providers in app/[locale]/layout.tsx (same document). */}
                <div id="app-splash" aria-hidden="true">
                    <span className="loader__bar" />
                </div>
                {children}
            </body>
        </html>
    );
}
