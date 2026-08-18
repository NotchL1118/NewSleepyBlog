import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/features/posts/PostEditor";
import { getPostGroups, getStudioPost, getTags } from "@/features/posts/studio-post-editor";

export const metadata: Metadata = { title: "管理心作" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idValue } = await params;
  const id = Number(idValue);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [post, groups, tags] = await Promise.all([
    getStudioPost(id, "heartwork"),
    getPostGroups("heartwork"),
    getTags(),
  ]);

  if (!post) notFound();

  return (
    <PostEditor post={post} groups={groups} kind="heartwork" tags={tags} />
  );
}
