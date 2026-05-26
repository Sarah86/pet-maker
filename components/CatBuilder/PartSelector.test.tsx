import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartSelector } from "./PartSelector";

const variants = [1, 2, 3, 4, 5] as const;

describe("PartSelector", () => {
  it("renders a button for every variant", () => {
    render(
      <PartSelector
        category="body"
        label="Corpo"
        selected={1}
        onSelect={() => {}}
        variants={variants}
      />
    );
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("marks the selected variant as aria-pressed true", () => {
    render(
      <PartSelector
        category="body"
        label="Corpo"
        selected={3}
        onSelect={() => {}}
        variants={variants}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[2]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelect with the clicked variant number", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PartSelector
        category="eyes"
        label="Olhos"
        selected={1}
        onSelect={onSelect}
        variants={variants}
      />
    );
    await user.click(screen.getAllByRole("button")[2]);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("displays the category label", () => {
    render(
      <PartSelector
        category="nose"
        label="Nariz"
        selected={1}
        onSelect={() => {}}
        variants={variants}
      />
    );
    expect(screen.getByText("Nariz")).toBeInTheDocument();
  });
});
