import { describe, expect, it } from "vitest";
import { MIN_PASSWORD, signupError } from "../features/login/SignupPage";

describe("signupError", () => {
  it("accepts a valid email and a matching password of the minimum length", () => {
    expect(signupError("reviewer@example.com", "a".repeat(MIN_PASSWORD), "a".repeat(MIN_PASSWORD))).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(signupError("not-an-email", "a".repeat(MIN_PASSWORD), "a".repeat(MIN_PASSWORD))).toMatch(/valid email/);
  });

  it("rejects a short password", () => {
    expect(signupError("a@b.co", "short", "short")).toMatch(/at least/);
  });

  it("rejects mismatched passwords", () => {
    expect(signupError("a@b.co", "a".repeat(MIN_PASSWORD), "b".repeat(MIN_PASSWORD))).toMatch(/do not match/);
  });
});
