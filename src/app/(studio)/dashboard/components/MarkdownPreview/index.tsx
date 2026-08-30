"use client";

import Markdown from "react-markdown";
import { markdownComponents } from "@/components/markdown/markdown-elements";
import {
  markdownRemarkPlugins,
  markdownRemarkRehypeOptions,
  markdownUrlTransform,
} from "@/components/markdown/markdown";
import { markdownProseClassName } from "@/components/markdown/markdown-prose";
import type { PostKind } from "@/lib/posts/types";

export function MarkdownPreview({
  kind,
  markdown,
}: {
  kind: PostKind;
  markdown: string;
}) {
  if (!markdown.trim()) {
    return null;
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
