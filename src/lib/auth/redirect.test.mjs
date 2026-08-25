import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAuthRedirectPath } from "./redirect.ts";

test("keeps an internal authentication redirect path", () => {
  assert.equal(
    normalizeAuthRedirectPath("/dashboard/settings?tab=profile"),
    "/dashboard/settings?tab=profile",
  );
});

test("falls back to the home page for external or missing redirect paths", () => {
  for (const value of [
    undefined,
    null,
    "",
    "dashboard",
    "https://example.com",
    "//example.com",
    "/\\example.com",
  ]) {
    assert.equal(normalizeAuthRedirectPath(value), "/");
  }
});
