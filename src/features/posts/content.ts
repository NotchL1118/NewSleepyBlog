import { cache } from "react";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { postFixtures } from "./fixtures";
import type { AdjacentPost, Post, PostHeading, PostKind, PostPageData, PostRoute } from "./types";

const PUBLIC_STATUSES = new Set(["published", "archived"]);

function toAdjacentPost(post: Post): AdjacentPost {
  return {
    kind: post.kind,
    slug: post.slug,
    title: post.title,
    group: post.group,
  };
}

export const getPostPage = cache(async (slug: string): Promise<PostPageData | undefined> => {
  const post = postFixtures.find((candidate) => candidate.slug === slug && PUBLIC_STATUSES.has(candidate.status));

  if (!post) return undefined;

  const siblings = postFixtures
    .filter((candidate) => candidate.kind === post.kind && PUBLIC_STATUSES.has(candidate.status))
    .toSorted((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  const index = siblings.findIndex((candidate) => candidate.id === post.id);

  return {
    post,
    previousPost: index > 0 ? toAdjacentPost(siblings[index - 1]) : undefined,
    nextPost: index < siblings.length - 1 ? toAdjacentPost(siblings[index + 1]) : undefined,
  };
});

export async function listPostRoutes(): Promise<readonly PostRoute[]> {
  return postFixtures
    .filter((post) => PUBLIC_STATUSES.has(post.status))
    .map(({ kind, slug }) => ({ kind, slug }));
}

export function postPath(post: Pick<Post, "kind" | "slug">) {
  return post.kind === "regular" ? `/posts/${post.slug}` : `/heartworks/${post.slug}`;
}

export function postKindLabel(kind: PostKind) {
  return kind === "regular" ? "普通文章" : "心作";
}

export function postGroupLabel(kind: PostKind) {
  return kind === "regular" ? "分类" : "专栏";
}

export function estimateReadingMinutes(markdown: string) {
  const plainText = markdown
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/[`*_>#|\[\]()-]/g, " ");
  const hanCharacters = plainText.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinWords = plainText.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;

  return Math.max(1, Math.ceil(hanCharacters / 400 + latinWords / 220));
}

export function extractPostHeadings(markdown: string): readonly PostHeading[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const slugger = new GithubSlugger();
  const headings: PostHeading[] = [];

  visit(tree, "heading", (node) => {
    const title = toString(node).trim();
    const id = slugger.slug(title);

    if (title && (node.depth === 2 || node.depth === 3)) {
      headings.push({ depth: node.depth, id, title });
    }
  });

  return headings;
}
