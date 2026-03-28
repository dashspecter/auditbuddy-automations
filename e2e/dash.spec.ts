/**
 * E2E tests for Dash Command Center.
 * Run with: npx playwright test
 * Requires: PLAYWRIGHT_BASE_URL env var pointing to a running instance.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

test.describe("Dash Command Center", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in with test credentials
    const email = process.env.TEST_USER_EMAIL || "test@example.com";
    const password = process.env.TEST_USER_PASSWORD || "testpassword";
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('[type="email"]', email);
    await page.fill('[type="password"]', password);
    await page.click('[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
  });

  test("Dash panel opens and shows welcome message", async ({ page }) => {
    // Open Dash panel
    await page.click('button:has-text("Dash")');
    await expect(page.getByText("Dash Command Center")).toBeVisible();
    await expect(page.getByText("Try asking")).toBeVisible();
  });

  test("suggested questions are clickable", async ({ page }) => {
    await page.click('button:has-text("Dash")');
    await page.waitForSelector("text=Try asking");
    const firstSuggestion = page.locator(".grid > button").first();
    const questionText = await firstSuggestion.textContent();
    expect(questionText).toBeTruthy();
    await firstSuggestion.click();
    // Should start loading
    await expect(page.getByText("Understanding your request...")).toBeVisible({ timeout: 5_000 });
  });

  test("can type and send a read query", async ({ page }) => {
    await page.click('button:has-text("Dash")');
    await page.waitForSelector("text=Try asking");
    const input = page.locator("textarea, input[type='text']").first();
    await input.fill("What can you do?");
    await input.press("Enter");
    // Should see loading indicator
    await expect(page.getByText(/Understanding|Looking up|Processing|Preparing/)).toBeVisible({ timeout: 5_000 });
    // Should eventually get a response
    await expect(page.locator(".prose, [class*='assistant']")).toBeVisible({ timeout: 60_000 });
  });

  test("action preview card appears for write commands", async ({ page }) => {
    await page.goto(`${BASE_URL}/dash`);
    const input = page.locator("textarea").first();
    await input.fill("Create a shift for tomorrow at 09:00-17:00");
    await input.press("Enter");
    // Action preview card should appear
    await expect(page.getByText(/Approve|Preview|Draft/i)).toBeVisible({ timeout: 30_000 });
  });

  test("undo countdown appears after approving action", async ({ page }) => {
    await page.goto(`${BASE_URL}/dash`);
    const input = page.locator("textarea").first();
    await input.fill("Create a test shift for tomorrow at 14:00-16:00 at the first location");
    await input.press("Enter");
    // Wait for approval card
    await page.waitForSelector("text=Approve", { timeout: 30_000 });
    await page.click("text=Approve");
    // Countdown should appear
    await expect(page.getByText(/Executing in \d+s/)).toBeVisible({ timeout: 5_000 });
    // Undo button should appear
    await expect(page.getByRole("button", { name: /Undo/i })).toBeVisible();
  });

  test("session history shows past sessions", async ({ page }) => {
    await page.goto(`${BASE_URL}/dash`);
    // Click history button
    await page.click('[title="Session history"], button:has-text("History")');
    await expect(page.getByText(/Session|conversation|No sessions/i)).toBeVisible({ timeout: 5_000 });
  });
});
