import { MarkdownAsync } from "react-markdown";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import styles from "./index.module.css";

type MarkdownContentProps = {
  children: string;
  kind: "regular" | "heartwork";
};

export async function MarkdownContent({ children, kind }: MarkdownContentProps) {
  return (
    <div className={`${styles.prose} ${kind === "heartwork" ? styles.heartworkProse : styles.regularProse}`}>
      <MarkdownAsync
        skipHtml
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{
          footnoteLabel: "脚注",
          footnoteBackLabel: "返回正文",
        }}
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
