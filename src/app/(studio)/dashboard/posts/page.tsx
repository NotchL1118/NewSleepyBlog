import type { Metadata } from "next";
import { RegularPostList } from "@/features/posts/RegularPostList";
import {
  isPostStatus,
  type PostStatusFilter,
} from "@/features/posts/studio-posts";

export const metadata: Metadata = { title: "普通文章" };
export const instant = false;

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const statusValue = readFirst(params.status);
  const status: PostStatusFilter =
    statusValue && isPostStatus(statusValue) ? statusValue : "all";
  const pageValue = Number(readFirst(params.page));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  return <RegularPostList page={page} status={status} />;
}
