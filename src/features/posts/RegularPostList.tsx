import Link from "next/link";
import { requireAdmin } from "@/features/auth/server";
import {
  getRegularPostsPage,
  STUDIO_POSTS_PAGE_SIZE,
  type PostStatus,
  type PostStatusFilter,
} from "./studio-posts";

const statusFilters = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
] as const satisfies ReadonlyArray<{
  value: PostStatusFilter;
  label: string;
}>;

const statusLabels = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
} as const satisfies Record<PostStatus, string>;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const paginationLinkClassName =
  "inline-flex min-h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function listHref(status: PostStatusFilter, page?: number) {
  const query: Record<string, string> = {};

  if (status !== "all") query.status = status;
  if (page && page > 1) query.page = String(page);

  return { pathname: "/dashboard/posts", query };
}

function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
      {statusLabels[status]}
    </span>
  );
}

export async function RegularPostList({
  page,
  status,
}: {
  page: number;
  status: PostStatusFilter;
}) {
  await requireAdmin();

  const { posts, total } = await getRegularPostsPage({ page, status });
  const totalPages = Math.max(1, Math.ceil(total / STUDIO_POSTS_PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            内容
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            普通文章
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            管理技术、折腾与经验记录。
          </p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          新建文章
        </Link>
      </header>

      <section className="mt-9 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted">共 {total} 篇普通文章</p>
          <nav aria-label="按文章状态筛选" className="flex flex-wrap gap-1.5">
            {statusFilters.map((filter) => {
              const isCurrent = filter.value === status;

              return (
                <Link
                  key={filter.value}
                  href={listHref(filter.value)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isCurrent
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {posts.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(8rem,0.35fr)_7rem_8rem] gap-4 bg-surface/70 px-5 py-3.5 text-xs text-muted sm:grid">
              <span>标题</span>
              <span>分类</span>
              <span>状态</span>
              <span>最近更新</span>
            </div>
            <ul className="space-y-1 p-1 sm:p-2">
              {posts.map((post) => {
                const statusValue = post.status as PostStatus;
                const title = post.title?.trim() || "无标题草稿";

                return (
                  <li key={post.id}>
                    <Link
                      href={`/dashboard/posts/${post.id}`}
                      className="grid gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-surface/55 focus-visible:bg-surface/55 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.35fr)_7rem_8rem] sm:items-center sm:gap-4"
                    >
                      <span className="min-w-0 font-medium text-foreground sm:truncate">
                        {title}
                      </span>
                      <span className="text-sm text-muted">
                        {post.post_groups?.name ?? "未分类"}
                      </span>
                      <PostStatusBadge status={statusValue} />
                      <time
                        dateTime={post.updated_at}
                        className="text-sm text-muted"
                      >
                        {dateFormatter.format(new Date(post.updated_at))}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-medium text-foreground">
              {status === "all" ? "还没有普通文章" : "这个状态下还没有普通文章"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {status === "all"
                ? "新建并保存第一篇草稿后，它会出现在这里。"
                : "切换状态筛选，或新建一篇普通文章。"}
            </p>
          </div>
        )}

        {(hasPreviousPage || hasNextPage) && (
          <nav
            aria-label="普通文章分页"
            className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 sm:px-5"
          >
            {hasPreviousPage ? (
              <Link
                href={listHref(status, page - 1)}
                className={paginationLinkClassName}
              >
                上一页
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">
              第 {page} / {totalPages} 页
            </span>
            {hasNextPage ? (
              <Link
                href={listHref(status, page + 1)}
                className={paginationLinkClassName}
              >
                下一页
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </>
  );
}
