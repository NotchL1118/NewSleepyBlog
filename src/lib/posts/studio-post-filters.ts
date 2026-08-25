export const postStatuses = ["draft", "published", "archived"] as const;

export type PostStatus = (typeof postStatuses)[number];
export type PostStatusFilter = PostStatus | "all";

export type PostListSearchParams = {
  page?: string | string[];
  status?: string | string[];
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isPostStatus(value: string): value is PostStatus {
  return postStatuses.some((status) => status === value);
}

export function readPostListFilters(params: PostListSearchParams) {
  const statusValue = readFirst(params.status);
  const status: PostStatusFilter =
    statusValue && isPostStatus(statusValue) ? statusValue : "all";
  const pageValue = Number(readFirst(params.page));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  return { page, status };
}
