import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MockSupportService } from "@/lib/support/service";
import { SupportChat } from "./SupportChat";

const service = new MockSupportService(0);

function setup() {
  const user = userEvent.setup();
  render(<SupportChat service={service} />);
  return user;
}

describe("SupportChat", () => {
  it("shows the welcome message and suggested questions", () => {
    setup();
    expect(screen.getByText(/hi! i'm spreadbliss support/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "How do I create an organization profile?",
      }),
    ).toBeInTheDocument();
  });

  it("disables send for blank input", () => {
    setup();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("submits on Enter and shows a grounded answer", async () => {
    const user = setup();
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
  });

  it("inserts a line break on Shift+Enter without submitting", async () => {
    const user = setup();
    const composer = screen.getByLabelText(/type your question/i);
    await user.type(composer, "line one{Shift>}{Enter}{/Shift}line two");
    expect(composer).toHaveValue("line one\nline two");
    expect(screen.queryByText("line one")).not.toBeInTheDocument();
  });

  it("shows the email form for an unsupported question", async () => {
    const user = setup();
    await user.click(
      screen.getByRole("button", { name: "I'm having a technical issue" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument(),
    );
  });

  it("validates the email inline and then acknowledges escalation", async () => {
    const user = setup();
    await user.click(
      screen.getByRole("button", { name: "I'm having a technical issue" }),
    );
    const emailInput = await screen.findByLabelText(/email address/i);

    await user.type(emailInput, "not-an-email");
    await user.click(screen.getByRole("button", { name: /send to support/i }));
    expect(
      screen.getByText(/please enter a valid email address/i),
    ).toBeInTheDocument();

    await user.clear(emailInput);
    await user.type(emailInput, "user@example.org");
    await user.click(screen.getByRole("button", { name: /send to support/i }));
    expect(screen.getByText(/support request created/i)).toBeInTheDocument();
    expect(screen.getByText(/awaiting support review/i)).toBeInTheDocument();
  });

  it("resets the conversation via Ask another question", async () => {
    const user = setup();
    await user.click(
      screen.getByRole("button", { name: "I'm having a technical issue" }),
    );
    const emailInput = await screen.findByLabelText(/email address/i);
    await user.type(emailInput, "user@example.org");
    await user.click(screen.getByRole("button", { name: /send to support/i }));

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
  });

  it("shows the customer-safe error state with retry", async () => {
    const user = setup();
    await user.type(
      screen.getByLabelText(/type your question/i),
      "my network is offline{Enter}",
    );
    await waitFor(() =>
      expect(
        screen.getByText(/we couldn't submit your question right now/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
