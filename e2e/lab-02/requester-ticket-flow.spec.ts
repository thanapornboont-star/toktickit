import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");
const SAMPLE_PDF = path.resolve(__dirname, "fixtures/sample-attachment.pdf");

async function shot(page: Page, projectName: string, subfolder: string, name: string) {
  const dir = path.join(ARTIFACTS_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${projectName.toLowerCase()}-${name}.png`),
    fullPage: true,
  });
}

test.describe("E2E-01: Requester select -> create ticket -> My Tickets -> Ticket Detail -> attachment lifecycle", () => {
  test("complete flow", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    const uniqueSummary = `E2E QA flow ticket ${Date.now()}`;

    // 1. Development Requester Selection (Lab 2 testing mechanism, not login)
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Development Requester Selection" })
    ).toBeVisible();
    await page.getByLabel("Development requester", { exact: true }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
    await shot(page, viewport, "my-tickets", "initial");

    // 2. Create Ticket
    await page.getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();

    await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Ticket Summary", { exact: false }).fill(uniqueSummary);
    await page
      .getByLabel("Problem Description", { exact: false })
      .fill("Created by the automated Playwright E2E QA flow for Issue #25.");
    await shot(page, viewport, "create-ticket", "filled-form");

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket Created Successfully!" })).toBeVisible();
    await shot(page, viewport, "create-ticket", "success");

    const ticketNumberText = await page
      .getByText(/^TKT-\d{4}-\d{6}$/)
      .first()
      .textContent();
    const ticketNumber = ticketNumberText!.trim();

    // 3. Find the new ticket in My Tickets via search
    await page.getByRole("button", { name: "View in My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    await page.getByPlaceholder(/Search by ticket number or summary/).fill(ticketNumber);
    await page.getByRole("button", { name: "Search" }).click();

    // My Tickets renders both a desktop table and a mobile card list; CSS
    // (d-none/d-md-block/d-md-none) shows only one per viewport, so
    // intersect with the ":visible" pseudo-class to avoid strict-mode
    // "resolved to N elements" errors from the hidden duplicate.
    const visible = (locator: ReturnType<Page["locator"]>) => locator.and(page.locator(":visible"));

    await expect(visible(page.getByText(ticketNumber))).toBeVisible();
    await shot(page, viewport, "my-tickets", "search-results");

    // 4. Open Ticket Detail (read-only view)
    await visible(page.getByRole("button", { name: "View" })).click();
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await shot(page, viewport, "ticket-detail", "initial");

    // 5. Add a permitted attachment
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    // The file input itself has an implicit role="button" (HTML-AAM) whose
    // accessible name comes from its label "+ Upload Attachment", so match
    // the submit button by its exact name to avoid ambiguity.
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page.getByText("Attachment uploaded successfully.")).toBeVisible();
    // The active attachment table (desktop) and card (mobile) both render;
    // scope to the one actually visible in this viewport.
    await expect(visible(page.getByText("sample-attachment.pdf"))).toBeVisible();
    await shot(page, viewport, "ticket-detail", "attachment-uploaded");

    // 6. Download the active attachment
    const downloadPromise = page.waitForEvent("download");
    await visible(page.getByRole("button", { name: "Download" })).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample-attachment.pdf");

    // 7. Soft-remove the attachment with a confirmation reason
    await visible(page.getByRole("button", { name: "Remove" })).click();
    await expect(
      page.getByText("Are you sure you want to remove this attachment?")
    ).toBeVisible();
    await shot(page, viewport, "ticket-detail", "remove-confirmation-modal");

    await page
      .getByLabel(/Please provide a reason for removal/)
      .fill("Removed by the automated E2E QA test.");
    await page.getByRole("button", { name: "Confirm Removal" }).click();

    await expect(page.getByText("Removed Attachments")).toBeVisible();
    await expect(visible(page.getByText("Removed by the automated E2E QA test."))).toBeVisible();
    await expect(visible(page.getByRole("button", { name: "Unavailable" }))).toBeDisabled();
    await shot(page, viewport, "ticket-detail", "attachment-removed");

    // 8. Back to My Tickets
    await page.getByRole("button", { name: /Back to My Tickets/ }).click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
  });
});
