"use client";
import type { DisqusThreadConfig } from "@/lib/comments";
import { DiscussionEmbed } from "disqus-react";
import { useSyncExternalStore } from "react";

// The ONLY module importing disqus-react. EntryComments loads it with next/dynamic (ssr: false)
// once the visitor chose to see the comments, so pages without comments, and entries whose visitor
// never chose, ship no Disqus code and request nothing from Disqus.

// The painted theme is the `data-theme` attribute of <html> (lib/boot-script.ts, hooks/use-theme.ts).
// Subscribing to the ATTRIBUTE (not to the store's mode) means the value changes only once the new
// colours are applied, so the reloaded thread reads the right ones.
function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
}
const paintedTheme = () => document.documentElement.dataset.theme ?? "";
const serverTheme = () => "";

export default function DisqusThread({ shortname, config }: { shortname: string; config: DisqusThreadConfig }) {
    const theme = useSyncExternalStore(subscribe, paintedTheme, serverTheme);
    // Disqus picks its light/dark scheme ONCE, from the text colour around the thread: a theme
    // change remounts the embed (key), which resets Disqus and loads the thread again.
    return <DiscussionEmbed key={theme} shortname={shortname} config={config} />;
}
