import type { Metadata } from "next";
import { PostEditor } from "@/features/posts/PostEditor";
import { getPostGroups, getTags } from "@/features/posts/studio-post-editor";

export const metadata: Metadata = { title: "新建普通文章" };

export default async function Page() {
  const [groups, tags] = await Promise.all([
    getPostGroups("regular"),
    getTags(),
  ]);
  return (
    <PostEditor post={null} groups={groups} kind="regular" tags={tags} />
  );
}
