// components/ui/Terminal.tsx — read-only console panel (generic, no MUI)
import { cn } from "@/lib/cn";
import type { AppTerminalProps } from "./types";

// Displays lines as plain React text (never innerHTML). By default the body is a role="log" live
// region, so screen readers announce new lines politely as a scripted sequence (useScriptedSequence)
// reveals them; `live={false}` makes it a plain named region (static content, nothing to announce). Monospace, fixed max height from `rows`, scrolls beyond.
const MARK: Record<string, string> = { command: ">", success: "✓", error: "✗", link: "→", output: "" };

export function Terminal({
    lines,
    ariaLabel,
    title,
    running = false,
    actions,
    rows = 12,
    live = true,
    className,
}: AppTerminalProps) {
    return (
        <section className={cn("terminal", className)}>
            {title || actions ? (
                <header className="terminal__bar">
                    <span className="terminal__title">{title}</span>
                    {actions ? <span className="terminal__actions">{actions}</span> : null}
                </header>
            ) : null}
            <div
                className="terminal__body"
                role={live ? "log" : "region"}
                aria-live={live ? "polite" : undefined}
                aria-label={ariaLabel}
                tabIndex={0}
                style={{ maxHeight: `calc(${rows} * 1.6em + 24px)` }}
            >
                {lines.map((line) => {
                    const kind = line.kind ?? "output";
                    return (
                        <div key={line.id} className={`terminal__line terminal__line--${kind}`}>
                            {MARK[kind] ? (
                                <span className="terminal__mark" aria-hidden="true">
                                    {MARK[kind]}
                                </span>
                            ) : null}
                            {kind === "link" && line.href ? (
                                <a href={line.href} target="_blank" rel="noopener noreferrer">
                                    {line.text}
                                </a>
                            ) : (
                                <span>{line.text}</span>
                            )}
                        </div>
                    );
                })}
                {running ? <span className="terminal__cursor" aria-hidden="true" /> : null}
            </div>
        </section>
    );
}
