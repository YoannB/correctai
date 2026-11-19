"use client";
import { CommentsGate } from "@/components/content/CommentsGate";
import { useCookieConsent } from "@/hooks/use-consent";
import { DISQUS_PRIVACY_URL, type DisqusThreadConfig } from "@/lib/comments";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useId, useState } from "react";

function Loading() {
    const t = useTranslations("comments");
    return (
        <p className="entry-comments__loading muted" role="status">
            {t("loading")}
        </p>
    );
}

// Client-only chunk, fetched on demand: no Disqus JS in any page bundle (docs/articles.md → Comments).
const DisqusThread = dynamic(() => import("@/components/content/DisqusThread"), { ssr: false, loading: Loading });

/**
 * Comments under a NON-archived entry (the entry page decides; see CollectionPages). Nothing from
 * Disqus loads until the visitor clicks "Show comments" (this page only) or has granted the
 * "comments" purpose ("Always show comments", or "Accept" in the cookie banner). Consent is read
 * from the store: its server snapshot is null, so SSR and hydration both render the placeholder.
 */
export function EntryComments({ shortname, config }: { shortname: string; config: DisqusThreadConfig }) {
    const t = useTranslations("comments");
    const titleId = useId();
    const { consent, allowComments } = useCookieConsent();
    // User intent, set from the click handler only (no effect).
    const [requested, setRequested] = useState(false);
    const load = requested || consent?.comments === true;

    return (
        <section className="entry-comments" aria-labelledby={titleId} data-entry-comments>
            <h2 id={titleId} className="entry-comments__title">
                {t("title")}
            </h2>
            {load ? (
                <div className="entry-comments__thread">
                    <DisqusThread shortname={shortname} config={config} />
                </div>
            ) : (
                <CommentsGate
                    notice={t("notice")}
                    showLabel={t("show")}
                    alwaysLabel={t("always")}
                    policyLabel={t("policy")}
                    policyUrl={DISQUS_PRIVACY_URL}
                    onShow={() => setRequested(true)}
                    onAlways={allowComments}
                />
            )}
        </section>
    );
}
