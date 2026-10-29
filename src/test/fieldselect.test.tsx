import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FieldSelect from "../components/FieldSelect";

describe("FieldSelect", () => {
  it("opens, filters the columns and reports the chosen one", () => {
    const onChange = vi.fn();
    render(
      <FieldSelect
        label="CSV column for to_account"
        value=""
        options={["Account", "Account.1", "Amount Paid"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "CSV column for to_account" }));
    fireEvent.change(screen.getByPlaceholderText("Search columns"), { target: { value: "account.1" } });
    expect(screen.queryByRole("option", { name: "Amount Paid" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Account.1" }));
    expect(onChange).toHaveBeenCalledWith("Account.1");
  });

  it("closes on Escape without choosing", () => {
    const onChange = vi.fn();
    render(<FieldSelect label="CSV column for amount_paid" value="" options={["Amount Paid"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV column for amount_paid" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
