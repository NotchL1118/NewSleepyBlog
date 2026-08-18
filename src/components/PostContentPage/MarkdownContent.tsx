import { MarkdownAsync } from "react-markdown";
import { cacheLife } from "next/cache";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { markdownComponents } from "@/features/posts/markdown-elements";
import {
  markdownRemarkPlugins,
  markdownRemarkRehypeOptions,
  markdownUrlTransform,
} from "@/features/posts/markdown";
import { markdownProseClassName } from "@/features/posts/markdown-prose";

type MarkdownContentProps = {
  children: string;
  kind: "regular" | "heartwork";
};

export async function MarkdownContent({ children, kind }: MarkdownContentProps) {
  "use cache";
  cacheLife("max");

  return (
    <div className={markdownProseClassName(kind)}>
      <MarkdownAsync
        skipHtml
        remarkPlugins={markdownRemarkPlugins}
        remarkRehypeOptions={markdownRemarkRehypeOptions}
        urlTransform={markdownUrlTransform}
        components={markdownComponents}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypePrettyCode,
            {
              keepBackground: false,
              theme: {
                light: "github-light",
                dark: "github-dark-dimmed",
              },
            },
          ],
        ]}
      >
        {children}
      </MarkdownAsync>
    </div>
  );
}
