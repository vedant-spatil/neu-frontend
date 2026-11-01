import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "../components/Toast";

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved")}>success</button>
      <button onClick={() => toast.error("Failed")}>error</button>
    </>
  );
}

describe("toast", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the message, then removes it when its time is up", () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger /></ToastProvider>);

    act(() => screen.getByText("success").click());
    expect(screen.getByText("Saved")).toBeTruthy();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("keeps an error toast longer than a success toast", () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger /></ToastProvider>);

    act(() => screen.getByText("error").click());
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText("Failed")).toBeTruthy();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText("Failed")).toBeNull();
  });

  it("can be dismissed by hand", () => {
    render(<ToastProvider><Trigger /></ToastProvider>);

    act(() => screen.getByText("success").click());
    act(() => screen.getByRole("button", { name: "Dismiss" }).click());
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
