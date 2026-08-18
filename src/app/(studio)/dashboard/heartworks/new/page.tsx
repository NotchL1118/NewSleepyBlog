import type { Metadata } from "next";
import { PostEditor } from "@/features/posts/PostEditor";
import { getPostGroups, getTags } from "@/features/posts/studio-post-editor";

export const metadata: Metadata = { title: "新建心作" };

export default async function Page() {
  const [groups, tags] = await Promise.all([
    getPostGroups("heartwork"),
    getTags(),
  ]);
  return (
    <PostEditor post={null} groups={groups} kind="heartwork" tags={tags} />
  );
}
