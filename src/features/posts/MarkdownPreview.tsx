"use client";

import Markdown from "react-markdown";
import { markdownComponents } from "./markdown-elements";
import {
  markdownRemarkPlugins,
  markdownRemarkRehypeOptions,
  markdownUrlTransform,
} from "./markdown";
import { markdownProseClassName } from "./markdown-prose";
import type { PostKind } from "./types";

export function MarkdownPreview({
  kind,
  markdown,
}: {
  kind: PostKind;
  markdown: string;
}) {
  if (!markdown.trim()) {
    return (
      <p className="text-sm leading-7 text-muted">还没有正文可预览。</p>
    );
  }

  return (
    <div className={markdownProseClassName(kind)}>
      <Markdown
        skipHtml
        remarkPlugins={markdownRemarkPlugins}
        remarkRehypeOptions={markdownRemarkRehypeOptions}
        urlTransform={markdownUrlTransform}
        components={markdownComponents}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
