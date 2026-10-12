import { test, expect } from "@playwright/test";
import { loginAsStaff, loginAsRequester, reseedDatabase } from "./helpers";

test.describe("E2E-01: Actions Taken Lifecycle and Authorization Boundaries", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("AC-01 & AC-02: IT Staff logs an Action Taken with validation and auto-performer", async ({ page }) => {
    // 1. Staff signs in
    await loginAsStaff(page);
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // 2. Open first ticket in queue
    const openTicketBtn = page.locator('button[aria-label^="Open ticket"]:visible').first();
    await openTicketBtn.click();
    await expect(page.locator("[data-testid='actions-taken-section']")).toBeVisible();

    // 3. Click "+ Add Action Taken" to open modal
    await page.getByTestId("add-action-taken-btn").click();
    await expect(page.locator("#actionDescriptionInput")).toBeVisible();

    // 4. Test validation: check Follow-up Required but leave Follow-up Note empty (AC-02, BR-04)
    await page.locator("#actionDescriptionInput").fill("Inspected switch ports and verified VLAN configuration");
    await page.locator("#actionResultInput").fill("Found port flapping on interface eth0/2");
    await page.locator("#isFollowUpRequiredCheckbox").check();
    await expect(page.locator("#followUpNoteInput")).toBeVisible();
    await page.locator("#followUpNoteInput").fill("");

    // Submit should trigger validation error
    await page.locator("button[type='submit']", { hasText: /save|record|submit/i }).click();
    await expect(page.locator(".invalid-feedback")).toBeVisible();

    // 5. Fill Follow-up Note and submit successfully (AC-01, BR-01)
    await page.locator("#followUpNoteInput").fill("Replace patch cable tomorrow morning");
    await page.locator("button[type='submit']", { hasText: /save|record|submit/i }).click();

    // 6. Verify modal closes and action appears in list with auto-attributed performer
    await expect(page.locator("#actionDescriptionInput")).toBeHidden();
    await expect(page.locator(".alert-success").first()).toBeVisible();
    await expect(page.locator("[data-testid='actions-taken-table']")).toContainText("Inspected switch ports");
    await expect(page.locator("[data-testid='actions-taken-table']")).toContainText("Staff Alex");
  });

  test("AC-03 & AC-04: Requester views Actions Taken in Read-Only mode and cannot add/edit", async ({ page }) => {
    // 1. Requester signs in
    await loginAsRequester(page);
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    // 2. Open first ticket owned by requester
    const viewBtn = page.locator("button:visible", { hasText: "View" }).first();
    await viewBtn.click();
    await expect(page.getByText("Ticket Detail", { exact: true })).toBeVisible();

    // 3. Verify Actions Taken section exists (AC-03)
    const actionsSection = page.locator("[data-testid='actions-taken-section']");
    await expect(actionsSection).toBeVisible();

    // 4. Verify Read-Only boundary: Add button and edit controls must be hidden (AC-04, BR-07)
    await expect(page.getByTestId("add-action-taken-btn")).toBeHidden();
    await expect(actionsSection.locator("button", { hasText: /edit/i })).toBeHidden();
  });
});
