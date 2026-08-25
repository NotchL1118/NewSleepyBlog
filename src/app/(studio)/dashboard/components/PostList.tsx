import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { postKindOptions } from "@/lib/posts/post-kinds";
import type {
  PostStatus,
  PostStatusFilter,
} from "@/lib/posts/studio-post-filters";
import {
  getPostsPage,
  STUDIO_POSTS_PAGE_SIZE,
} from "@/server/posts/studio-posts";
import type { PostKind } from "@/lib/posts/types";

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

function listHref(
  basePath: string,
  status: PostStatusFilter,
  page?: number,
) {
  const query: Record<string, string> = {};

  if (status !== "all") query.status = status;
  if (page && page > 1) query.page = String(page);

  return { pathname: basePath, query };
}

function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
      {statusLabels[status]}
    </span>
  );
}

export async function PostList({
  kind,
  page,
  status,
}: {
  kind: PostKind;
  page: number;
  status: PostStatusFilter;
}) {
  await requireAdmin();

  const options = postKindOptions[kind];
  const { posts, total } = await getPostsPage({ kind, page, status });
  const totalPages = Math.max(1, Math.ceil(total / STUDIO_POSTS_PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            {kind === "regular" ? "技术" : "生活"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {options.pluralLabel}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            {kind === "regular"
              ? "管理技术、折腾与经验记录。"
              : "管理生活感悟与所思所想。"}
          </p>
        </div>
        <Link
          href={`${options.studioBasePath}/new`}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          新建{options.singularLabel}
        </Link>
      </header>

      <section className="mt-9 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted">
            共 {total} 篇{options.pluralLabel}
          </p>
          <nav aria-label="按文章状态筛选" className="flex flex-wrap gap-1.5">
            {statusFilters.map((filter) => {
              const isCurrent = filter.value === status;

              return (
                <Link
                  key={filter.value}
                  href={listHref(options.studioBasePath, filter.value)}
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
              <span>{options.groupLabel}</span>
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
                      href={`${options.studioBasePath}/${post.id}`}
                      className="grid gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-surface/55 focus-visible:bg-surface/55 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.35fr)_7rem_8rem] sm:items-center sm:gap-4"
                    >
                      <span className="min-w-0 font-medium text-foreground sm:truncate">
                        {title}
                      </span>
                      <span className="text-sm text-muted">
                        {post.post_groups?.name ?? `无${options.groupLabel}`}
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
              {status === "all"
                ? `还没有${options.pluralLabel}`
                : `这个状态下还没有${options.pluralLabel}`}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {status === "all"
                ? "新建并保存第一篇草稿后，它会出现在这里。"
                : `切换状态筛选，或新建一篇${options.singularLabel}。`}
            </p>
          </div>
        )}

        {(hasPreviousPage || hasNextPage) && (
          <nav
            aria-label={`${options.pluralLabel}分页`}
            className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 sm:px-5"
          >
            {hasPreviousPage ? (
              <Link
                href={listHref(options.studioBasePath, status, page - 1)}
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
                href={listHref(options.studioBasePath, status, page + 1)}
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
