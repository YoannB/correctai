import { Logo } from "./Logo";

/** Splash content: `SPLASH` of constants/site.ts. */
export interface AppSplashProps {
    /** The logo, class `.splash-logo` (animated by CSS), above the bar. */
    logo: boolean;
    /** The animated progress bar. */
    bar: boolean;
}

// Pre-hydration splash, rendered by the ROOT layout (app/layout.tsx): plain server markup, so the
// logo is in the HTML before any script runs (Logo is SSR'd; its ids come from useId, unique next
// to the header's logo). Hidden — never removed — by SplashLoader through `.is-leaving`
// (styles/ui/loader.css). aria-hidden: a decorative, transient screen with no announcement.
export function AppSplash({ logo, bar }: AppSplashProps) {
    return (
        <div id="app-splash" aria-hidden="true">
            {logo && <Logo size={120} className="splash-logo" />}
            {bar && <span className="loader__bar" />}
        </div>
    );
}
