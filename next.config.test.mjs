import assert from "node:assert/strict";
import test from "node:test";
import { isCsrfOriginAllowed } from "next/dist/server/app-render/csrf-protection.js";
import nextConfig from "./next.config.ts";

const allowedOrigins = nextConfig.experimental?.serverActions?.allowedOrigins;

test("Server Actions accept the canonical origin when the CDN uses a different origin host", () => {
  const origin = new URL("https://lsyfighting.cn").host;
  assert.equal(isCsrfOriginAllowed(origin, allowedOrigins), true);
});

test("Server Actions do not extend trust to aliases, subdomains, or unrelated origins", () => {
  for (const origin of [
    "blog.lsyfighting.cn",
    "vercel.lsyfighting.cn",
    "untrusted.lsyfighting.cn",
    "lsyfighting.cn.attacker.example",
    "attacker.example",
    "null",
  ]) {
    assert.equal(isCsrfOriginAllowed(origin, allowedOrigins), false, origin);
  }
});
