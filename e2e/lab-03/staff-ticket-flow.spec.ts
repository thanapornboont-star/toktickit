import { test, expect } from "@playwright/test";
import { captureScreenshot, reseedDatabase } from "./helpers";

test.describe("E2E-02: IT Staff Ticket Queue, Operations, and Dual Communications", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("Complete staff ticketing workflow: queue filters, claim, priority, status, comments, and notes", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Login as IT Staff
    await page.goto("/#login");
    await page.locator("#login-email").fill("staff.alex@toktickit.local");
    await page.locator("#login-password").fill("StaffPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 2. Verify IT Staff navigation & Queue screen
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();
    await expect(page.getByText("IT Staff", { exact: true }).first()).toBeVisible();

    // Navigation isolation: IT Staff has Ticket Queue only
    await expect(page.getByRole("link", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Tickets" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Create Ticket" })).toBeHidden();
    await expect(page.getByRole("link", { name: "User Management" })).toBeHidden();

    await captureScreenshot(page, viewport, "staff", "queue-initial");

    // 3. Test Queue Search and Filters (AC-11)
    // Keyword search for TKT-2026-000101
    await page.locator("#queue-search").fill("TKT-2026-000101");
    await expect(page.locator(':visible').filter({ hasText: "TKT-2026-000101" }).first()).toBeVisible();
    await expect(page.locator(':visible').filter({ hasText: "Laptop battery drains rapidly" }).first()).toBeVisible();
    await expect(page.locator(':visible').filter({ hasText: "TKT-2026-000103" })).toBeHidden();
    await captureScreenshot(page, viewport, "staff", "queue-search-filtered");

    // Search for TKT-2026-000103
    await page.locator("#queue-search").fill("TKT-2026-000103");
    await expect(page.locator(':visible').filter({ hasText: "TKT-2026-000103" }).first()).toBeVisible();
    await expect(page.locator(':visible').filter({ hasText: "Outlook email search returns no recent emails" }).first()).toBeVisible();
    await expect(page.locator(':visible').filter({ hasText: "TKT-2026-000101" })).toBeHidden();

    // Test Status filter with search
    await page.locator("#filter-status").selectOption("NEW");
    await expect(page.locator(':visible').filter({ hasText: "TKT-2026-000103" }).first()).toBeVisible();

    // Clear search for ticket opening
    // 4. Open Ticket Detail (AC-12)
    // Open TKT-2026-000103 (Unassigned, status NEW)
    await page.locator('button[aria-label="Open ticket TKT-2026-000103"]:visible').click();
    await expect(page.getByRole("heading", { name: "Outlook email search returns no recent emails" })).toBeVisible();
    await expect(page.getByText("TKT-2026-000103")).toBeVisible();
    await expect(page.getByText("Sarah Johnson")).toBeVisible();
    await captureScreenshot(page, viewport, "staff", "ticket-detail-initial");

    // 5. Claim Ticket (AC-13)
    await expect(page.getByRole("button", { name: "Claim" })).toBeVisible();
    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.getByText("Ticket assigned to you (Staff Alex).")).toBeVisible();
    // Claim button is hidden once assigned to current user
    await expect(page.getByRole("button", { name: "Claim" })).toBeHidden();
    await captureScreenshot(page, viewport, "staff", "ticket-claimed");

    // 6. Update IT Priority (AC-13, BR-13)
    await page.locator("#priority-select").selectOption("HIGH");
    await expect(page.getByText("IT Priority updated to HIGH.")).toBeVisible();
    await expect(page.locator("text=IT Priority: HIGH").first()).toBeVisible();
    await captureScreenshot(page, viewport, "staff", "priority-updated");

    // 7. Permitted Status Transitions (AC-14, BR-15)
    // NEW -> OPEN
    await page.locator("#status-select").selectOption("OPEN");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Ticket status updated to Open.")).toBeVisible();
    await expect(page.locator(".badge", { hasText: "Open" }).first()).toBeVisible();

    // OPEN -> IN_PROGRESS
    await page.locator("#status-select").selectOption("IN_PROGRESS");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Ticket status updated to In Progress.")).toBeVisible();
    await expect(page.locator(".badge", { hasText: "In Progress" }).first()).toBeVisible();
    await captureScreenshot(page, viewport, "staff", "status-transitioned");

    // 8. Dual Communication Threads (AC-08, AC-10, AC-16)
    // Post Public Comment
    const commentContent = "Investigating the Outlook mailbox indexing issue on our mail cluster.";
    await page.locator("#public-comment-input").fill(commentContent);
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.locator(".comments-list")).toContainText(commentContent);
    await expect(page.locator(".comments-list")).toContainText("Staff Alex");
    await captureScreenshot(page, viewport, "staff", "public-comment-posted");

    // Post Confidential Internal Note (Amber section)
    const noteContent = "Exchange server replica mailbox sync is stalled at queue 12. Rebuilding index.";
    await page.locator("#internal-note-input").fill(noteContent);
    await page.getByRole("button", { name: "Add Internal Note" }).click();
    await expect(page.locator(".internal-notes-list")).toContainText(noteContent);
    await expect(page.locator(".internal-notes-list")).toContainText("Staff Alex");
    await expect(page.getByText("Confidential — Staff Only")).toBeVisible();
    await captureScreenshot(page, viewport, "staff", "internal-note-posted");

    // 9. Verify Requester Indicated Resolved Indicator (AC-09)
    await page.getByRole("button", { name: "Back to ticket queue" }).click();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // Open TKT-2026-000104 (which has requesterIndicatedResolved: true)
    await page.locator("#queue-search").fill("TKT-2026-000104");
    await page.locator('button[aria-label="Open ticket TKT-2026-000104"]:visible').click();
    await expect(page.getByRole("heading", { name: "Wi-Fi connection drops in Building 3 floor 4" })).toBeVisible();
    await expect(
      page.getByText("Requester has indicated that this problem appears resolved.")
    ).toBeVisible();
    await captureScreenshot(page, viewport, "staff", "requester-resolved-indicator");
  });
});
