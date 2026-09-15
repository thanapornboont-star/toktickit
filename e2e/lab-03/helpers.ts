import { Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const ARTIFACTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-03/screenshots");

export async function captureScreenshot(
  page: Page,
  projectName: string,
  subfolder: string,
  name: string
) {
  const dir = path.join(ARTIFACTS_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${projectName.toLowerCase()}-${name}.png`),
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
