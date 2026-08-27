import { expect, test } from "@playwright/test";

test("root redirects to /help", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/help$/);
});

test("renders the help page with welcome message and suggestions", async ({
  page,
}) => {
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: "How can we help?" }),
  ).toBeVisible();
  await expect(page.getByText(/hi! i'm spreadbliss support/i)).toBeVisible();
  await expect(page.getByText("Suggested questions")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "How do I create an organization profile?" }),
  ).toBeVisible();
});

test("a suggested question submits and returns a grounded answer", async ({
  page,
}) => {
  await page.goto("/help");
  await page
    .getByRole("button", { name: "How do I manage my account?" })
    .click();
  await expect(page.getByLabel("SpreadBliss Support is typing")).toBeVisible();
  await expect(
    page.getByText("Based on: SpreadBliss Help Center · Account Settings"),
  ).toBeVisible();
});

test("blank messages cannot be sent", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  await page.getByLabel("Type your question").fill("   ");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("Enter submits and Shift+Enter inserts a line break", async ({ page }) => {
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("line one");
  await composer.press("Shift+Enter");
  await composer.pressSequentially("line two");
  await expect(composer).toHaveValue("line one\nline two");
  await composer.press("Enter");
  await expect(composer).toHaveValue("");
  await expect(page.getByText("line one")).toBeVisible();
});

test("send button disables while processing", async ({ page }) => {
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("How do I manage my account?");
  await composer.press("Enter");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("unsupported question collects email and acknowledges escalation", async ({
  page,
}) => {
  await page.goto("/help");
  await page
    .getByRole("button", { name: "I'm having a technical issue" })
    .click();
  const emailInput = page.getByLabel("Email address");
  await expect(emailInput).toBeVisible();

  await emailInput.fill("not-an-email");
  await page.getByRole("button", { name: "Send to support" }).click();
  await expect(
    page.getByText("Please enter a valid email address."),
  ).toBeVisible();

  await emailInput.fill("user@example.org");
  await page.getByRole("button", { name: "Send to support" }).click();
  await expect(page.getByText("Support request created")).toBeVisible();
  await expect(page.getByText("Awaiting support review")).toBeVisible();
  await expect(page.getByText("u•••@example.org")).toBeVisible();

  await page.getByRole("button", { name: "Ask another question" }).click();
  await expect(page.getByText("Support request created")).not.toBeVisible();
  await expect(page.getByText("Suggested questions")).toBeVisible();
});

test("failure trigger shows the customer-safe error state", async ({ page }) => {
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("my network is offline");
  await composer.press("Enter");
  await expect(
    page.getByText("We couldn't submit your question right now."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
