import { test, expect } from "@playwright/test";
import { captureScreenshot, reseedDatabase } from "./helpers";

test.describe("E2E-03: Administrator User Management and Safeguards", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("Complete admin lifecycle: directory listing, user creation, duplicate check, self-deactivation guard, reset password, and access control", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Login as Administrator
    await page.goto("/#login");
    await page.locator("#login-email").fill("admin.boss@toktickit.local");
    await page.locator("#login-password").fill("AdminPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 2. Verify Admin navigation and User Management screen — 01-user-directory-desktop
    await expect(page.getByRole("heading", { name: "User Account Maintenance" })).toBeVisible();
    await expect(page.getByText("Administrator", { exact: true }).first()).toBeVisible();

    // Navigation isolation: Administrator has User Management only
    await expect(page.getByRole("link", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Tickets" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Create Ticket" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Ticket Queue" })).toBeHidden();

    await captureScreenshot(page, "04-admin", "01-user-directory-desktop");

    // 3. Search and filter users (AC-17) — 02-user-directory-search-filter
    await page.locator("#user-search-input").fill("Jennifer");
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();
    await expect(page.getByText("Michael Brown")).toBeHidden();
    await captureScreenshot(page, "04-admin", "02-user-directory-search-filter");

    // Clear search and filter by role
    await page.locator("#user-search-input").fill("");
    await page.locator("#role-filter-select").selectOption("IT_STAFF");
    await expect(page.getByText("Staff Alex")).toBeVisible();
    await expect(page.getByText("Jennifer Anderson")).toBeHidden();

    // Reset filter
    await page.locator("#role-filter-select").selectOption("");

    // 4. Create New User (AC-18) — 03-create-user-modal
    await page.getByRole("button", { name: "Add new user" }).click();
    await expect(page.getByRole("heading", { name: "Add New User Account" })).toBeVisible();

    await page.locator("#create-name").fill("Alice Test Staff");
    const uniqueEmail = `alice.staff.${Date.now()}@toktickit.local`;
    await page.locator("#create-email").fill(uniqueEmail);
    await page.locator("#create-role").selectOption("IT_STAFF");
    await page.locator("#create-password").fill("InitialPass123!");
    await captureScreenshot(page, "04-admin", "03-create-user-modal");

    await page.getByRole("button", { name: "Create User" }).click();
    await expect(page.locator(".alert-success")).toContainText("Alice Test Staff");
    const aliceRow = page.locator("tr", { hasText: uniqueEmail });
    await expect(aliceRow).toBeVisible();

    // 5. Duplicate Email Rejection (AC-19, BR-20)
    await page.getByRole("button", { name: "Add new user" }).click();
    await page.locator("#create-name").fill("Duplicate Alice");
    await page.locator("#create-email").fill(uniqueEmail);
    await page.locator("#create-role").selectOption("REQUESTER");
    await page.locator("#create-password").fill("InitialPass123!");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(page.locator(".modal .alert-danger")).toBeVisible();
    await expect(page.locator(".modal .alert-danger")).toContainText(/already in use|exists|duplicate/i);

    // Close modal
    await page.locator('.modal button:has-text("Cancel")').click();

    // 6. Admin Self-Deactivation Prevention Guard (AC-20, BR-21) — 04-edit-user-modal-self-lock
    const adminRow = page.locator("tr", { hasText: "admin.boss@toktickit.local" });
    await adminRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: /Edit User: Admin Boss/i })).toBeVisible();

    // Verify Active checkbox is disabled and warning is displayed
    await expect(page.locator("#edit-active")).toBeDisabled();
    await expect(page.getByTestId("self-deactivation-warning")).toBeVisible();
    await expect(page.getByTestId("self-deactivation-warning")).toContainText(
      "Cannot deactivate your own administrator account (BR-21)"
    );
    await captureScreenshot(page, "04-admin", "04-edit-user-modal-self-lock");

    // Close Edit modal
    await page.locator('.modal button:has-text("Cancel")').click();

    // 7. Edit User and Reset Initial Password (AC-22, BR-24) — 05-reset-password-modal
    await aliceRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: /Edit User: Alice Test Staff/i })).toBeVisible();

    // Reset password section
    await page
      .locator('.modal input[placeholder="New initial temporary password..."]')
      .fill("ResetPass123!");
    await page.getByRole("button", { name: "Reset Password" }).click();
    await expect(page.locator(".modal .alert-success")).toContainText(
      "Initial password set"
    );
    await captureScreenshot(page, "04-admin", "05-reset-password-modal");

    // Close edit modal
    await page.locator('.modal button:has-text("Cancel")').click();

    // Verify "Must Change" badge is displayed for Alice
    const updatedAliceRow = page.locator("tr", { hasText: uniqueEmail });
    await expect(updatedAliceRow.getByText("Must Change")).toBeVisible();

    // 8. Non-Admin Access Protection (AC-23, BR-10)
    // Sign out from Admin
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // Login as Requester
    await page.locator("#login-email").fill("jennifer.anderson@toktickit.local");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();

    // Direct access to /api/admin/users should return 403 Forbidden
    const forbiddenResponse = await page.evaluate(async () => {
      const token = sessionStorage.getItem("toktickit.token") || "";
      const res = await fetch("http://localhost:3000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return { status: res.status };
    });
    expect(forbiddenResponse.status).toBe(403);
  });
});
