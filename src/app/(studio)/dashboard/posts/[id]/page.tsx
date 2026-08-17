import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/features/posts/DraftEditor";
import {
  getRegularPostDraft,
  getRegularPostGroups,
} from "@/features/posts/drafts";

export const metadata: Metadata = { title: "编辑普通文章草稿" };
export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idValue } = await params;
  const id = Number(idValue);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [draft, groups] = await Promise.all([
    getRegularPostDraft(id),
    getRegularPostGroups(),
  ]);

  if (!draft) notFound();

  return <DraftEditor draft={draft} groups={groups} />;
}
