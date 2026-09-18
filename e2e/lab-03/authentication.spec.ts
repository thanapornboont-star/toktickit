import { test, expect } from "@playwright/test";
import { captureScreenshot, reseedDatabase } from "./helpers";

test.describe("E2E-01: Authentication, Password Lifecycle, and Session Management", () => {
  test.beforeEach(async () => {
    reseedDatabase();
  });

  test("AC-01 & AC-05: Valid requester login, shell isolation, logout, and back-button invalidation", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Navigate to login — 01-login-screen
    await page.goto("/#login");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    await captureScreenshot(page, "01-auth", "01-login-screen");

    // 2. Fill valid requester credentials
    await page.locator("#login-email").fill("jennifer.anderson@toktickit.local");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 3. Verify landing on Authenticated Shell
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();
    await expect(page.getByText("Requester", { exact: true }).first()).toBeVisible();

    // Verify role isolation: Requester should see My Tickets and Create Ticket, but NOT Ticket Queue or User Management
    await expect(page.getByRole("link", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create Ticket" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ticket Queue" })).toBeHidden();
    await expect(page.getByRole("link", { name: "User Management" })).toBeHidden();

    // 4. Logout (AC-05)
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 5. Verify session invalidation and back-navigation protection
    await page.goBack();
    // Should NOT restore protected shell; should stay on login or selector
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeHidden();
  });

  test("AC-02: Invalid credentials returns safe error banner without user enumeration", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    await page.goto("/#login");

    // Leave fields empty and attempt submit — 02-login-validation-empty
    await page.getByRole("button", { name: "Sign In" }).click();
    await captureScreenshot(page, "01-auth", "02-login-validation-empty");

    // Now enter invalid credentials — 03-login-invalid-credentials
    await page.locator("#login-email").fill("nonexistent.user@toktickit.local");
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Generic error message matching BR-02
    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText("Invalid email or password");
    await captureScreenshot(page, "01-auth", "03-login-invalid-credentials");
  });

  test("AC-03: Deactivated account is rejected with forbidden notification", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    await page.goto("/#login");
    await page.locator("#login-email").fill("alex.inactive@toktickit.local");
    await page.locator("#login-password").fill("Password123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText(/deactivated|disabled/i);
  });

  test("AC-04: Mandatory first password change, checklist validation, and re-login with new password", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Login with initial password
    await page.goto("/#login");
    await page.locator("#login-email").fill("new.user@toktickit.local");
    await page.locator("#login-password").fill("Initial123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 2. Land on mandatory Change Password screen — 04-change-password-screen
    await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
    await expect(
      page.getByText("You must change your initial password before accessing TokTickIT.")
    ).toBeVisible();
    await captureScreenshot(page, "01-auth", "04-change-password-screen");

    // 3. Test checklist interaction: fill new password and confirm
    await page.locator("#current-password").fill("Initial123!");
    await page.locator("#new-password").fill("BrandNewPass123!");
    await page.locator("#confirm-password").fill("BrandNewPass123!");

    // Verify all checklist items show checked — 05-password-complexity-feedback
    await expect(page.locator("li", { hasText: "Be at least 8 characters" })).toContainText("✓");
    await expect(page.locator("li", { hasText: "Include uppercase and lowercase letters" })).toContainText("✓");
    await expect(page.locator("li", { hasText: "Include a number and a special character" })).toContainText("✓");
    await captureScreenshot(page, "01-auth", "05-password-complexity-feedback");

    // 4. Submit change password
    await page.getByRole("button", { name: "Continue" }).click();

    // 5. Land directly in Authenticated Shell
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
    await expect(page.getByText("New Requester")).toBeVisible();

    // 6. Logout and verify login with new password
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // Old password should fail
    await page.locator("#login-email").fill("new.user@toktickit.local");
    await page.locator("#login-password").fill("Initial123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator(".alert-danger")).toBeVisible();

    // New password succeeds
    await page.locator("#login-password").fill("BrandNewPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible();
  });
});
