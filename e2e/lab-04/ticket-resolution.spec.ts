import { test, expect } from "@playwright/test";
import { loginAsStaff, loginAsRequester, reseedDatabase } from "./helpers";

test.describe("E2E-02: Ticket Resolution Workflow, Advisory Gate, and State Transitions", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("AC-05 & AC-07: Requester sets advisory indicator without changing status; Staff resolves ticket", async ({ page }) => {
    const targetTicketNumber = "TKT-2026-000101";

    // 1. Requester signs in and finds an active (non-resolved) ticket
    await loginAsRequester(page);
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    // Search for known active test ticket
    await page.locator("#ticket-search").fill(targetTicketNumber);
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForTimeout(600);

    await page.locator("button:visible", { hasText: "View" }).first().click();
    await expect(page.getByText("Ticket Detail", { exact: true })).toBeVisible();

    // 2. Click "Problem Appears Resolved" (AC-07, BR-10)
    const indicateBtn = page.getByRole("button", { name: "Problem Appears Resolved" });
    if (await indicateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await indicateBtn.click();
      await expect(page.getByText("Problem indicated as resolved.")).toBeVisible();
    }

    // 3. Confirm status is NOT changed automatically to RESOLVED (AC-07, BR-10)
    const statusField = page.locator("#detail-status");
    const currentStatus = await statusField.inputValue();
    expect(currentStatus).not.toBe("RESOLVED");

    // 4. Log out requester, clear session, and log in as IT Staff
    await loginAsStaff(page);
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // 5. Open the exact ticket in Queue using search
    await page.locator("#queue-search").fill(targetTicketNumber);
    await page.waitForTimeout(500);
    await page.locator(`button[aria-label="Open ticket ${targetTicketNumber}"]:visible`).click();
    await expect(page.getByTestId("advisory-resolution-banner")).toBeVisible();
    await expect(page.getByTestId("advisory-resolution-banner")).toContainText(/problem appears resolved/i);

    // 6. Formally resolve ticket via advisory banner button or status dropdown
    const formallyResolveBtn = page.getByTestId("formally-resolve-btn");
    if (await formallyResolveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await formallyResolveBtn.click();
    } else {
      const statusSelect = page.locator("#status-select");
      await statusSelect.selectOption("RESOLVED");
      await page.locator("button[aria-label='Update status']").click();
    }

    // 7. Verify status successfully updated to Resolved
    await expect(page.locator(".badge-status-resolved")).toBeVisible({ timeout: 10000 });
  });

  test("AC-08: Stale update triggers 409 Conflict handling", async ({ page }) => {
    // 1. Staff logs in and opens a ticket
    await loginAsStaff(page);
    const openTicketBtn = page.locator('button[aria-label^="Open ticket"]:visible').first();
    await openTicketBtn.click();
    await expect(page.locator("#status-select")).toBeVisible();

    // 2. Intercept status update to return 409 Conflict (simulating concurrent edit)
    await page.route("**/api/**/status", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "CONFLICT",
            message: "Ticket has been modified by another user since you loaded it.",
          },
        }),
      });
    });

    // 3. Attempt status transition
    await page.locator("#status-select").selectOption({ index: 0 });
    await page.locator("button[aria-label='Update status']").click();

    // 4. Verify 409 Conflict error message is shown to user
    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText(/updated by another user|conflict|modified/i);

    await page.unroute("**/api/**/status");
  });
});
