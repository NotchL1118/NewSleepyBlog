import type { Metadata } from "next";
import { PostList } from "@/features/posts/PostList";
import {
  readPostListFilters,
  type PostListSearchParams,
} from "@/features/posts/studio-post-filters";

export const metadata: Metadata = { title: "心作" };
export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PostListSearchParams>;
}) {
  const { page, status } = readPostListFilters(await searchParams);

  return <PostList kind="heartwork" page={page} status={status} />;
}
