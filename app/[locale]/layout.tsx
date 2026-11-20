import { CookieBanner } from "@/components/layout/CookieBanner";
import { Footer } from "@/components/layout/Footer";
import { GtmScript } from "@/components/layout/GtmScript";
import { Header } from "@/components/layout/Header";
import { SplashLoader } from "@/components/ui";
import { CLIENT_MESSAGES } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";
import { pickMessages, type Messages } from "@/lib/client-messages";
import { AppProviders } from "@/providers/AppProviders";
import { hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// Segment layout: validates the locale, loads messages, sets up the providers and the chrome.
// <html>/<body> and the beforeInteractive script live in app/layout.tsx (root).
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    // Client Components only get the namespaces they read (i18n/client-messages.ts); Server
    // Components keep the full catalogue through getTranslations.
    const messages = pickMessages((await getMessages({ locale })) as Messages, CLIENT_MESSAGES);

    return (
        <AppProviders locale={locale} messages={messages} initialThemeMode="system" initialConsent={null}>
            <Header />
            <main>{children}</main>
            <Footer />
            <CookieBanner />
            <GtmScript />
            {/* SplashLoader hides #app-splash (rendered by the root) via .is-leaving: non-destructive
          CSS mutation, never el.remove() (which would corrupt hydration). */}
            <SplashLoader />
        </AppProviders>
    );
}
