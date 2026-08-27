import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  ANSWERED,
  AWAITING_REVIEW,
  FAILED,
  MockSupportApiClient,
  NEEDS_EMAIL,
  PROCESSING,
} from "@/test/mock-support-client";
import { SupportChat } from "./SupportChat";

function setup(client: MockSupportApiClient, maxPollAttempts = 5) {
  const user = userEvent.setup();
  const view = render(
    <SupportChat
      client={client}
      pollIntervalMs={5}
      maxPollAttempts={maxPollAttempts}
    />,
  );
  return { user, view };
}

async function submitToNeedsEmail(client: MockSupportApiClient) {
  client.enqueueExecution([NEEDS_EMAIL]);
  const { user, view } = setup(client);
  await user.click(
    screen.getByRole("button", { name: "I'm having a technical issue" }),
  );
  const emailInput = await screen.findByLabelText(/email address/i);
  return { user, view, emailInput };
}

describe("SupportChat", () => {
  it("shows the welcome message and suggested questions", () => {
    setup(new MockSupportApiClient());
    expect(screen.getByText(/hi! i'm spreadbliss support/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "How do I create an organization profile?",
      }),
    ).toBeInTheDocument();
  });

  it("disables send for blank input", () => {
    setup(new MockSupportApiClient());
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("submits, polls and shows a grounded answer with sources", async () => {
    const client = new MockSupportApiClient().enqueueExecution([
      PROCESSING,
      ANSWERED,
    ]);
    const { user } = setup(client);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "How do I manage my account?{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/SpreadBliss Help Center · Account Settings/),
    ).toBeInTheDocument();
    expect(client.submissions).toHaveLength(1);
    expect(client.submissions[0].request).toMatchObject({
      message: "How do I manage my account?",
    });
    expect(client.pollCounts.get("exec-1")).toBe(2);
  });

  it("shows the email form when the response requires an email", async () => {
    const { emailInput } = await submitToNeedsEmail(new MockSupportApiClient());
    expect(emailInput).toBeInTheDocument();
  });

  it("rejects an invalid email client-side without submitting", async () => {
    const client = new MockSupportApiClient();
    const { user, emailInput } = await submitToNeedsEmail(client);

    await user.type(emailInput, "not-an-email");
    await user.click(screen.getByRole("button", { name: /send to support/i }));
    expect(
      screen.getByText(/please enter a valid email address/i),
    ).toBeInTheDocument();
    expect(client.submissions).toHaveLength(1);
  });

  it("resubmits with the same ticket and session, masks the email, and acknowledges escalation", async () => {
    const client = new MockSupportApiClient();
    const { user, emailInput } = await submitToNeedsEmail(client);
    client.enqueueExecution([AWAITING_REVIEW]);

    await user.type(emailInput, "user@example.org");
    await user.click(screen.getByRole("button", { name: /send to support/i }));

    await waitFor(() =>
      expect(screen.getByText(/support request created/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        /thanks—your question has been received and sent to a spreadbliss support specialist/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/awaiting support review/i)).toBeInTheDocument();

    expect(client.submissions).toHaveLength(2);
    const [first, second] = client.submissions;
    expect(second.request.message).toBe(first.request.message);
    expect(second.request.sessionId).toBe(first.request.sessionId);
    expect(second.request.ticketId).toBe(first.response.ticketId);
    expect(second.request.customerEmail).toBe("user@example.org");

    expect(screen.getByText(first.response.ticketId)).toBeInTheDocument();
    expect(screen.getByText("u•••@example.org")).toBeInTheDocument();
    expect(screen.queryByText("user@example.org")).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });

  it("removes a pending email form when a new question is submitted", async () => {
    const client = new MockSupportApiClient();
    const { user } = await submitToNeedsEmail(client);
    client.enqueueExecution([ANSWERED]);

    await user.type(
      screen.getByLabelText(/type your question/i),
      "How do I manage my account?{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(client.submissions).toHaveLength(2);
    expect(client.submissions[1].request.customerEmail).toBeUndefined();
    expect(client.submissions[1].request.ticketId).toBeUndefined();
  });

  it("shows the customer-safe error state and recovers on retry", async () => {
    const client = new MockSupportApiClient()
      .failNextSubmit()
      .enqueueExecution([ANSWERED]);
    const { user } = setup(client);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "How do I manage my account?{Enter}",
    );
    await waitFor(() =>
      expect(
        screen.getByText(/we couldn't submit your question right now/i),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText("How do I manage my account?")).toHaveLength(1);
  });

  it("shows a failed execution as a retryable error", async () => {
    const client = new MockSupportApiClient().enqueueExecution([FAILED]);
    const { user } = setup(client);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "Break something{Enter}",
    );
    await waitFor(() =>
      expect(
        screen.getByText(/we couldn't submit your question right now/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows a recoverable still-working state when polling is exhausted", async () => {
    const client = new MockSupportApiClient().enqueueExecution([
      PROCESSING,
      PROCESSING,
      PROCESSING,
      ANSWERED,
    ]);
    const { user } = setup(client, 2);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "Slow question{Enter}",
    );
    await waitFor(() =>
      expect(
        screen.getByText(/still working on your question/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/we couldn't submit your question right now/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /check again/i }));
    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
  });

  it("prevents duplicate submissions on rapid double clicks", async () => {
    const client = new MockSupportApiClient().enqueueExecution([
      PROCESSING,
      ANSWERED,
    ]);
    const { user } = setup(client);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "How do I manage my account?",
    );
    const sendButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
    expect(client.submissions).toHaveLength(1);
    expect(screen.getAllByText("How do I manage my account?")).toHaveLength(1);
  });

  it("stops polling when the component unmounts", async () => {
    const client = new MockSupportApiClient().enqueueExecution([PROCESSING]);
    const { user, view } = setup(client, 50);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "Slow question{Enter}",
    );
    await waitFor(() =>
      expect(client.pollCounts.get("exec-1") ?? 0).toBeGreaterThan(0),
    );
    view.unmount();
    const countAtUnmount = client.pollCounts.get("exec-1") ?? 0;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(client.pollCounts.get("exec-1") ?? 0).toBeLessThanOrEqual(
      countAtUnmount + 1,
    );
  });

  it("cancels in-flight polling when a new conversation begins", async () => {
    const client = new MockSupportApiClient();
    const { user, emailInput } = await submitToNeedsEmail(client);
    client.enqueueExecution([AWAITING_REVIEW]);
    await user.type(emailInput, "user@example.org");
    await user.click(screen.getByRole("button", { name: /send to support/i }));
    await waitFor(() =>
      expect(screen.getByText(/support request created/i)).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /ask another question/i }),
    );
    expect(
      screen.queryByText(/support request created/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "How do I create an organization profile?",
      }),
    ).toBeInTheDocument();

    client.enqueueExecution([ANSWERED]);
    await user.type(
      screen.getByLabelText(/type your question/i),
      "How do I manage my account?{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText(/based on:/i)).toBeInTheDocument(),
    );
    const sessions = client.submissions.map((s) => s.request.sessionId);
    expect(sessions[2]).not.toBe(sessions[0]);
  });
});
