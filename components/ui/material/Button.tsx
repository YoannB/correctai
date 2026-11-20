"use client";
import MuiButton from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import type { AppButtonProps, AppHref } from "../types";

const VARIANT = {
    primary: "contained",
    secondary: "outlined",
    ghost: "text",
} as const;

const SIZE = { sm: "small", md: "medium", lg: "large" } as const;

// Internal = a typed pathname of i18n/routing ("/..." or a { pathname, params } object).
// Anything else (https:, http:, mailto:) is external and stays a plain <a>.
const isInternal = (href: AppHref) => typeof href !== "string" || href.startsWith("/");

// LINK MODE (href): MUI ButtonBase renders `LinkComponent` instead of <button> as soon as an
// href is present, with the SAME root classes => identical halo/gradient/hover/disabled
// styling, and no <button> nested in an <a> (invalid HTML: interactive inside interactive).
// Internal hrefs use next-intl's Link (localized URL, client navigation, prefetch).
// A disabled/loading link drops its href: ButtonBase then falls back to a real disabled
// <button> (not focusable, not navigable) instead of an <a aria-disabled> that still has a URL.
// `newTab` (external link): target/rel are added here, never exposed by the neutral API.
function linkProps(href: AppHref | undefined, inactive: boolean | undefined, newTab: boolean) {
    if (href === undefined || inactive) return {};
    const tab = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
    // MUI types href as string; ButtonBase forwards it untouched to LinkComponent, which
    // accepts next-intl's typed href (string pathname or { pathname, params } object).
    if (isInternal(href)) return { href: href as unknown as string, LinkComponent: Link, ...tab };
    return { href: href as string, ...tab };
}

// Visually hidden but read by screen readers (inline: no global utility class exists).
const VISUALLY_HIDDEN = {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
} as const;

// Swallows the click of a BUSY button (pointer, Enter, Space): onClick is not called and a
// submit button does not submit.
const ignoreClick = (event: MouseEvent) => event.preventDefault();

// The "(new tab)" hint needs next-intl, so ONLY an active external link reads the messages
// (common.newTab): every other Button renders without an intl provider (stories, tests).
export function Button(props: AppButtonProps) {
    const { href, external, disabled, loading } = props;
    if (external && href !== undefined && !disabled && !loading) return <ExternalButton {...props} />;
    return <BaseButton {...props} />;
}

function ExternalButton(props: AppButtonProps) {
    const t = useTranslations("common");
    return <BaseButton {...props} newTab={t("newTab")} />;
}

// NO transform on :hover: moving the box changes the pointer hit area and
// creates an endless oscillation (hover -> translate -> mouse out -> un-hover -> ...).
// Hover strengthens the shadow + lightens, and STOPS the halo animation (otherwise the animation
// drives box-shadow and would override the static hover shadow). The btnShift/
// btnHalo/btnSheen keyframes live in material/index.css (sx cannot define @keyframes).
function BaseButton({
    variant = "primary",
    size = "md",
    disabled,
    loading,
    busy,
    fullWidth,
    type = "button",
    href,
    onClick,
    iconLeft,
    iconRight,
    ariaLabel,
    children,
    className,
    id,
    newTab,
}: AppButtonProps & { newTab?: string }) {
    const isPrimary = variant === "primary";
    const link = linkProps(href, disabled || loading, newTab !== undefined);
    // Busy: loading's look (the Mui-disabled class carries MUI's disabled styles and ours below)
    // and spinner, but NO native `disabled`, so the button keeps the focus. Ignored when the
    // button is already disabled/loading (those stay unchanged).
    const isBusy = Boolean(busy) && !disabled && !loading;
    return (
        <MuiButton
            id={id}
            className={cn(className, isBusy && "Mui-disabled") || undefined}
            variant={VARIANT[variant]}
            size={SIZE[size]}
            color="primary"
            disabled={disabled || loading}
            fullWidth={fullWidth}
            // A link has no form type (ButtonBase only sets `type` on a <button> anyway).
            type={"href" in link ? undefined : type}
            {...link}
            onClick={isBusy ? ignoreClick : onClick}
            // The hidden "(new tab)" is part of the content; an explicit aria-label replaces the
            // content, so it carries the hint too.
            aria-label={ariaLabel && newTab ? `${ariaLabel} ${newTab}` : ariaLabel}
            aria-disabled={isBusy || undefined}
            aria-busy={isBusy || undefined}
            startIcon={loading || isBusy ? <CircularProgress size={16} color="inherit" /> : iconLeft}
            endIcon={iconRight}
            sx={{
                position: "relative",
                overflow: "hidden",
                textTransform: "none",
                fontWeight: 700,
                // Label on the gradient: a token (styles/tokens.css), overridable per theme by a site.
                color: isPrimary ? "var(--btn-fg)" : undefined,
                backgroundImage: isPrimary
                    ? "linear-gradient(120deg,var(--accent-1),var(--accent-2),var(--accent-1))"
                    : undefined,
                backgroundSize: isPrimary ? "220% 100%" : undefined,
                animation:
                    isPrimary && !disabled
                        ? "btnShift 7s ease-in-out infinite, btnHalo 3.4s ease-in-out infinite"
                        : undefined,
                transition: "box-shadow .25s ease, filter .2s ease",
                "&:not(:disabled):hover": isPrimary
                    ? {
                          animation: "none",
                          boxShadow: "0 12px 34px color-mix(in oklab, var(--accent-1) 50%, transparent)",
                          filter: "brightness(1.06)",
                      }
                    : { boxShadow: "0 8px 22px rgba(0,0,0,.28)" },
                // DISABLED STATE, VARIANTS WITHOUT A PAINTED BACKGROUND (outlined = secondary, text = ghost):
                // MUI applies opacity .38 to the primary color (#7c5cff), which on a light background
                // (light --bg-0 #dfe5f0, or a white surface in an app) drops to ~1.5:1 => ghost
                // button (see the Disabled/Light story). The contained (primary) variant is EXCLUDED from this
                // selector: MUI already paints a grey background there that ensures contrast; leaving it
                // as is avoids degrading its rendering. Specificity 0,3,0 > 0,2,0 of MUI's
                // disabled styles => wins WITHOUT !important. var() resolved at runtime (not a channel
                // derived by MUI) => identical server/client => no hydration mismatch,
                // and follows both themes (readable grey on light as on dark).
                "&.MuiButton-outlined.Mui-disabled, &.MuiButton-text.Mui-disabled": {
                    color: "var(--muted)",
                    borderColor: "var(--border-2)",
                    opacity: 1,
                },
                "&::after":
                    isPrimary && !disabled
                        ? {
                              content: '" "',
                              position: "absolute",
                              inset: 0,
                              pointerEvents: "none",
                              background:
                                  "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.42) 50%, transparent 65%)",
                              transform: "translateX(-130%)",
                              animation: "btnSheen 3.6s ease-in-out infinite",
                          }
                        : undefined,
            }}
        >
            {children}
            {newTab ? <span style={VISUALLY_HIDDEN}> {newTab}</span> : null}
        </MuiButton>
    );
}
