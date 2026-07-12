import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";

describe("App", () => {
  it("renders ten notification patterns and supports filtering and restoring", () => {
    render(<App />);

    expect(screen.getByText("Every signal deserves")).toBeInTheDocument();
    expect(screen.getByText("01 / Toast")).toBeInTheDocument();
    expect(screen.getByText("10 / Command")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Dismiss .* example/)).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "Security" }));
    expect(screen.getByText("New sign-in from Warsaw")).toBeInTheDocument();
    expect(screen.queryByText("Project published")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss Security example"));
    expect(screen.getByText("All clear")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Restore all/i }));
    expect(screen.getByText("New sign-in from Warsaw")).toBeInTheDocument();
  });
});
