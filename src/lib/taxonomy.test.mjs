import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortTaxonomyRows, validateTagName } from "./taxonomy.ts";

const rows = [
  {
    name: "系统设计",
    slug: "system-design",
    updatedAt: "2026-08-20T00:00:00.000Z",
    totalCount: 2,
    publicCount: 1,
  },
  {
    name: "Architecture",
    slug: "architecture",
    updatedAt: "2026-08-21T00:00:00.000Z",
    totalCount: 4,
    publicCount: 3,
  },
];

test("taxonomy search matches names and Slugs without mutating the source", () => {
  assert.deepEqual(
    filterAndSortTaxonomyRows(rows, "SYSTEM", "name").map((row) => row.slug),
    ["system-design"],
  );
  assert.deepEqual(rows.map((row) => row.slug), ["system-design", "architecture"]);
});

test("taxonomy rows can be sorted by total and public references", () => {
  assert.deepEqual(
    filterAndSortTaxonomyRows(rows, "", "total").map((row) => row.slug),
    ["architecture", "system-design"],
  );
  assert.deepEqual(
    filterAndSortTaxonomyRows(rows, "", "public").map((row) => row.slug),
    ["architecture", "system-design"],
  );
});

test("taxonomy rows can be sorted by the most recent update", () => {
  assert.deepEqual(
    filterAndSortTaxonomyRows(rows, "", "updated").map((row) => row.slug),
    ["architecture", "system-design"],
  );
});

test("Tag names are trimmed and reject whitespace or excessive length", () => {
  assert.deepEqual(validateTagName("  TypeScript  "), {
    name: "TypeScript",
    error: null,
  });
  assert.equal(validateTagName("机器 学习").error, "标签名称不能包含空格或其他空白字符。");
  assert.equal(validateTagName("a".repeat(81)).error, "标签名称不能超过 80 个字符。");
});

test("taxonomy search supports rows without Slugs", () => {
  const tagRows = [{ ...rows[0], slug: null }];
  assert.deepEqual(
    filterAndSortTaxonomyRows(tagRows, "系统", "name").map((row) => row.name),
    ["系统设计"],
  );
});
