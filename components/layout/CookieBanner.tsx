"use client";
import { Button } from "@/components/ui";
import { ADS_ENABLED, COMMENTS_ENABLED, CONSENT_REQUIRED, GTM_ID } from "@/constants/site";
import { useCookieConsent } from "@/hooks/use-consent";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

// Rendering depends on consent (client snapshot). The inline <head> script
// already sets .has-consent on <html> for returning visitors → no flash/CLS.
// No tracker needing consent configured (no GTM id, ads off, no comments) => no banner at all.
// The purposes listed are exactly the configured ones (build-inlined constants: same list on the
// server and the client, no hydration mismatch).
const PURPOSES = [
    ...(GTM_ID !== "" ? (["analytics"] as const) : []),
    ...(ADS_ENABLED ? (["ads"] as const) : []),
    ...(COMMENTS_ENABLED ? (["comments"] as const) : []),
];

export function CookieBanner() {
    const { bannerOpen, acceptAll, refuseAll } = useCookieConsent();
    const t = useTranslations("cookie");
    if (!CONSENT_REQUIRED || !bannerOpen) return null;
    return (
        <aside className="cookie-banner" data-cookie-banner role="dialog" aria-label={t("message")}>
            <div className="cookie-banner__ico">🍪</div>
            <div className="cookie-banner__body">
                <p>{t("message")}</p>
                <ul className="cookie-banner__purposes">
                    {PURPOSES.map((p) => (
                        <li key={p} data-purpose={p}>
                            {t(`purposes.${p}`)}
                        </li>
                    ))}
                </ul>
                <div className="cookie-banner__actions">
                    <Button variant="primary" size="sm" onClick={acceptAll}>
                        {t("accept")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={refuseAll}>
                        {t("refuse")}
                    </Button>
                    <Link href="/cookies" className="cookie-banner__link">
                        {t("link")}
                    </Link>
                </div>
            </div>
        </aside>
    );
}
