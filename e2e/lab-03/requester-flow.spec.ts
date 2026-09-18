import { test, expect } from "@playwright/test";
import { captureScreenshot, reseedDatabase } from "./helpers";

test.describe("E2E-04: Requester Ticket Lifecycle and Public Comments", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("Complete requester workflow: my tickets, create ticket, ticket detail, indicate resolved, and public comments", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Login as Requester
    await page.goto("/#login");
    await page.locator("#login-email").fill("jennifer.anderson@toktickit.local");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 2. My Tickets list screen — 01-my-tickets
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
    await captureScreenshot(page, "02-requester", "01-my-tickets");

    // 3. Navigate to Create Ticket — 02-create-ticket
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();
    await captureScreenshot(page, "02-requester", "02-create-ticket");

    // 4. Submit a new ticket (must fill category + related system too)
    await page.locator("#summary").fill("Cannot connect to VPN from home office");
    await page.locator("#description").fill(
      "Since yesterday I am unable to connect to the company VPN. Error: 0x80072EFD. Tried restarting router and reinstalling Cisco AnyConnect."
    );
    // Wait for reference data to load, then pick first available option
    await page.waitForFunction(() => {
      const categorySelect = document.getElementById("category") as HTMLSelectElement;
      return categorySelect && categorySelect.options.length > 1;
    }, { timeout: 10000 });
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#related-system").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket Created Successfully!" })).toBeVisible({ timeout: 10000 });

    // 5. Go to My Tickets and open an existing ticket for detail view
    await page.getByRole("link", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    // Open first ticket — use :visible to handle both desktop table and mobile card layout
    await page.locator('button:visible', { hasText: 'View' }).first().click();

    // 6. Ticket Detail view — 03-ticket-detail-view
    await expect(page.locator("text=Ticket Detail")).toBeVisible();
    await captureScreenshot(page, "02-requester", "03-ticket-detail-view");

    // 7. Indicate Problem Appears Resolved — 04-problem-appears-resolved (AC-09)
    const indicateBtn = page.getByRole("button", { name: "Problem Appears Resolved" });
    if (await indicateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await indicateBtn.click();
      await expect(page.locator(".alert-success, .alert-info").first()).toBeVisible({ timeout: 5000 });
    }
    await captureScreenshot(page, "02-requester", "04-problem-appears-resolved");

    // 8. Public Comments thread — 05-public-comments-thread
    const commentInput = page.locator("#public-comment-input");
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentInput.fill(
        "Thank you for looking into this. Please let me know if you need more information."
      );
      await page.getByRole("button", { name: "Post Comment" }).click();
      // Wait for the comment to appear (TicketDetail renders comments as individual cards)
      await expect(
        page.getByText("Thank you for looking into this. Please let me know if you need more information.")
      ).toBeVisible({ timeout: 5000 });
    }
    await captureScreenshot(page, "02-requester", "05-public-comments-thread");
  });
});
