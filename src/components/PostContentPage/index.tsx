import Link from "next/link";
import { MarkdownContent } from "./MarkdownContent";
import { TableOfContents } from "./TableOfContents";
import {
  estimateReadingMinutes,
  extractPostHeadings,
  postGroupLabel,
  postKindLabel,
  postPath,
} from "@/features/posts/content";
import type { AdjacentPost, PostPageData } from "@/features/posts/types";
import styles from "./index.module.css";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeZone: "Asia/Shanghai",
});

function AdjacentLink({ direction, post }: { direction: "previous" | "next"; post: AdjacentPost }) {
  return (
    <Link href={postPath(post)} className={direction === "next" ? styles.nextPost : undefined}>
      <span>
        {direction === "previous" ? "上一篇" : "下一篇"} · {post.group.name}
      </span>
      <strong>{post.title}</strong>
    </Link>
  );
}

export async function PostContentPage({ page }: { page: PostPageData }) {
  const { post, previousPost, nextPost } = page;
  const headings = extractPostHeadings(post.bodyMarkdown);
  const readingMinutes = estimateReadingMinutes(post.bodyMarkdown);
  const readingClass = post.kind === "heartwork" ? styles.heartworkReading : styles.regularReading;

  return (
    <main className="pb-36 pt-8 sm:pt-10 min-[821px]:pt-12">
      <article>
        <header className={`${styles.articleHeader} ${readingClass}`}>
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            {postKindLabel(post.kind)} · {post.group.name}
          </p>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <div className={styles.metadata}>
            <span>
              {postGroupLabel(post.kind)}：{post.group.name}
            </span>
            <span>
              发布于 <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
            </span>
            <span>
              更新于 <time dateTime={post.updatedAt}>{dateFormatter.format(new Date(post.updatedAt))}</time>
            </span>
            <span>{readingMinutes} 分钟阅读</span>
          </div>
          {post.status === "archived" ? (
            <p className={styles.archiveNotice}>
              <strong>这篇文章已归档：</strong>
              {post.archiveNote ?? "部分内容可能已经过时。"}
            </p>
          ) : null}
        </header>

        <div className={`${styles.reading} ${readingClass}`}>
          <TableOfContents headings={headings} />
          <aside className={styles.overview} aria-label="全文概述">
            <strong>全文概述</strong>
            <p>{post.overview}</p>
          </aside>
          <MarkdownContent kind={post.kind}>{post.bodyMarkdown}</MarkdownContent>

          {post.tags.length > 0 ? (
            <ul className={styles.tags} aria-label="文章标签">
              {post.tags.map((tag) => (
                <li key={tag}># {tag}</li>
              ))}
            </ul>
          ) : null}

          {previousPost || nextPost ? (
            <nav className={styles.adjacentPosts} aria-label="相邻文章">
              {previousPost ? <AdjacentLink direction="previous" post={previousPost} /> : <span />}
              {nextPost ? <AdjacentLink direction="next" post={nextPost} /> : <span />}
            </nav>
          ) : null}
        </div>
      </article>
    </main>
  );
}
