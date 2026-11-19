"use client";
import { LanguageSwitcher, LimitBadge, Logo, ThemeToggle } from "@/components/ui";
import {
    BRAND_ACCENT_FROM,
    GITHUB_LINK_ENABLED,
    GITHUB_URL,
    HEADER_NAV,
    HEADER_NAV_ENABLED,
    SITE_NAME,
} from "@/constants/site";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useState } from "react";

// DOM order: burger (1st, on the left on mobile, display:none on desktop), brand, nav,
// tools. The tools are pushed to the right by margin-left:auto (CSS), without an auto margin on
// the brand, which would override the nav's flex:1 on desktop.
// Optional chrome (constants/site.ts): HEADER_NAV_ENABLED (nav + burger), GITHUB_LINK_ENABLED,
// BRAND_ACCENT_FROM; HEADER_NAV drops site entries declared `header: false`; and a brand tagline shown when messages define `nav.tagline` (+ `nav.taglineSub`).
export function Header() {
    const t = useTranslations("nav");
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    const tagline = t.has("tagline") ? t("tagline") : null;
    const taglineSub = t.has("taglineSub") ? t("taglineSub") : null;

    return (
        <header className={cn("site-header", !HEADER_NAV_ENABLED && "site-header--no-nav")}>
            <div className="site-header__inner container">
                {HEADER_NAV_ENABLED ? (
                    <button
                        type="button"
                        className={cn("menu-toggle", open && "is-open")}
                        aria-label={t("menu")}
                        aria-expanded={open}
                        aria-controls="site-nav"
                        onClick={() => setOpen((o) => !o)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                ) : null}

                <Link href="/" className="brand" aria-label={SITE_NAME} onClick={close}>
                    <Logo size={30} />
                    <span>
                        {SITE_NAME.slice(0, BRAND_ACCENT_FROM)}
                        <b>{SITE_NAME.slice(BRAND_ACCENT_FROM)}</b>
                    </span>
                </Link>

                {tagline ? (
                    <p className="brand-tagline">
                        <span className="brand-tagline__main">{tagline}</span>
                        {taglineSub ? <span className="brand-tagline__sub">{taglineSub}</span> : null}
                    </p>
                ) : null}

                {HEADER_NAV_ENABLED ? (
                    <nav id="site-nav" className={cn("site-nav", open && "is-open")} aria-label="Main">
                        {HEADER_NAV.map((n) => (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={cn(
                                    "site-nav__link",
                                    (pathname === n.href || pathname.startsWith(`${n.href}/`)) && "is-active",
                                )}
                                onClick={close}
                            >
                                {t(n.key.split(".")[1])}
                            </Link>
                        ))}
                    </nav>
                ) : null}

                <div className="site-header__tools">
                    <LimitBadge className="limit-badge--header" />
                    {GITHUB_LINK_ENABLED ? (
                        <a className="gh-link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                            GitHub
                        </a>
                    ) : null}
                    <LanguageSwitcher />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
