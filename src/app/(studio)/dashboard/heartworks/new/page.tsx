import type { Metadata } from "next";
import { DraftEditor } from "@/features/posts/DraftEditor";
import { getPostGroups, getTags } from "@/features/posts/drafts";

export const metadata: Metadata = { title: "新建心作" };

export default async function Page() {
  const [groups, tags] = await Promise.all([
    getPostGroups("heartwork"),
    getTags(),
  ]);
  return (
    <DraftEditor draft={null} groups={groups} kind="heartwork" tags={tags} />
  );
}
