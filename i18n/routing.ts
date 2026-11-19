import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { LOCALES, resolveDefaultLocale } from "./locales";
import { PATHNAMES } from "./pathnames";

export const routing = defineRouting({
    locales: LOCALES,
    defaultLocale: resolveDefaultLocale(process.env.NEXT_PUBLIC_DEFAULT_LOCALE),
    localePrefix: "as-needed", // /privacy (EN); /fr/confidentialite (FR) — no /en
    pathnames: PATHNAMES,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
