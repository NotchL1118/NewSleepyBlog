import assert from "node:assert/strict";
import test from "node:test";
import { isValidSlug } from "./slug.ts";

test("lowercase kebab-case Slugs are accepted", () => {
  for (const slug of ["post", "my-post", "a1", "2026-08-post-01"]) {
    assert.equal(isValidSlug(slug), true, slug);
  }
});

test("Slugs outside the database constraint are rejected", () => {
  for (const slug of [
    "",
    "-leading",
    "trailing-",
    "double--hyphen",
    "Upper",
    "with space",
    "under_score",
    "punctuation!",
    "post\nsecond-line",
    "trailing-newline\n",
  ]) {
    assert.equal(isValidSlug(slug), false, JSON.stringify(slug));
  }
});
