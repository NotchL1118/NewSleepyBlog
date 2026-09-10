import assert from "node:assert/strict";
import test from "node:test";
import {
  isMarkdownFileName,
  markdownFileContentError,
  markdownFileSelectionError,
} from "./markdown-import.ts";

test("Markdown imports accept the two supported extensions case-insensitively", () => {
  for (const name of ["post.md", "post.markdown", "POST.MD", "Post.Markdown"]) {
    assert.equal(isMarkdownFileName(name), true, name);
    assert.equal(markdownFileSelectionError([{ name }]), null, name);
  }
});

test("Markdown imports reject unsupported extensions and ambiguous selections", () => {
  for (const name of ["post", "post.txt", "post.md.txt", "markdown"]) {
    assert.equal(isMarkdownFileName(name), false, name);
  }

  assert.equal(
    markdownFileSelectionError([{ name: "post.txt" }]),
    "仅支持 .md 或 .markdown 文件。",
  );
  assert.equal(markdownFileSelectionError([]), "请一次只导入一个 Markdown 文件。");
  assert.equal(
    markdownFileSelectionError([{ name: "one.md" }, { name: "two.md" }]),
    "请一次只导入一个 Markdown 文件。",
  );
});

test("Markdown imports reject empty and whitespace-only content", () => {
  for (const content of ["", " \n\t "]) {
    assert.equal(markdownFileContentError(content), "Markdown 文件为空，未导入。");
  }

  assert.equal(markdownFileContentError("# Title\n"), null);
  assert.equal(markdownFileContentError("---\ntitle: Imported\n---"), null);
});
