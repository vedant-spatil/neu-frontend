import { describe, expect, it } from "vitest";
import { accountPasswordError } from "../features/account/AccountPage";

describe("accountPasswordError", () => {
  it("asks for the current password", () => {
    expect(accountPasswordError("", "longpassword1", "longpassword1")).toMatch(/current password/);
  });

  it("requires the minimum length for the new password", () => {
    expect(accountPasswordError("old-password", "short", "short")).toMatch(/at least 10/);
  });

  it("rejects a new password equal to the current one", () => {
    expect(accountPasswordError("same-password-1", "same-password-1", "same-password-1")).toMatch(/must differ/);
  });

  it("rejects a confirmation that does not match", () => {
    expect(accountPasswordError("old-password", "new-password-1", "new-password-2")).toMatch(/do not match/);
  });

  it("accepts a valid change", () => {
    expect(accountPasswordError("old-password", "new-password-1", "new-password-1")).toBeNull();
  });
});
