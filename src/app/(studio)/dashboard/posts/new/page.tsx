import type { Metadata } from "next";
import { DraftEditor } from "@/features/posts/DraftEditor";
import { getPostGroups, getTags } from "@/features/posts/drafts";

export const metadata: Metadata = { title: "新建普通文章" };

export default async function Page() {
  const [groups, tags] = await Promise.all([
    getPostGroups("regular"),
    getTags(),
  ]);
  return (
    <DraftEditor draft={null} groups={groups} kind="regular" tags={tags} />
  );
}
