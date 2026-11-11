"use client";
import { SITE_NAME } from "@/constants/site";
import { cn } from "@/lib/cn";
import { useId } from "react";

// CorrectAI mark: a pen stroke with two sparkle pairs (CSS-only animation, styles/ui/logo.css).
// `draw` replays the stroke-dashoffset "writing" loop (splash / loaders); the header and footer
// keep a still pen with only the sparkles breathing. The gradient id is per instance (useId) so
// several logos on one page never resolve each other's <defs>.
export function Logo({ size = 36, className, draw = false }: { size?: number; className?: string; draw?: boolean }) {
    const gradientId = `logoGrad-${useId().replace(/:/g, "")}`;
    return (
        <svg
            className={cn("logo", draw && "logo--draw", className)}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            role="img"
            aria-label={SITE_NAME}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>
            <path
                className="logo__pen"
                d="M14 50 L20 32 L44 8 L56 20 L32 44 Z M20 32 L32 44"
                stroke={`url(#${gradientId})`}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <g className="logo__spark" fill="#7dd3fc">
                <circle cx="75" cy="5" r="2.4" />
                <circle cx="65" cy="2" r="1.6" />
            </g>
            <g className="logo__spark logo__spark--late" fill="#c4b5fd">
                <circle cx="10" cy="20" r="2" />
                <circle cx="6" cy="28" r="1.4" />
            </g>
        </svg>
    );
}
