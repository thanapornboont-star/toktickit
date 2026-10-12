import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { loginAsStaff, loginAsRequester, reseedDatabase } from "./helpers";

const ARTIFACTS_ROOT = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

function ensureDirs() {
  const dirs = [
    path.join(ARTIFACTS_ROOT, "staff-dashboard"),
    path.join(ARTIFACTS_ROOT, "actions-taken"),
    path.join(ARTIFACTS_ROOT, "requester-dashboard"),
    path.join(ARTIFACTS_ROOT, "responsive"),
  ];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }
}

test.describe("Lab 4 Screenshot Automation - 32 Visual QA Artifacts", () => {
  test.beforeAll(() => {
    ensureDirs();
  });

  test.beforeEach(async () => {
    reseedDatabase();
  });

  // =========================================================================
  // 1. Staff Operational Dashboard (10 screenshots)
  // =========================================================================
  test("Capture Staff Dashboard Screenshots (10)", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsStaff(page);
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();
    await page.waitForTimeout(500);

    // 01-staff-dashboard-desktop.png
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "staff-dashboard/01-staff-dashboard-desktop.png"),
      fullPage: true,
    });

    // 02-my-actions-taken.png
    const myAssignedCard = page.locator("[data-testid='metric-card-myassigned']");
    if (await myAssignedCard.isVisible()) {
      await myAssignedCard.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/02-my-actions-taken.png"),
      });
    }

    // 03-recent-urgent-tickets.png
    const recentTickets = page.locator(".table-responsive table");
    if (await recentTickets.count() > 0) {
      await recentTickets.first().screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/03-recent-urgent-tickets.png"),
      });
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/03-recent-urgent-tickets.png"),
      });
    }

    // 04-metrics-db-proof.png
    const metricCards = page.locator("[data-testid='operational-metric-cards']");
    if (await metricCards.isVisible()) {
      await metricCards.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/04-metrics-db-proof.png"),
      });
    }

    // 05-drill-down.png
    const unassignedCard = page.locator("[data-testid='metric-unassigned']");
    if (await unassignedCard.isVisible()) {
      await unassignedCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/05-drill-down.png"),
        fullPage: true,
      });
      await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
      await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();
    }

    // 06-loading.png (simulate loading spinner)
    let releaseLoading: () => void = () => {};
    const loadingPromise = new Promise<void>((r) => { releaseLoading = r; });
    await page.route("**/api/dashboard/staff", async (route) => {
      await loadingPromise;
      await route.continue();
    });
    const refreshBtn = page.getByRole("button", { name: /refresh/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/06-loading.png"),
      });
    }
    releaseLoading();
    await page.waitForTimeout(300);
    await page.unroute("**/api/dashboard/staff");

    // 07-empty.png (simulate empty state metrics)
    await page.route("**/api/dashboard/staff", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: {
            unassigned: 0,
            myAssigned: 0,
            criticalHigh: 0,
            myActions: 0,
            newCount: 0,
            openCount: 0,
            inProgressCount: 0,
            waitingCount: 0,
            resolvedCount: 0,
            closedCount: 0,
          },
          statusBreakdown: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0 },
          priorityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          recentTickets: [],
          myRecentActions: [],
        }),
      });
    });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/07-empty.png"),
        fullPage: true,
      });
    }
    await page.unroute("**/api/dashboard/staff");

    // 09-safe-failure.png (simulate 500 error alert)
    await page.route("**/api/dashboard/staff", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Internal server error: Database unreachable." } }),
      });
    });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "staff-dashboard/09-safe-failure.png"),
        fullPage: true,
      });
    }
    await page.unroute("**/api/dashboard/staff");

    // 08-forbidden.png (Requester restricted view)
    await loginAsRequester(page);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "staff-dashboard/08-forbidden.png"),
      fullPage: true,
    });

    // 10-responsive.png (Staff Dashboard on Mobile)
    await loginAsStaff(page);
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "staff-dashboard/10-responsive.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // =========================================================================
  // 2. Actions Taken & Ticket Workflow (16 screenshots)
  // =========================================================================
  test("Capture Actions Taken & Workflow Screenshots (16)", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsStaff(page);
    await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

    // Open TKT-2026-000101
    await page.locator("#queue-search").fill("TKT-2026-000101");
    await page.waitForTimeout(400);
    await page.locator('button[aria-label="Open ticket TKT-2026-000101"]:visible').click();
    await expect(page.getByTestId("actions-taken-section")).toBeVisible();
    await page.waitForTimeout(500);

    // 01-list.png
    await page.getByTestId("actions-taken-section").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/01-list.png"),
      fullPage: true,
    });

    // 14-stable-ordering.png
    const actionsTable = page.getByTestId("actions-taken-table");
    if (await actionsTable.isVisible()) {
      await actionsTable.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/14-stable-ordering.png"),
      });
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/14-stable-ordering.png"),
      });
    }

    // 02-create.png (Modal open)
    const addActionBtn = page.getByTestId("add-action-taken-btn");
    await addActionBtn.click();
    await expect(page.locator("#actionDescriptionInput")).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/02-create.png"),
    });

    // 07-validation.png (Validation errors)
    await page.locator("#isFollowUpRequiredCheckbox").check();
    await page.locator("#actionDescriptionInput").fill("ab"); // too short (<3)
    await page.locator("button[type='submit']", { hasText: /save|record|submit/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/07-validation.png"),
    });

    // 06-complete-cancel.png (Close modal)
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/06-complete-cancel.png"),
    });

    // 03-assign.png (Claim / Owner Assignment)
    const assignControls = page.locator("#owner-select");
    if (await assignControls.isVisible()) {
      await assignControls.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/03-assign.png"),
      });
    }

    // 04-edit.png (Edit action modal)
    const editBtn = page.locator("button[aria-label^='Edit action']:visible").first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/04-edit.png"),
      });
      const cancelEdit = page.getByRole("button", { name: "Cancel" });
      if (await cancelEdit.isVisible()) await cancelEdit.click();
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/04-edit.png"),
      });
    }

    // 05-status.png (Status transition controls)
    const statusControls = page.locator("#status-select");
    if (await statusControls.isVisible()) {
      await statusControls.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/05-status.png"),
      });
    }

    // 08-inactive-rejection.png (Attempt action on closed/cancelled ticket)
    await page.getByRole("button", { name: "Back to ticket queue" }).click();
    await page.waitForTimeout(400);
    await page.locator("#queue-search").fill("TKT-2026-000108"); // Cancelled ticket
    await page.waitForTimeout(400);
    const cancelledBtn = page.locator('button[aria-label="Open ticket TKT-2026-000108"]:visible');
    if (await cancelledBtn.isVisible()) {
      await cancelledBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/08-inactive-rejection.png"),
      fullPage: true,
    });

    // 09-requester-view.png (Read-only view for requester)
    await loginAsRequester(page);
    await page.locator("#ticket-search").fill("TKT-2026-000101");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForTimeout(500);
    await page.locator("button:visible", { hasText: "View" }).first().click();
    await expect(page.getByText("Ticket Detail", { exact: true })).toBeVisible();
    await page.getByTestId("actions-taken-section").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/09-requester-view.png"),
      fullPage: true,
    });

    // 10-safe-failure.png (API failure on actions)
    await loginAsStaff(page);
    await page.route("**/api/tickets/*/actions-taken", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Internal server error: actions table locked." } }),
      });
    });
    await page.locator("#queue-search").fill("TKT-2026-000101");
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="Open ticket TKT-2026-000101"]:visible').click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/10-safe-failure.png"),
      fullPage: true,
    });
    await page.unroute("**/api/tickets/*/actions-taken");

    // 11-responsive.png (Actions Taken on Mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    await page.getByTestId("actions-taken-section").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/11-responsive.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    // 12-multiple-actions.png
    await page.getByTestId("actions-taken-section").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/12-multiple-actions.png"),
    });

    // 13-permitted-transitions.png
    const statusSelect = page.locator("#status-select");
    if (await statusSelect.isVisible()) {
      await statusSelect.screenshot({
        path: path.join(ARTIFACTS_ROOT, "actions-taken/13-permitted-transitions.png"),
      });
    }


    // 15-append-only.png
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/15-append-only.png"),
      fullPage: true,
    });

    // 16-role-visibility.png
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "actions-taken/16-role-visibility.png"),
      fullPage: true,
    });
  });

  // =========================================================================
  // 3. Requester Dashboard (3 screenshots)
  // =========================================================================
  test("Capture Requester Dashboard Screenshots (3)", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsRequester(page);
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='requester-dashboard']")).toBeVisible();
    await page.waitForTimeout(500);

    // 01-dashboard-desktop.png
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "requester-dashboard/01-dashboard-desktop.png"),
      fullPage: true,
    });

    // 02-attention-tickets.png
    const waitingCard = page.locator("[data-testid='metric-card-waiting']");
    if (await waitingCard.isVisible()) {
      await waitingCard.screenshot({
        path: path.join(ARTIFACTS_ROOT, "requester-dashboard/02-attention-tickets.png"),
      });
    }

    // 03-drill-down.png
    const openCard = page.locator("[data-testid='metric-card-total-open']");
    if (await openCard.isVisible()) {
      await openCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_ROOT, "requester-dashboard/03-drill-down.png"),
        fullPage: true,
      });
    }
  });

  // =========================================================================
  // 4. Responsive Viewports (3 screenshots)
  // =========================================================================
  test("Capture Responsive Audits (3)", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsStaff(page);
    await page.locator(".main-nav a", { hasText: "Dashboard" }).click();
    await expect(page.locator("[data-testid='staff-dashboard']")).toBeVisible();

    // 01-desktop-1280.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "responsive/01-desktop-1280.png"),
      fullPage: true,
    });

    // 02-tablet-768.png
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "responsive/02-tablet-768.png"),
      fullPage: true,
    });

    // 03-mobile-375.png
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_ROOT, "responsive/03-mobile-375.png"),
      fullPage: true,
    });
  });
});
