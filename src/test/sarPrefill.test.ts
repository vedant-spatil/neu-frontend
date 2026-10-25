import { describe, expect, it } from "vitest";
import { approvalPrefill, reasonFromSar, typologyFromCategory } from "../features/approvals/sarPrefill";

const SAR = {
  activity: { category: "Structuring", start: "2022-09-01T00:02:00", end: "2022-09-01T14:40:00", total_amount: 79635.71 },
  cited_txn_ids: [8671, 3344, 10189],
  narrative: "On 2022-09-01 the account made a series of cash deposits under the reporting limit. Funds were then moved on.",
};

describe("typologyFromCategory", () => {
  it("maps the report's category to a typology key", () => {
    expect(typologyFromCategory("Structuring")).toEqual(["structuring"]);
    expect(typologyFromCategory("Money Mule")).toEqual(["money_mule"]);
    expect(typologyFromCategory("Round-Trip")).toEqual(["round_trip"]);
    expect(typologyFromCategory("pass through")).toEqual(["pass_through"]);
  });

  it("maps gather-scatter to scatter_gather", () => {
    expect(typologyFromCategory("Gather-Scatter")).toEqual(["scatter_gather"]);
    expect(typologyFromCategory("scatter gather")).toEqual(["scatter_gather"]);
  });

  it("returns nothing for an unknown or missing category", () => {
    expect(typologyFromCategory("Something else")).toEqual([]);
    expect(typologyFromCategory(undefined)).toEqual([]);
  });
});

describe("reasonFromSar", () => {
  it("builds a reason of at least 20 characters from the category, amount and first sentence", () => {
    const reason = reasonFromSar(SAR);
    expect(reason.length).toBeGreaterThanOrEqual(20);
    expect(reason).toContain("Structuring activity");
    expect(reason).toContain("3 cited transactions");
    expect(reason).toContain("On 2022-09-01 the account made a series of cash deposits under the reporting limit.");
  });
});

describe("approvalPrefill", () => {
  it("fills an empty typology and an empty reason", () => {
    const filled = approvalPrefill(SAR, { typologies: [], reason: "" });
    expect(filled.typologies).toEqual(["structuring"]);
    expect(filled.reason).toBe(reasonFromSar(SAR));
  });

  it("keeps what the investigator has already typed", () => {
    const filled = approvalPrefill(SAR, { typologies: ["layering"], reason: "My own reason for approval." });
    expect(filled.typologies).toEqual(["layering"]);
    expect(filled.reason).toBe("My own reason for approval.");
  });

  it("changes nothing when there is no SAR", () => {
    const current = { typologies: [], reason: "" };
    expect(approvalPrefill(undefined, current)).toEqual(current);
  });
});
