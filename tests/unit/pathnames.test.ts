// @vitest-environment node
import { PATHNAMES, staticHrefs } from "@/i18n/pathnames";
import { describe, expect, it } from "vitest";

describe("staticHrefs", () => {
    it("keeps static routes in order and drops dynamic [param] routes", () => {
        expect(staticHrefs({ "/": "/", "/articles/[slug]": "/a/[slug]", "/about": "/about" })).toEqual(["/", "/about"]);
    });

    it("lists the app's static routes, the home first", () => {
        const hrefs = staticHrefs(PATHNAMES);
        expect(hrefs[0]).toBe("/");
        expect(hrefs.every((href) => !href.includes("["))).toBe(true);
    });
});
