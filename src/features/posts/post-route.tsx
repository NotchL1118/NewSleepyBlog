import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostContentPage } from "@/components/PostContentPage";
import { getPostPage, postPath } from "./content";
import { getPublicRegularPostPage } from "./public-posts";
import type { PostKind } from "./types";

export type PostRouteProps = {
  params: Promise<{ slug: string }>;
};

function getPostPageForKind(slug: string, expectedKind: PostKind) {
  return expectedKind === "regular"
    ? getPublicRegularPostPage(slug)
    : getPostPage(slug);
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
  const description = post.summary ?? post.overview;
  const canonical = postPath(post);

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
      modifiedTime: post.updatedAt,
      tags: [...post.tags],
    },
  };
}
