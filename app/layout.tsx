import { AppSplash } from "@/components/ui/AppSplash";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL, SPLASH } from "@/constants/site";
import { LOCALES } from "@/i18n/locales";
import { buildBootScript } from "@/lib/boot-script";
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
        default: DEFAULT_TITLE,
        template: `%s · ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    openGraph: { siteName: SITE_NAME, type: "website", url: SITE_URL },
};

// Anti-flash boot: sets data-theme + has-consent + lang BEFORE hydration (lib/boot-script.ts).
// The root does not receive params.locale: every SERVED locale is recognized from the pathname
// (the list is serialized from i18n/locales.ts at build time).
const bootScript = buildBootScript(LOCALES);

export default async function RootLayout({ children }: { children: ReactNode }) {
    // getLocale() reads the locale resolved from the request context (set by middleware.ts / next-intl),
    // including at static build time. Fallback: 'en' (the routing defaultLocale).
    const locale = (await getLocale()) ?? "en";

    return (
        <html lang={locale} data-theme="dark" suppressHydrationWarning>
            <head>
                <Script
                    id="boot-script"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: bootScript }}
                />
            </head>
            <body>
                {/* Pre-hydration splash: server node, hidden (never removed) by SplashLoader,
            which lives under the providers in app/[locale]/layout.tsx (same document).
            Its content (logo, bar): SPLASH in constants/site.ts. */}
                <AppSplash {...SPLASH} />
                {children}
            </body>
        </html>
    );
}
