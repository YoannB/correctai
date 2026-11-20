import { Chip } from "@/components/ui";
import type { EntryStatus } from "@/lib/articles/status";

export type EntryBadgeKind = "new" | "archive";

export interface EntryBadge {
    kind: EntryBadgeKind;
    // Already translated (entryStatus.new / entryStatus.archive): the badge is TEXT, not a colour.
    label: string;
}

/** The badges of an entry status, in display order ("New" and "Archive" never coexist). */
export function badgesFor(status: EntryStatus, labels: Record<EntryBadgeKind, string>): EntryBadge[] {
    const badges: EntryBadge[] = [];
    if (status.isNew) badges.push({ kind: "new", label: labels.new });
    if (status.isArchived) badges.push({ kind: "archive", label: labels.archive });
    return badges;
}

// Server-compatible list of status badges (cards and entry page), rendered through the neutral
// Chip: visible text on a tinted chip whose text is --text-1 (AA in both themes).
export function EntryBadges({ badges }: { badges?: EntryBadge[] }) {
    if (!badges?.length) return null;
    return (
        <span className="entry-badges">
            {badges.map((b) => (
                <span key={b.kind} className={`entry-badge entry-badge--${b.kind}`}>
                    <Chip label={b.label} color={b.kind === "new" ? "success" : "default"} />
                </span>
            ))}
        </span>
    );
}
