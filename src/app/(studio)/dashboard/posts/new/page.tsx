import type { Metadata } from "next";
import { DraftEditor } from "@/features/posts/DraftEditor";
import { getRegularPostGroups } from "@/features/posts/drafts";

export const metadata: Metadata = { title: "新建普通文章" };
export const instant = false;

export default async function Page() {
  const groups = await getRegularPostGroups();
  return <DraftEditor draft={null} groups={groups} />;
}
