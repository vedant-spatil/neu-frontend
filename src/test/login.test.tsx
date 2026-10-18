import { describe, expect, it } from "vitest";
import { getToken, setToken, clearToken } from "../auth/session";

describe("session token storage", () => {
  it("stores and clears the access token in sessionStorage", () => {
    setToken("abc");
    expect(getToken()).toBe("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
