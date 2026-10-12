import { Page, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const ARTIFACTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-04/screenshots");

export async function captureScreenshot(
  page: Page,
  folder: string,
  filename: string,
  viewport?: string
) {
  const dir = path.join(ARTIFACTS_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const suffix = viewport ? `-${viewport}` : "";
  await page.screenshot({
    path: path.join(dir, `${filename}${suffix}.png`),
    fullPage: true,
  });
}

export function reseedDatabase() {
  try {
    const serverDir = path.resolve(__dirname, "../../server");
    execSync("npx prisma db seed", { cwd: serverDir, stdio: "ignore" });
  } catch (error) {
    console.error("Failed to reseed database:", error);
  }
}

export async function ensureOnLoginScreen(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (e) {}

  await page.goto("/#login");
  await page.waitForTimeout(300);

  if (await page.locator("#login-email").isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }

  // If user is currently logged in, click Sign Out to reset auth and land on Login screen
  const signOutBtn = page.getByRole("button", { name: /sign out|logout/i });
  if (await signOutBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await signOutBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  if (await page.locator("#login-email").isVisible({ timeout: 1000 }).catch(() => false)) {
    return;
  }

  // If on Dev Requester selection screen, click "Sign In (Lab 3)"
  const devSignInBtn = page.getByRole("button", { name: /Sign In \(Lab 3\)/i });
  if (await devSignInBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await devSignInBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

export async function loginAsStaff(page: Page) {
  await ensureOnLoginScreen(page);
  await page.locator("#login-email").fill("staff.alex@toktickit.local");
  await page.locator("#login-password").fill("StaffPass123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible({ timeout: 10000 });
}

export async function loginAsRequester(page: Page) {
  await ensureOnLoginScreen(page);
  await page.locator("#login-email").fill("jennifer.anderson@toktickit.local");
  await page.locator("#login-password").fill("Password123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My IT Support Tickets" })).toBeVisible({ timeout: 10000 });
}
