import { execSync } from "child_process";

console.log("Running Playwright Lab 4 Visual QA Screenshot Automation...");
try {
  execSync("npx playwright test e2e/lab-04/capture-screenshots.spec.ts --project=Desktop", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✓ All 32 Lab 4 Evidence Screenshots captured successfully!");
} catch (error) {
  console.error("Error capturing screenshots:", error);
  process.exit(1);
}
