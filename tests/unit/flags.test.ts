// @vitest-environment node
import { isAiEnabled, isConsentRequired } from "@/lib/flags";
import { describe, expect, it } from "vitest";

describe("isAiEnabled", () => {
    it("key seen at build time and positive limit => enabled", () => {
        expect(isAiEnabled("true", 3)).toBe(true);
    });
    it.each([
        ["false", 3],
        [undefined, 3],
        ["TRUE", 3],
        ["true", 0],
        ["true", -1],
    ] as const)("otherwise disabled (%j, %j)", (flag, limit) => {
        expect(isAiEnabled(flag, limit)).toBe(false);
    });
});

describe("isConsentRequired", () => {
    it("no tracker configured => no banner", () => {
        expect(isConsentRequired({ gtmId: "", adsEnabled: false })).toBe(false);
        expect(isConsentRequired({ gtmId: "   ", adsEnabled: false })).toBe(false);
    });
    it("a GTM id => banner", () => {
        expect(isConsentRequired({ gtmId: "GTM-ABC123", adsEnabled: false })).toBe(true);
    });
    it("ads enabled => banner", () => {
        expect(isConsentRequired({ gtmId: "", adsEnabled: true })).toBe(true);
    });
    it("third-party comments active => banner", () => {
        expect(isConsentRequired({ gtmId: "", adsEnabled: false, commentsEnabled: true })).toBe(true);
        expect(isConsentRequired({ gtmId: "", adsEnabled: false, commentsEnabled: false })).toBe(false);
    });
});
