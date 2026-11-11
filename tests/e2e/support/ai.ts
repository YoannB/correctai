import type { Page, Route } from "@playwright/test";

// CorrectAI calls the unified route (agent "correct"); the Axons showcase button is gone.
const RUN_URL = "**/api/run";

// IMPORTANT:
// .toast-region is the aria-live region that contains the toasts.
// It can be present but hidden when no toast is displayed.
// The toast itself is the MuiAlert with role="alert".
//
// So only the alerts INSIDE the notification region are targeted.
// This avoids:
// - selecting the hidden container;
// - strict mode violations when both the container and the alert match.
export function toastAlerts(page: Page) {
    return page.locator('.toast-region [role="alert"]');
}

export function firstToast(page: Page) {
    return toastAlerts(page).first();
}

export function toastByText(page: Page, text: string | RegExp) {
    return toastAlerts(page).filter({ hasText: text });
}

export interface RunMock {
    status?: number;
    body?: unknown;
    rawBody?: string;
    contentType?: string;
    delayMs?: number;
}

async function fulfillMock(route: Route, mock: RunMock) {
    if (mock.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, mock.delayMs));
    }

    const body = mock.rawBody ?? JSON.stringify(mock.body ?? {});

    await route.fulfill({
        status: mock.status ?? 200,
        contentType: mock.contentType ?? "application/json",
        body,
    });
}

export async function mockRun(page: Page, mock: RunMock) {
    await page.route(RUN_URL, (route) => fulfillMock(route, mock));
}

export async function mockRunSequence(page: Page, mocks: RunMock[]) {
    let index = 0;

    await page.route(RUN_URL, async (route) => {
        const mock = mocks[Math.min(index, mocks.length - 1)];
        index += 1;

        await fulfillMock(route, mock);
    });
}

export async function mockRunWithCounter(page: Page, mock: RunMock): Promise<{ hits: number }> {
    const counter = { hits: 0 };

    await page.route(RUN_URL, async (route) => {
        counter.hits += 1;
        await fulfillMock(route, mock);
    });

    return counter;
}
