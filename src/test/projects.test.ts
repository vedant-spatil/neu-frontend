import { describe, expect, it } from "vitest";
import {
  canReject,
  chunkAccounts,
  MAX_ACCOUNTS_PER_REQUEST,
  needsResubmit,
  parseAccountIds,
  validProjectName,
} from "../features/projects/helpers";
import { EvaluationSchema, ProjectDetailSchema, QaAccountSchema } from "../api/schemas";

describe("account id input", () => {
  it("splits on spaces, commas and new lines, drops blanks and duplicates", () => {
    expect(parseAccountIds("A1, A2\nA3  A1,,  ")).toEqual(["A1", "A2", "A3"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseAccountIds("   \n ")).toEqual([]);
  });

  it("chunks long lists to the backend limit", () => {
    const ids = Array.from({ length: MAX_ACCOUNTS_PER_REQUEST * 2 + 5 }, (_, i) => `A${i}`);
    const chunks = chunkAccounts(ids);
    expect(chunks.map((c) => c.length)).toEqual([MAX_ACCOUNTS_PER_REQUEST, MAX_ACCOUNTS_PER_REQUEST, 5]);
    expect(chunks.flat()).toEqual(ids);
  });
});

describe("review rules", () => {
  it("needs a reject reason of 10 or more characters after trimming", () => {
    expect(canReject("too short")).toBe(false); // 9 characters
    expect(canReject("   ok ok   ")).toBe(false);
    expect(canReject("ten chars!")).toBe(true);
  });

  it("only rejected accounts are resubmitted", () => {
    expect(needsResubmit("rejected")).toBe(true);
    expect(needsResubmit("submitted")).toBe(false);
    expect(needsResubmit("not_started")).toBe(false);
  });

  it("project names need 3 or more characters", () => {
    expect(validProjectName("ab")).toBe(false);
    expect(validProjectName("abc")).toBe(true);
  });
});

describe("response schemas", () => {
  it("parses an evaluation with a reject reason", () => {
    const parsed = EvaluationSchema.parse({
      id: 3, project_id: 1, account_id: "A1", source: "qa", status: "rejected", tags: ["anomaly"],
      notes: "", case_id: null, qa_user_id: 2, reject_reason: "needs more evidence",
    });
    expect(parsed.reject_reason).toBe("needs more evidence");
  });

  it("parses project detail with members and accounts", () => {
    const parsed = ProjectDetailSchema.parse({
      id: 1, name: "Q4 review", members: [{ user_id: 2, email: "qa@example.com" }], accounts: ["A1"],
    });
    expect(parsed.members[0].email).toBe("qa@example.com");
  });

  it("rejects a malformed QA account row", () => {
    expect(() => QaAccountSchema.parse({ account_id: "A1" })).toThrow();
  });
});
