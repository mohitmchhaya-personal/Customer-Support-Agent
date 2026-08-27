import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupportPagePlaceholder } from "./SupportPagePlaceholder";

describe("SupportPagePlaceholder", () => {
  it("renders the Help & Contact heading", () => {
    render(<SupportPagePlaceholder />);
    expect(
      screen.getByRole("heading", { name: /help & contact/i }),
    ).toBeInTheDocument();
  });
});
