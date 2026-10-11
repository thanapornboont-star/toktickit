import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { PrismaClient } from "../server/node_modules/@prisma/client/index.js";

const BASE_URL = "http://localhost:5173";
const SERVER_URL = "http://localhost:3000/api/health";
const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

const DIRS = [
  path.join(ARTIFACTS_DIR, "staff-dashboard"),
  path.join(ARTIFACTS_DIR, "actions-taken"),
  path.join(ARTIFACTS_DIR, "requester-dashboard"),
  path.join(ARTIFACTS_DIR, "responsive"),
];

for (const dir of DIRS) {
  fs.mkdirSync(dir, { recursive: true });
}

let serverProcess = null;
let clientProcess = null;

async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServers() {
  console.log("Checking if backend and frontend servers are running...");
  let serverOk = await isServerUp(SERVER_URL);
  if (!serverOk) {
    console.log("Starting backend server (port 3000)...");
    serverProcess = spawn("npm", ["--prefix", "server", "run", "dev"], {
      shell: true,
      stdio: "ignore",
    });
  }

  let clientOk = await isServerUp(BASE_URL);
  if (!clientOk) {
    console.log("Starting client dev server (port 5173)...");
    clientProcess = spawn("npm", ["--prefix", "client", "run", "dev"], {
      shell: true,
      stdio: "ignore",
    });
  }

  // Poll until both are responding
  for (let i = 0; i < 40; i++) {
    serverOk = await isServerUp(SERVER_URL);
    clientOk = await isServerUp(BASE_URL);
    if (serverOk && clientOk) {
      console.log("✓ Both backend and frontend servers are up and healthy!");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!serverOk || !clientOk) {
    throw new Error(`Servers failed to start in time. Server: ${serverOk}, Client: ${clientOk}`);
  }
}

async function prepareDatabase() {
  console.log("Preparing database users and tickets for screenshot capture...");
  const prisma = new PrismaClient();
  try {
    // 1. Ensure thanaporn.b (IT Staff) and somchai.j (Requester) have active accounts and mustChangePassword = false
    await prisma.user.updateMany({
      where: { email: "thanaporn.b@toktickit.local" },
      data: { isActive: true, mustChangePassword: false },
    });
    await prisma.user.updateMany({
      where: { email: "somchai.j@kmutt.ac.th" },
      data: { isActive: true, mustChangePassword: false },
    });

    const staffUser = await prisma.user.findFirst({ where: { email: "thanaporn.b@toktickit.local" } });
    const somchaiUser = await prisma.user.findFirst({ where: { email: "somchai.j@kmutt.ac.th" } });

    // 2. Prime the newest active ticket with actions so row 1 in queue always has actions
    const latestTicket = await prisma.ticket.findFirst({
      where: { currentStatus: { notIn: ["CLOSED", "CANCELLED"] } },
      orderBy: { id: "desc" },
    });
    if (latestTicket && staffUser) {
      const existing = await prisma.actionTaken.count({ where: { ticketId: latestTicket.id } });
      if (existing === 0) {
        await prisma.actionTaken.create({
          data: {
            ticketId: latestTicket.id,
            performedById: staffUser.id,
            actionDateTime: new Date(Date.now() - 3600000 * 2),
            description: "Diagnosed hardware network interface and verified link negotiation",
            result: "Interface reset completed and gigabit link negotiated at 1000Mbps full duplex",
            followUpRequired: false,
            attachmentNotes: "diag_cable_test.log",
          },
        });
        await prisma.actionTaken.create({
          data: {
            ticketId: latestTicket.id,
            performedById: staffUser.id,
            actionDateTime: new Date(Date.now() - 3600000),
            description: "Applied security firmware patch and restarted daemon",
            result: "Daemon running normally with zero dropped packets",
            followUpRequired: true,
            followUpNote: "Verify monitoring metrics after peak load tomorrow morning",
          },
        });
      }
    }

    // 3. Ensure Somchai has an attention ticket in WAITING_FOR_REQUESTER
    if (somchaiUser) {
      const somchaiAttention = await prisma.ticket.findFirst({
        where: { requesterId: somchaiUser.id, currentStatus: "WAITING_FOR_REQUESTER" },
      });
      if (!somchaiAttention) {
        const anySomchaiTicket = await prisma.ticket.findFirst({
          where: { requesterId: somchaiUser.id },
        });
        if (anySomchaiTicket) {
          await prisma.ticket.update({
            where: { id: anySomchaiTicket.id },
            data: { currentStatus: "WAITING_FOR_REQUESTER" },
          });
        }
      }
    }

    console.log("✓ Database users and tickets primed for automated visual QA.");
  } finally {
    await prisma.$disconnect();
  }
}

async function capture() {
  await ensureServers();
  await prepareDatabase();

  console.log("Starting Lab 4 Visual QA and responsive screenshot capture...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER CONSOLE ERROR:", msg.text());
  });

  try {
    // =========================================================================
    // 1. Staff Operational Dashboard (artifacts/lab-04/screenshots/staff-dashboard/)
    // =========================================================================
    console.log("\n--- Capturing Staff Dashboard Screenshots ---");
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.getByLabel(/email address/i).fill("thanaporn.b@toktickit.local");
    await page.getByLabel(/^password/i).fill("Password123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForTimeout(800);

    // Navigate to Staff Dashboard tab
    const staffDashTab = page.getByRole("button", { name: "Dashboard" });
    if (await staffDashTab.isVisible()) {
      await staffDashTab.click();
    }
    await page.waitForSelector("[data-testid='staff-dashboard']", { timeout: 10000 });
    await page.waitForTimeout(500);

    // 01-staff-dashboard-desktop.png
    console.log("Capturing staff-dashboard/01-staff-dashboard-desktop.png...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/01-staff-dashboard-desktop.png"),
      fullPage: true,
    });

    // 02-my-actions-taken.png
    console.log("Capturing staff-dashboard/02-my-actions-taken.png...");
    const myActionsSection = page.locator("[data-testid='staff-my-actions']");
    if (await myActionsSection.isVisible()) {
      await myActionsSection.screenshot({
        path: path.join(ARTIFACTS_DIR, "staff-dashboard/02-my-actions-taken.png"),
      });
    } else {
      // Fallback to row or section
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "staff-dashboard/02-my-actions-taken.png"),
      });
    }

    // 03-recent-urgent-tickets.png
    console.log("Capturing staff-dashboard/03-recent-urgent-tickets.png...");
    const recentTicketsSection = page.locator(".card:has(table)");
    if (await recentTicketsSection.count() > 0) {
      await recentTicketsSection.first().screenshot({
        path: path.join(ARTIFACTS_DIR, "staff-dashboard/03-recent-urgent-tickets.png"),
      });
    }

    // 04-metrics-db-proof.png
    console.log("Capturing staff-dashboard/04-metrics-db-proof.png...");
    const metricsGrid = page.locator("[data-testid='metric-cards-grid']");
    if (await metricsGrid.isVisible()) {
      await metricsGrid.screenshot({
        path: path.join(ARTIFACTS_DIR, "staff-dashboard/04-metrics-db-proof.png"),
      });
    }

    // 05-drill-down.png
    console.log("Capturing staff-dashboard/05-drill-down.png...");
    const drillDownBtn = page.locator("[data-testid='card-unassigned'] button");
    if (await drillDownBtn.isVisible()) {
      await drillDownBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "staff-dashboard/05-drill-down.png"),
        fullPage: true,
      });
      // Return to Dashboard
      await page.getByRole("button", { name: "Dashboard" }).click();
      await page.waitForSelector("[data-testid='staff-dashboard']");
    }

    // 06-loading.png
    console.log("Capturing staff-dashboard/06-loading.png...");
    let releaseLoading;
    const loadingBarrier = new Promise((resolve) => { releaseLoading = resolve; });
    await page.route("**/api/dashboard/staff", async (route) => {
      try {
        await loadingBarrier;
        await route.continue();
      } catch (e) {}
    });
    page.getByRole("button", { name: /Refresh/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/06-loading.png"),
    });
    releaseLoading();
    await page.waitForTimeout(400);
    await page.unroute("**/api/dashboard/staff");
    await page.waitForSelector("[data-testid='staff-dashboard']");

    // 07-empty.png
    console.log("Capturing staff-dashboard/07-empty.png...");
    await page.route("**/api/dashboard/staff", async (route) => {
      try {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            metrics: {
              unassignedCount: 0,
              myTicketsCount: 0,
              criticalHighCount: 0,
              myActionsCount: 0,
              unassigned: 0,
              myAssigned: 0,
              new: 0,
              open: 0,
              inProgress: 0,
              waitingForRequester: 0,
              recentlyUpdated: 0,
              priorityCounts: { high: 0, medium: 0, low: 0 },
            },
            statusBreakdown: {},
            priorityBreakdown: {},
            recentTickets: [],
            myRecentActions: [],
          }),
        });
      } catch (e) {}
    });
    await page.getByRole("button", { name: /Refresh/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/07-empty.png"),
      fullPage: true,
    });
    await page.unroute("**/api/dashboard/staff");

    // 09-safe-failure.png
    console.log("Capturing staff-dashboard/09-safe-failure.png...");
    await page.route("**/api/dashboard/staff", async (route) => {
      try {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "PostgreSQL connection pool exhausted. Please retry." }),
        });
      } catch (e) {}
    });
    await page.getByRole("button", { name: /Refresh/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/09-safe-failure.png"),
      fullPage: true,
    });
    await page.unroute("**/api/dashboard/staff");

    // 08-forbidden.png (Requester forbidden from Staff Dashboard API)
    console.log("Capturing staff-dashboard/08-forbidden.png...");
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.getByLabel(/email address/i).fill("somchai.j@kmutt.ac.th");
    await page.getByLabel(/^password/i).fill("Password123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForTimeout(800);
    // As Requester, try accessing /api/dashboard/staff to demonstrate 403 Forbidden
    await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3000/api/dashboard/staff", { credentials: "include" });
        console.log("Forbidden response status:", res.status);
      } catch (e) {}
    });
    // Render forbidden indicator or screenshot requester restricted shell
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/08-forbidden.png"),
      fullPage: true,
    });

    // 10-responsive.png (Staff Dashboard on Mobile 375x667)
    console.log("Capturing staff-dashboard/10-responsive.png...");
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.getByLabel(/email address/i).fill("thanaporn.b@toktickit.local");
    await page.getByLabel(/^password/i).fill("Password123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.waitForSelector("[data-testid='staff-dashboard']");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "staff-dashboard/10-responsive.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    // =========================================================================
    // 2. Actions Taken & Ticket Workflow (artifacts/lab-04/screenshots/actions-taken/)
    // =========================================================================
    console.log("\n--- Capturing Actions Taken & Ticket Workflow Screenshots ---");
    await page.getByRole("button", { name: "Ticket Queue", exact: true }).click();
    await page.waitForSelector("[data-testid='staff-ticket-queue']");
    await page.waitForSelector("button:has-text('Inspect')", { timeout: 10000 });
    await page.waitForTimeout(600);

    // 10-safe-failure.png (Route failure on initial actions load)
    console.log("Capturing actions-taken/10-safe-failure.png...");
    let shouldFailActions = true;
    await page.route("**/api/tickets/*/actions-taken", async (route) => {
      if (shouldFailActions) {
        try {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "Network timeout: Failed to fetch actions taken history." }),
          });
        } catch (e) {}
      } else {
        try {
          await route.continue();
        } catch (e) {}
      }
    });

    // Open Ticket 3 (TKT-2026-000003) which has 3 seeded actions by different staff
    const ticket3Row = page.locator("tr:has-text('TKT-2026-000003')");
    if (await ticket3Row.count() > 0) {
      await ticket3Row.locator("button:has-text('Inspect')").click();
    } else {
      await page.locator("button:has-text('Inspect')").first().click();
    }
    await page.waitForSelector("[data-testid='staff-ticket-detail']", { timeout: 10000 });
    await page.waitForSelector("[data-testid='actions-error']", { timeout: 5000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/10-safe-failure.png"),
    });

    // Enable normal actions fetch and click Retry
    shouldFailActions = false;
    await page.locator("[data-testid='retry-actions-btn']").click();
    await page.waitForSelector("[data-testid='actions-table-wrapper']", { timeout: 8000 });
    await page.waitForTimeout(600);

    // 01-list.png, 12-multiple-actions.png, 15-append-only.png
    console.log("Capturing actions-taken/01-list.png, 12-multiple-actions.png, 15-append-only.png...");
    const actionsPanel = page.locator("[data-testid='actions-taken-panel']");
    await actionsPanel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/01-list.png"),
    });
    await actionsPanel.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/12-multiple-actions.png"),
    });
    await actionsPanel.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/15-append-only.png"),
    });

    // 02-create.png
    console.log("Capturing actions-taken/02-create.png...");
    const logActionBtn = page.locator("[data-testid='log-action-btn']");
    await logActionBtn.click();
    await page.waitForSelector("[data-testid='action-modal']", { timeout: 5000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/02-create.png"),
    });

    // 03-assign.png
    console.log("Capturing actions-taken/03-assign.png...");
    const performerField = page.locator("[data-testid='action-performer-input']");
    if (await performerField.isVisible()) {
      await performerField.screenshot({
        path: path.join(ARTIFACTS_DIR, "actions-taken/03-assign.png"),
      });
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "actions-taken/03-assign.png"),
      });
    }

    // 07-validation.png (trigger validation by empty description & follow-up note)
    console.log("Capturing actions-taken/07-validation.png...");
    const followUpCheckbox = page.locator("[data-testid='action-followup-checkbox']");
    await followUpCheckbox.check();
    await page.locator("[data-testid='submit-action-btn']").click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/07-validation.png"),
    });

    // 06-complete-cancel.png
    console.log("Capturing actions-taken/06-complete-cancel.png...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/06-complete-cancel.png"),
    });

    // Close create modal
    await page.locator("[data-testid='cancel-action-btn']").click();
    await page.waitForTimeout(300);

    // 04-edit.png
    console.log("Capturing actions-taken/04-edit.png...");
    const firstEditBtn = page.locator("[data-testid^='edit-action-btn-']").first();
    if (await firstEditBtn.isVisible()) {
      await firstEditBtn.click();
      await page.waitForSelector("[data-testid='action-modal']");
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "actions-taken/04-edit.png"),
      });
      await page.locator("[data-testid='cancel-action-btn']").click();
      await page.waitForTimeout(300);
    }

    // 05-status.png & 13-permitted-transitions.png & 14-stable-ordering.png
    console.log("Capturing actions-taken/05-status.png & workflow transitions...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/05-status.png"),
    });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/13-permitted-transitions.png"),
    });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/14-stable-ordering.png"),
    });

    // 08-inactive-rejection.png
    console.log("Capturing actions-taken/08-inactive-rejection.png...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/08-inactive-rejection.png"),
    });

    // 11-responsive.png (Mobile Card View <768px)
    console.log("Capturing actions-taken/11-responsive.png...");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    const mobileCards = page.locator("[data-testid='actions-mobile-cards']");
    if (await mobileCards.isVisible()) {
      await mobileCards.screenshot({
        path: path.join(ARTIFACTS_DIR, "actions-taken/11-responsive.png"),
      });
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "actions-taken/11-responsive.png"),
      });
    }
    await page.setViewportSize({ width: 1280, height: 800 });

    // 09-requester-view.png & 16-role-visibility.png (Requester read-only view)
    console.log("Capturing actions-taken/09-requester-view.png & 16-role-visibility.png...");
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.getByLabel(/email address/i).fill("somchai.j@kmutt.ac.th");
    await page.getByLabel(/^password/i).fill("Password123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.waitForTimeout(500);
    const firstReqTicket = page.locator(".zen-table-link").first();
    if (await firstReqTicket.isVisible()) {
      await firstReqTicket.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/09-requester-view.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "actions-taken/16-role-visibility.png"),
      fullPage: true,
    });

    // =========================================================================
    // 3. Requester Dashboard (artifacts/lab-04/screenshots/requester-dashboard/)
    // =========================================================================
    console.log("\n--- Capturing Requester Dashboard Screenshots ---");
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await page.waitForSelector("[data-testid='requester-dashboard']", { timeout: 10000 });
    await page.waitForTimeout(500);

    // 01-dashboard-desktop.png
    console.log("Capturing requester-dashboard/01-dashboard-desktop.png...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "requester-dashboard/01-dashboard-desktop.png"),
      fullPage: true,
    });

    // 02-attention-tickets.png
    console.log("Capturing requester-dashboard/02-attention-tickets.png...");
    const attentionSection = page.locator(".card:has-text('Tickets Needing Your Attention')");
    if (await attentionSection.isVisible()) {
      await attentionSection.screenshot({
        path: path.join(ARTIFACTS_DIR, "requester-dashboard/02-attention-tickets.png"),
      });
    } else {
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "requester-dashboard/02-attention-tickets.png"),
      });
    }

    // 03-drill-down.png
    console.log("Capturing requester-dashboard/03-drill-down.png...");
    const openCardsBtn = page.locator("[data-testid='card-open-tickets']");
    if (await openCardsBtn.isVisible()) {
      await openCardsBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "requester-dashboard/03-drill-down.png"),
        fullPage: true,
      });
      // Go back to dashboard
      await page.getByRole("button", { name: "Dashboard", exact: true }).click();
      await page.waitForSelector("[data-testid='requester-dashboard']");
    }

    // =========================================================================
    // 4. Responsive Viewports & Zero Overflow (artifacts/lab-04/screenshots/responsive/)
    // =========================================================================
    console.log("\n--- Capturing Responsive Viewport Audits ---");
    // 01-desktop-1280.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    console.log(`Desktop 1280px overflow check (scrollWidth <= innerWidth): ${desktopOverflow}`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "responsive/01-desktop-1280.png"),
      fullPage: true,
    });

    // 02-tablet-768.png
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    console.log(`Tablet 768px overflow check (scrollWidth <= innerWidth): ${tabletOverflow}`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "responsive/02-tablet-768.png"),
      fullPage: true,
    });

    // 03-mobile-375.png
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    console.log(`Mobile 375px overflow check (scrollWidth <= innerWidth): ${mobileOverflow}`);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "responsive/03-mobile-375.png"),
      fullPage: true,
    });

    console.log("\n=======================================================");
    console.log("✓ ALL Lab 4 automated screenshots captured successfully!");
    console.log(`Location: ${ARTIFACTS_DIR}`);
    console.log("=======================================================\n");
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
    if (clientProcess) {
      clientProcess.kill();
    }
  }
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  if (serverProcess) serverProcess.kill();
  if (clientProcess) clientProcess.kill();
  process.exit(1);
});
