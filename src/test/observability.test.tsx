import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ObservabilityPage, { formatMs } from "../features/observability/ObservabilityPage";

vi.mock("../api/client", () => ({
  api: vi.fn(async () => ({ enabled: false })),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ObservabilityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ObservabilityPage", () => {
  it("says so when observability is not configured", async () => {
    renderPage();
    expect(await screen.findByText(/not configured/i)).toBeTruthy();
  });
});

describe("formatMs", () => {
  it("shows milliseconds under a second and seconds above, and a dash when missing", () => {
    expect(formatMs(420.4)).toBe("420 ms");
    expect(formatMs(8200)).toBe("8.2 s");
    expect(formatMs(null)).toBe("—");
    expect(formatMs(undefined)).toBe("—");
  });
});
