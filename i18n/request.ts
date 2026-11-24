import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { interpolateLegal, parseAddressKind } from "../lib/legal-messages";
import { routing } from "./routing";

function envValue(key: string): string {
    return process.env[key]?.trim() ?? "";
}

function formatDeclaredDate(locale: string): string {
    const raw = envValue("LEGAL_ACTIVITY_DECLARED_DATE");

    if (!raw) {
        return "";
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
        return raw;
    }

    try {
        return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
    } catch {
        return raw;
    }
}

// Raw values: lib/legal-messages.ts escapes them where they are string-substituted.
function legalVariables(locale: string): Record<string, string> {
    const editorName = envValue("LEGAL_EDITOR_NAME");

    return {
        editorName,
        tradeName: envValue("LEGAL_EDITOR_TRADE_NAME"),
        siren: envValue("LEGAL_EDITOR_SIREN"),
        apeCode: envValue("LEGAL_EDITOR_APE_CODE"),
        address: envValue("LEGAL_EDITOR_ADDRESS"),
        addressKind: parseAddressKind(envValue("LEGAL_EDITOR_ADDRESS_KIND")),
        publicationDirector: envValue("LEGAL_PUBLICATION_DIRECTOR") || editorName,
        contactEmail: envValue("LEGAL_CONTACT_EMAIL"),
        declaredDate: formatDeclaredDate(locale),
    };
}

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;

    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

    const rawMessages = (await import(`../messages/${locale}.json`)).default;

    const messages = interpolateLegal(rawMessages, legalVariables(locale), locale) as typeof rawMessages;

    return {
        locale,
        messages,
        timeZone: "Europe/Paris",
    };
});
