import { Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const ARTIFACTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-03/screenshots");

/**
 * Capture a screenshot into a numbered semantic folder (matches partner PR #51 structure).
 *
 * @param page      - Playwright Page
 * @param folder    - Numbered folder: "01-auth" | "02-requester" | "03-staff" | "04-admin" | "05-responsive"
 * @param filename  - Semantic name without extension, e.g. "01-login-screen"
 * @param viewport  - Optional viewport suffix appended for responsive folder ("desktop" | "tablet" | "mobile")
 */
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
