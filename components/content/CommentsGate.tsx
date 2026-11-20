import { Button } from "@/components/ui";

export interface CommentsGateProps {
    /** Already translated copy (`comments` messages): the component stays neutral (no next-intl). */
    readonly notice: string;
    readonly showLabel: string;
    readonly alwaysLabel: string;
    readonly policyLabel: string;
    /** The third-party service's own privacy policy (opens in a new tab). */
    readonly policyUrl: string;
    /** Loads the comments for this page only. */
    readonly onShow: () => void;
    /** Records the "comments" consent purpose, then loads them (here and on every later entry). */
    readonly onAlways: () => void;
}

// The placeholder shown INSTEAD of a third-party comment thread until the visitor chooses to load
// it (CNIL: nothing from the provider is requested before that choice). Server-compatible markup,
// no state: the caller (EntryComments) owns the decision.
export function CommentsGate({
    notice,
    showLabel,
    alwaysLabel,
    policyLabel,
    policyUrl,
    onShow,
    onAlways,
}: CommentsGateProps) {
    return (
        <div className="entry-comments__gate" data-comments-gate>
            <p className="entry-comments__notice">{notice}</p>
            <div className="entry-comments__actions">
                <Button variant="primary" size="sm" onClick={onShow}>
                    {showLabel}
                </Button>
                <Button variant="ghost" size="sm" onClick={onAlways}>
                    {alwaysLabel}
                </Button>
                <a href={policyUrl} className="entry-comments__policy" target="_blank" rel="noopener noreferrer">
                    {policyLabel}
                </a>
            </div>
        </div>
    );
}
