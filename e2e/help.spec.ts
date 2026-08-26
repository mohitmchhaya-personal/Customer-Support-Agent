import { expect, test } from "@playwright/test";

test("root redirects to /help", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/help$/);
});

test("/help renders the placeholder page", async ({ page }) => {
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: /help & contact/i }),
  ).toBeVisible();
});
