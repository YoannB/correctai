// components/ui/CopyButton.tsx
"use client";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { Icon } from "./Icon";

// Copies the plain `text` (never markup). Labels default to the generic showcase copy; a tool
// passes its own (`label`, `copiedLabel`) and may react to a successful copy (`onCopied`, e.g.
// a toast) — called only when the clipboard write resolved.
export function CopyButton({
    text,
    disabled,
    label,
    copiedLabel,
    onCopied,
}: {
    text: string;
    disabled?: boolean;
    label?: string;
    copiedLabel?: string;
    onCopied?: () => void;
}) {
    const { copied, copy } = useCopyToClipboard();
    const t = useTranslations("showcase");
    const idle = label ?? t("copyLabel");
    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => void copy(text).then((ok) => ok && onCopied?.())}
            ariaLabel={idle}
        >
            <Icon name={copied ? "check" : "box"} size={16} animated />{" "}
            {copied ? (copiedLabel ?? t("copyCopied")) : idle}
        </Button>
    );
}
