// PURE feature switches derived from configuration (no process.env read here: constants/site.ts
// passes the inlined values, so every branch is unit-testable).

/**
 * The AI layer is on when the build saw an OpenRouter key (`flag === "true"`, computed by
 * next.config.ts) AND the daily limit is positive. Anything else hides every AI surface.
 */
export function isAiEnabled(flag: string | undefined, dailyLimit: number): boolean {
    return flag === "true" && dailyLimit > 0;
}

/**
 * A consent banner is needed only when a tracker that requires consent is configured: GTM, ads,
 * or a third-party comment service (Disqus places its own cookies).
 */
export function isConsentRequired(cfg: { gtmId: string; adsEnabled: boolean; commentsEnabled?: boolean }): boolean {
    return cfg.gtmId.trim() !== "" || cfg.adsEnabled || cfg.commentsEnabled === true;
}
