import { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

export const markdownRemarkPlugins = [remarkGfm];

export const markdownRemarkRehypeOptions = {
  footnoteLabel: "脚注",
  footnoteBackLabel: "返回正文",
};

function hasHttpProtocol(value: string) {
  if (value.startsWith("//")) return true;

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function markdownLinkOpensInNewTab(href: string) {
  return hasHttpProtocol(href);
}

export function isAllowedMarkdownImageSrc(src: string) {
  if (!src || src.startsWith("//")) return false;

  try {
    return new URL(src).protocol === "https:";
  } catch {
    return true;
  }
}

export function markdownLinkRel(href: string) {
  if (!markdownLinkOpensInNewTab(href)) return undefined;
  return "noopener noreferrer";
}

export function markdownUrlTransform(url: string, key: string) {
  const safe = defaultUrlTransform(url);
  if (key === "src" && safe && !isAllowedMarkdownImageSrc(safe)) {
    return "";
  }
  return safe;
}
