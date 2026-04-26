import { test, expect } from "@playwright/test";

test("loads, runs a sim at 4x speed, shows a winner toast", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Controls")).toBeVisible();

  await page.getByRole("button", { name: /Speed 4x/i }).click();

  await page.getByRole("button", { name: /^Start$/ }).click();

  const toast = page.locator("[data-sonner-toast]").filter({ hasText: /wins|Timeout/ });
  await expect(toast).toBeVisible({ timeout: 60_000 });
});
