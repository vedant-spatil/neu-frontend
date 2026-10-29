import { describe, expect, it } from "vitest";
import { ruleLabel } from "../lib/labels";

describe("ruleLabel", () => {
  it("replaces underscores with spaces", () => {
    expect(ruleLabel("R3_fan_in")).toBe("R3 fan in");
    expect(ruleLabel("R7_gather_scatter")).toBe("R7 gather scatter");
  });

  it("leaves a label without underscores unchanged", () => {
    expect(ruleLabel("R1")).toBe("R1");
  });
});
