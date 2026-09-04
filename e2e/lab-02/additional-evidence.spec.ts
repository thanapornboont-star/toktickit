import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");
const INVALID_FILE = path.resolve(__dirname, "fixtures/invalid-attachment.txt");

async function shot(page, projectName: string, subfolder: string, name: string) {
  const dir = path.join(ARTIFACTS_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${projectName.toLowerCase()}-${name}.png`),
    fullPage: true,
  });
}

async function selectRequester(page, index: number) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Development Requester Selection" })).toBeVisible();
  await page.getByLabel("Development requester", { exact: true }).selectOption({ index });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
}

test.describe("Additional evidence: Part 6 Create Ticket error states", () => {
  test("validation error on empty submit", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    await selectRequester(page, 1);
    await page.getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText("Ticket summary is required.")).toBeVisible();
    await shot(page, viewport, "create-ticket", "validation-error");
  });

  test("invalid attachment rejected client-side", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    await selectRequester(page, 1);
    await page.getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(INVALID_FILE);
    await expect(page.getByText(/Invalid file type/i)).toBeVisible();
    await shot(page, viewport, "create-ticket", "invalid-attachment");
  });

  test("backend/API failure preserves entered form values", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    await selectRequester(page, 1);
    await page.getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();

    // Force the create-ticket API call to fail so we can prove the form
    // preserves entered values on a genuine backend failure.
    await page.route("**/api/tickets", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create ticket." } }),
        });
      }
      return route.continue();
    });

    await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Ticket Summary", { exact: false }).fill("Preserved Summary on Server Error");
    await page
      .getByLabel("Problem Description", { exact: false })
      .fill("This description must stay preserved after a backend failure.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.getByText("Failed to create ticket.")).toBeVisible();
    await expect(page.getByLabel("Ticket Summary", { exact: false })).toHaveValue("Preserved Summary on Server Error");
    await shot(page, viewport, "create-ticket", "api-failure");
  });
});

test.describe("Additional evidence: Part 7 My Tickets empty/no-results", () => {
  test("empty state for a requester with zero tickets", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    // index 3 = Sarah Johnson, confirmed 0 tickets via GET /api/tickets before this run
    await selectRequester(page, 3);
    await expect(page.getByText("No Tickets Created Yet")).toBeVisible();
    await shot(page, viewport, "my-tickets", "empty-state");
  });

  test("no-results state for a non-matching search", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    await selectRequester(page, 1);
    await page
      .getByPlaceholder(/Search by ticket number or summary/)
      .fill("ZZZZ_NON_EXISTENT_QUERY_SEARCH");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No Matching Tickets")).toBeVisible();
    await shot(page, viewport, "my-tickets", "no-results");
  });
});
