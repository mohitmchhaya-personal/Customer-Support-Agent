import { expect, test, type Page } from "@playwright/test";

interface ExecutionScript {
  /** Statuses returned by successive polls; the last entry repeats. */
  polls: Array<Record<string, unknown>>;
}

interface MockOptions {
  executions: ExecutionScript[];
  failSubmits?: number;
  submitDelayMs?: number;
}

interface RecordedSubmission {
  body: Record<string, unknown>;
  ticketId: string;
  executionId: string;
}

/**
 * Mocks the normalized internal support API so browser tests are
 * deterministic and never reach Lyzr.
 */
async function mockSupportApi(
  page: Page,
  options: MockOptions,
): Promise<RecordedSubmission[]> {
  const submissions: RecordedSubmission[] = [];
  const pollCounts = new Map<string, number>();
  const scripts = new Map<string, ExecutionScript>();
  let submitCount = 0;
  let failSubmits = options.failSubmits ?? 0;

  await page.route("**/api/support/messages", async (route) => {
    if (options.submitDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.submitDelayMs),
      );
    }
    if (failSubmits > 0) {
      failSubmits -= 1;
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The support service is temporarily unavailable.",
        }),
      });
      return;
    }
    const script = options.executions[submitCount];
    if (!script) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "No scripted execution." }),
      });
      return;
    }
    submitCount += 1;
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const executionId = `exec-${submitCount}`;
    const ticketId =
      typeof body.ticketId === "string"
        ? body.ticketId
        : `SB-TICKET${submitCount}00`;
    scripts.set(executionId, script);
    submissions.push({ body, ticketId, executionId });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ status: "processing", ticketId, executionId }),
    });
  });

  await page.route("**/api/support/executions/*", async (route) => {
    const executionId = route
      .request()
      .url()
      .split("/")
      .pop() as string;
    const script = scripts.get(executionId);
    if (!script) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Execution not found." }),
      });
      return;
    }
    const count = pollCounts.get(executionId) ?? 0;
    pollCounts.set(executionId, count + 1);
    const payload = script.polls[Math.min(count, script.polls.length - 1)];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  return submissions;
}

const ANSWERED = {
  status: "answered",
  message:
    "You can manage your account from the account menu in the top-right of SpreadBliss.",
  sources: ["SpreadBliss Help Center · Account Settings"],
};

const NEEDS_EMAIL = {
  status: "needs_email",
  message:
    "I've received your question, but it needs review by our support team. Please provide your email address so we can send you the outcome.",
};

const AWAITING_REVIEW = {
  status: "awaiting_human_review",
  message: "Sent to review.",
};

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

test("a question submits, polls and returns a grounded answer with sources", async ({
  page,
}) => {
  await mockSupportApi(page, {
    executions: [{ polls: [{ status: "processing" }, ANSWERED] }],
  });
  await page.goto("/help");
  await page
    .getByRole("button", { name: "How do I manage my account?" })
    .click();
  await expect(page.getByLabel("SpreadBliss Support is typing")).toBeVisible();
  await expect(
    page.getByText("Based on: SpreadBliss Help Center · Account Settings"),
  ).toBeVisible({ timeout: 15_000 });
});

test("blank messages cannot be sent", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  await page.getByLabel("Type your question").fill("   ");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("send button disables while processing", async ({ page }) => {
  await mockSupportApi(page, {
    executions: [{ polls: [{ status: "processing" }, ANSWERED] }],
  });
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("How do I manage my account?");
  await composer.press("Enter");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("rapid duplicate clicks submit only once", async ({ page }) => {
  const submissions = await mockSupportApi(page, {
    executions: [
      { polls: [ANSWERED] },
      { polls: [ANSWERED] },
      { polls: [ANSWERED] },
    ],
    submitDelayMs: 300,
  });
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("How do I manage my account?");
  const send = page.getByRole("button", { name: "Send message" });
  await send.click();
  await send.click({ force: true }).catch(() => {});
  await send.click({ force: true }).catch(() => {});
  await expect(
    page.getByText("Based on: SpreadBliss Help Center · Account Settings"),
  ).toBeVisible({ timeout: 15_000 });
  expect(submissions).toHaveLength(1);
  await expect(page.getByText("How do I manage my account?")).toHaveCount(1);
});

test("email-required flow validates, resubmits with the same ticket and acknowledges", async ({
  page,
}) => {
  const submissions = await mockSupportApi(page, {
    executions: [{ polls: [NEEDS_EMAIL] }, { polls: [AWAITING_REVIEW] }],
  });
  await page.goto("/help");
  await page
    .getByRole("button", { name: "I'm having a technical issue" })
    .click();
  const emailInput = page.getByLabel("Email address");
  await expect(emailInput).toBeVisible({ timeout: 15_000 });

  await emailInput.fill("not-an-email");
  await page.getByRole("button", { name: "Send to support" }).click();
  await expect(
    page.getByText("Please enter a valid email address."),
  ).toBeVisible();
  expect(submissions).toHaveLength(1);

  await emailInput.fill("user@example.org");
  await page.getByRole("button", { name: "Send to support" }).click();
  await expect(page.getByText("Support request created")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText(
      "Thanks—your question has been received and sent to a SpreadBliss support specialist. We'll email you after it has been reviewed.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Awaiting support review")).toBeVisible();
  await expect(page.getByText(submissions[0].ticketId)).toBeVisible();
  await expect(page.getByText("u•••@example.org")).toBeVisible();
  await expect(page.getByText("user@example.org")).toHaveCount(0);

  expect(submissions).toHaveLength(2);
  expect(submissions[1].body.ticketId).toBe(submissions[0].ticketId);
  expect(submissions[1].body.sessionId).toBe(submissions[0].body.sessionId);
  expect(submissions[1].body.customerEmail).toBe("user@example.org");
  expect(submissions[1].body.message).toBe(submissions[0].body.message);

  const localStorageKeys = await page.evaluate(() =>
    Object.keys(window.localStorage),
  );
  expect(localStorageKeys).toHaveLength(0);

  await page.getByRole("button", { name: "Ask another question" }).click();
  await expect(page.getByText("Support request created")).not.toBeVisible();
  await expect(page.getByText("Suggested questions")).toBeVisible();
});

test("a failed submission shows the customer-safe error and retry recovers", async ({
  page,
}) => {
  const submissions = await mockSupportApi(page, {
    executions: [{ polls: [ANSWERED] }],
    failSubmits: 1,
  });
  await page.goto("/help");
  const composer = page.getByLabel("Type your question");
  await composer.fill("How do I manage my account?");
  await composer.press("Enter");
  await expect(
    page.getByText("We couldn't submit your question right now."),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByText("Based on: SpreadBliss Help Center · Account Settings"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("How do I manage my account?")).toHaveCount(1);
  expect(submissions).toHaveLength(1);
});

test("the chat remains usable at mobile width", async ({ page }) => {
  await mockSupportApi(page, {
    executions: [{ polls: [ANSWERED] }],
  });
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: "How can we help?" }),
  ).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalScroll).toBe(false);

  const composer = page.getByLabel("Type your question");
  await composer.fill("How do I manage my account?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("Based on: SpreadBliss Help Center · Account Settings"),
  ).toBeVisible({ timeout: 15_000 });
});
