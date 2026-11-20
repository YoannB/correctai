import type { Page } from "@playwright/test";

const DISQUS_HOST = /(^|\.)disqus(cdn)?\.com$/;

/**
 * Intercepts and ABORTS every request to Disqus (disqus.com, *.disqus.com, *.disquscdn.com): specs
 * never reach the real service (the CI shortname is fake). Returns the live list of the URLs that
 * were attempted, so a spec can assert that nothing (or something) tried to load.
 */
export async function blockDisqus(page: Page): Promise<string[]> {
    const attempts: string[] = [];
    await page.route(
        (url) => DISQUS_HOST.test(url.hostname),
        (route) => {
            attempts.push(route.request().url());
            return route.abort();
        },
    );
    return attempts;
}
