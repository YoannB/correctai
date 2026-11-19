import { ADS_ENABLED, AI_ENABLED, COMMENTS_ENABLED, CONSENT_REQUIRED, GTM_ID } from "@/constants/site";
import { visibleLegalSections, type LegalFlags, type LegalSection } from "@/lib/legal-sections";

// The site switches the legal copy depends on (lib/legal-sections.ts).
export const LEGAL_FLAGS: LegalFlags = {
    ai: AI_ENABLED,
    ads: ADS_ENABLED,
    gtm: GTM_ID !== "",
    consent: CONSENT_REQUIRED,
    comments: COMMENTS_ENABLED,
};

// Body of the legal / privacy / cookies pages. Server-compatible: no hook. `sections` is the raw
// messages array (t.raw: internal, controlled JSON; placeholders already interpolated by
// i18n/request.ts).
export function LegalSections({ sections, flags = LEGAL_FLAGS }: { sections: LegalSection[]; flags?: LegalFlags }) {
    return (
        <>
            {visibleLegalSections(sections, flags).map((s, i) => (
                <section key={i} className="static-page__section">
                    <h2>{s.heading}</h2>
                    {s.body.map((b, j) =>
                        typeof b === "string" ? (
                            <p key={j}>{b}</p>
                        ) : (
                            <ul key={j}>
                                {b.map((item, k) => (
                                    <li key={k}>{item}</li>
                                ))}
                            </ul>
                        ),
                    )}
                </section>
            ))}
        </>
    );
}
