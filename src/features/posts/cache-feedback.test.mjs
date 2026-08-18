import assert from "node:assert/strict";
import test from "node:test";
import { committedWriteFeedback } from "./cache-feedback.ts";

test("a committed write with successful cache invalidation reports success", () => {
  assert.deepEqual(
    committedWriteFeedback("文章已发布，公开页面现在可以访问。", true),
    {
      message: "文章已发布，公开页面现在可以访问。",
      tone: "success",
    },
  );
});

test("a committed write with cache invalidation failure reports partial success", () => {
  assert.deepEqual(committedWriteFeedback("文章已发布，公开页面现在可以访问。", false), {
    message: "数据已保存，但公开缓存刷新失败。公开页面稍后可能仍显示旧内容。",
    tone: "warning",
  });
});
