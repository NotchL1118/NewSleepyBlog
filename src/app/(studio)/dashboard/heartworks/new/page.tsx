import type { Metadata } from "next";
import { DraftEditor } from "@/features/posts/DraftEditor";
import { getPostGroups } from "@/features/posts/drafts";

export const metadata: Metadata = { title: "新建心作" };

export default async function Page() {
  const groups = await getPostGroups("heartwork");
  return <DraftEditor draft={null} groups={groups} kind="heartwork" />;
}
