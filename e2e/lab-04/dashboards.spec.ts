import { test, expect } from "@playwright/test";
import { loginAsStaff, loginAsRequester, reseedDatabase } from "./helpers";

test.describe("E2E-03: Multi-Role Dashboards, Operational Metrics, and Responsive QA", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("AC-09: Requester Dashboard displays authoritative metrics and drill-down", async ({ page }) => {
    // 1. Log in as Requester
    await loginAsRequester(page);
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    // 2. Navigate to Requester Dashboard
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='requester-dashboard']")).toBeVisible();

    // 3. Verify Metric Cards
    await expect(page.locator("[data-testid='metric-card-total-open']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-in-progress']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-waiting']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-resolved']")).toBeVisible();

    // 4. Verify Recent Tickets section exists
    await expect(page.locator("[data-testid='requester-recent-tickets-section']")).toBeVisible();

    // 5. Test Drill-down: Click Open tickets metric card
    await page.locator("[data-testid='metric-card-total-open']").click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
  });

  test("AC-10 & AC-11: IT Staff Dashboard displays operational metrics and drill-down", async ({ page }) => {
    // 1. Log in as IT Staff
    await loginAsStaff(page);
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // 2. Navigate to Staff Dashboard
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();

    // 3. Verify Operational Metric Cards
    await expect(page.locator("[data-testid='operational-metric-cards']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-new']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-open']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-card-myassigned']")).toBeVisible();
    await expect(page.locator("[data-testid='metric-unassigned']")).toBeVisible();

    // 4. Test Drill-down: Click My Assigned card navigates to queue
    await page.locator("[data-testid='metric-card-myassigned']").click();
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();
  });

  test("AC-12: Responsive Viewports (Desktop, Tablet, Mobile) render with zero horizontal overflow", async ({ page }) => {
    await loginAsStaff(page);
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();

    const viewports = [
      { name: "Desktop", width: 1280, height: 800 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Mobile", width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      // Verify page body does not have horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);
    }
  });
});
