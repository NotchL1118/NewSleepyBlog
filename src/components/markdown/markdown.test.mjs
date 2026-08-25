import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedMarkdownImageSrc,
  markdownLinkOpensInNewTab,
  markdownLinkRel,
  markdownUrlTransform,
} from "./markdown.ts";

test("internal Markdown links stay in the current tab", () => {
  assert.equal(markdownLinkOpensInNewTab("/posts/hello"), false);
  assert.equal(markdownLinkOpensInNewTab("/heartworks/evening"), false);
  assert.equal(markdownLinkOpensInNewTab("./notes"), false);
  assert.equal(markdownLinkOpensInNewTab("../about"), false);
  assert.equal(markdownLinkOpensInNewTab("#footnotes"), false);
  assert.equal(markdownLinkOpensInNewTab("?tag=design"), false);
});

test("external HTTP and HTTPS Markdown links open in a new tab", () => {
  assert.equal(markdownLinkOpensInNewTab("https://example.com/essay"), true);
  assert.equal(markdownLinkOpensInNewTab("http://example.com/essay"), true);
  assert.equal(markdownLinkOpensInNewTab("//cdn.example.com/page"), true);
});

test("non-HTTP Markdown links stay in the current tab", () => {
  assert.equal(markdownLinkOpensInNewTab("mailto:hi@example.com"), false);
});

test("relative and HTTPS image URLs are allowed", () => {
  assert.equal(isAllowedMarkdownImageSrc("/images/cover.png"), true);
  assert.equal(isAllowedMarkdownImageSrc("./photo.jpg"), true);
  assert.equal(isAllowedMarkdownImageSrc("../assets/map.webp"), true);
  assert.equal(
    isAllowedMarkdownImageSrc("https://images.example.com/cover.png"),
    true,
  );
});

test("HTTP, protocol-relative, and non-image protocols are rejected", () => {
  assert.equal(isAllowedMarkdownImageSrc("http://images.example.com/cover.png"), false);
  assert.equal(isAllowedMarkdownImageSrc("//images.example.com/cover.png"), false);
  assert.equal(isAllowedMarkdownImageSrc("data:image/png;base64,abcd"), false);
  assert.equal(isAllowedMarkdownImageSrc("javascript:alert(1)"), false);
});

test("external HTTP and HTTPS links use noopener noreferrer", () => {
  assert.equal(markdownLinkRel("https://example.com/essay"), "noopener noreferrer");
  assert.equal(markdownLinkRel("/posts/hello"), undefined);
});

test("disallowed image URLs are stripped before render", () => {
  assert.equal(
    markdownUrlTransform("http://images.example.com/cover.png", "src"),
    "",
  );
  assert.equal(
    markdownUrlTransform("https://images.example.com/cover.png", "src"),
    "https://images.example.com/cover.png",
  );
  assert.equal(
    markdownUrlTransform("https://example.com/essay", "href"),
    "https://example.com/essay",
  );
});
