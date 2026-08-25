import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContentPage } from "../components/PostContentPage";
import { siteConfig } from "@/config/site";
import { postDescription, postPath } from "@/lib/posts/content";
import { getPublicPostPage } from "@/server/posts/public-posts";
import type { PostKind } from "@/lib/posts/types";

export type PostRouteProps = {
  params: Promise<{ slug: string }>;
};

function getPostPageForKind(slug: string, expectedKind: PostKind) {
  return getPublicPostPage(slug, expectedKind);
}

export async function renderPostRoute({ params }: PostRouteProps, expectedKind: PostKind) {
  const { slug } = await params;
  const page = await getPostPageForKind(slug, expectedKind);

  if (!page || page.post.kind !== expectedKind) notFound();

  return <PostContentPage page={page} />;
}

export async function buildPostMetadata(
  { params }: PostRouteProps,
  expectedKind: PostKind,
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPostPageForKind(slug, expectedKind);

  if (!page || page.post.kind !== expectedKind) {
    return {
      title: "文章未找到",
      robots: { index: false, follow: false },
    };
  }

  const { post } = page;
  const description = postDescription(post, siteConfig.description);
  const canonical = postPath(post);
  const hasDistinctUpdate = post.updatedAt !== post.publishedAt;

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: hasDistinctUpdate ? post.updatedAt : undefined,
      tags: [...post.tags],
    },
  };
}
