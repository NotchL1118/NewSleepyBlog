import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/features/posts/DraftEditor";
import { getPostDraft, getPostGroups } from "@/features/posts/drafts";

export const metadata: Metadata = { title: "编辑心作草稿" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idValue } = await params;
  const id = Number(idValue);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [draft, groups] = await Promise.all([
    getPostDraft(id, "heartwork"),
    getPostGroups("heartwork"),
  ]);

  if (!draft) notFound();

  return <DraftEditor draft={draft} groups={groups} kind="heartwork" />;
}
