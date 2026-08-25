import assert from "node:assert/strict";
import test from "node:test";
import { constrainPostGroupsToKind } from "../../server/posts/post-groups.ts";
import { postKindOptions } from "./post-kinds.ts";

test("Regular Posts are bound to Categories and Regular Post routes", () => {
  assert.deepEqual(postKindOptions.regular, {
    singularLabel: "普通文章",
    pluralLabel: "普通文章",
    groupLabel: "分类",
    publicBasePath: "/posts",
    studioBasePath: "/dashboard/posts",
  });
});

test("Heartworks are bound to Columns and Heartwork routes", () => {
  assert.deepEqual(postKindOptions.heartwork, {
    singularLabel: "心作",
    pluralLabel: "心作",
    groupLabel: "专栏",
    publicBasePath: "/heartworks",
    studioBasePath: "/dashboard/heartworks",
  });
});

test("Post Group options remain inside each Post kind boundary", () => {
  const calls = [];
  const constrainedQuery = { boundaryApplied: true };
  const query = {
    eq(column, value) {
      calls.push([column, value]);
      return constrainedQuery;
    },
  };

  assert.equal(constrainPostGroupsToKind(query, "regular"), constrainedQuery);
  assert.equal(
    constrainPostGroupsToKind(query, "heartwork"),
    constrainedQuery,
  );
  assert.deepEqual(calls, [
    ["kind", "regular"],
    ["kind", "heartwork"],
  ]);
});
