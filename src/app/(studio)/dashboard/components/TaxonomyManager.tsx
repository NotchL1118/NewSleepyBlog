"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PostKind } from "@/lib/posts/types";
import {
  filterAndSortTaxonomyRows,
  type TaxonomySortKey,
} from "@/lib/taxonomy";
import {
  deletePostGroup,
  deleteTag,
  savePostGroup,
  saveTag,
  type TaxonomyActionState,
  type TaxonomyDeleteState,
} from "@/server/taxonomy/actions";
import type { TaxonomyRow } from "@/server/taxonomy/queries";

type ManagerMode = PostKind | "tag";

const emptySaveState: TaxonomyActionState = {
  message: null,
  tone: null,
};

const emptyDeleteState: TaxonomyDeleteState = {
  message: null,
  tone: null,
};

const copy = {
  regular: {
    eyebrow: "技术",
    title: "分类",
    singular: "分类",
    description: "维护普通文章使用的内容分组。每篇公开普通文章必须属于一个分类。",
    postLabel: "普通文章",
    postHref: "/dashboard/posts",
    hasDescription: true,
  },
  heartwork: {
    eyebrow: "生活",
    title: "专栏",
    singular: "专栏",
    description: "维护心作使用的内容分组。每篇公开心作必须属于一个专栏。",
    postLabel: "心作",
    postHref: "/dashboard/heartworks",
    hasDescription: true,
  },
  tag: {
    eyebrow: "标签",
    title: "标签",
    singular: "标签",
    description: "维护可跨普通文章与心作复用的主题标记。",
    postLabel: "文章",
    postHref: "/dashboard/posts",
    hasDescription: false,
  },
} as const;

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-xs leading-5 text-foreground">
      {message}
    </p>
  ) : null;
}

export function TaxonomyDialog({
  item,
  mode,
  onClose,
  onCreated,
  onFeedback,
}: {
  item: TaxonomyRow | null;
  mode: ManagerMode;
  onClose: () => void;
  onCreated?: (created: { id: number; name: string; slug?: string }) => void;
  onFeedback: (message: string, tone: "error" | "success") => void;
}) {
  const labels = copy[mode];
  const editing = item !== null;
  const deletingTag = mode === "tag" && editing;
  const saveAction = mode === "tag"
    ? saveTag
    : savePostGroup.bind(null, mode);
  const removeAction = mode === "tag"
    ? deleteTag
    : deletePostGroup.bind(null, mode);
  const [saveState, saveFormAction, savePending] = useActionState(
    saveAction,
    emptySaveState,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    removeAction,
    emptyDeleteState,
  );
  const [deleteArmed, setDeleteArmed] = useState(deletingTag);

  useEffect(() => {
    if (saveState.tone !== "success" || !saveState.message) return;
    if (saveState.created) onCreated?.(saveState.created);
    onFeedback(saveState.message, "success");
    onClose();
  }, [onClose, onCreated, onFeedback, saveState.created, saveState.message, saveState.tone]);

  useEffect(() => {
    if (!deleteState.message || !deleteState.tone) return;
    if (deleteState.tone !== "success") return;
    onFeedback(deleteState.message, "success");
    onClose();
  }, [deleteState.message, deleteState.tone, onClose, onFeedback]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !savePending && !deletePending) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deletePending, onClose, savePending]);

  const referenced = (item?.totalCount ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/20 p-4">
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 cursor-default"
        onClick={() => !savePending && !deletePending && onClose()}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="taxonomy-dialog-title"
        className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-accent uppercase">
              {deletingTag ? "删除标签" : `${editing ? "编辑" : "新建"}${labels.singular}`}
            </p>
            <h2 id="taxonomy-dialog-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              {editing ? item.name : `新建${labels.singular}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={savePending || deletePending}
            className="min-h-10 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            关闭
          </button>
        </div>

        <form action={saveFormAction} className="mt-6 space-y-5">
          {editing ? (
            <>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="expectedUpdatedAt" value={item.updatedAt} />
            </>
          ) : null}
          {deletingTag ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-6">
              删除后，所有文章与“{item.name}”的关联都会解除，文章本身不会被删除。
            </p>
          ) : (
            <label className="block">
              <span className="text-sm font-medium">名称</span>
              <input
                name="name"
                defaultValue={item?.name ?? ""}
                autoFocus
                aria-invalid={Boolean(saveState.fieldErrors?.name)}
                aria-describedby={saveState.fieldErrors?.name ? "taxonomy-name-error" : undefined}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              {mode === "tag" ? (
                <p className="mt-1.5 text-xs leading-5 text-muted">
                  最多 80 个字符，不能包含空格或其他空白字符。
                </p>
              ) : null}
              <FieldError id="taxonomy-name-error" message={saveState.fieldErrors?.name} />
            </label>
          )}

          {mode !== "tag" ? (
            <label className="block">
              <span className="text-sm font-medium">Slug</span>
              <input
                name="slug"
                defaultValue={item?.slug ?? ""}
                readOnly={editing}
                placeholder="lowercase-kebab-case"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(saveState.fieldErrors?.slug)}
                aria-describedby={saveState.fieldErrors?.slug ? "taxonomy-slug-error" : "taxonomy-slug-help"}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none read-only:bg-surface read-only:text-muted focus:border-accent"
              />
              <p id="taxonomy-slug-help" className="mt-1.5 text-xs leading-5 text-muted">
                {editing
                  ? "Slug 创建后不可修改。"
                  : "手工输入小写字母、数字和单个连字符；创建后不可修改。"}
              </p>
              <FieldError id="taxonomy-slug-error" message={saveState.fieldErrors?.slug} />
            </label>
          ) : null}

          {labels.hasDescription ? (
            <label className="block">
              <span className="text-sm font-medium">描述（可选）</span>
              <textarea
                name="description"
                defaultValue={item?.description ?? ""}
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-accent"
              />
            </label>
          ) : null}

          {saveState.message && saveState.tone === "error" ? (
            <p role="alert" className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
              {saveState.message}
            </p>
          ) : null}
          {deleteState.message && deleteState.tone === "error" ? (
            <p role="alert" className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
              {deleteState.message}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <div>
              {editing ? (
                referenced && mode !== "tag" ? (
                  <div className="text-xs leading-5 text-muted">
                    <p>仍被 {item.totalCount} 篇{labels.postLabel}引用，不能删除。</p>
                    <Link href={labels.postHref} className="text-accent hover:underline">
                      返回{labels.postLabel}列表
                    </Link>
                  </div>
                ) : deleteArmed ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteArmed(false)}
                      className="min-h-10 rounded-xl border border-border px-3 text-sm"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      formAction={deleteFormAction}
                      disabled={deletePending}
                      className="min-h-10 rounded-xl bg-foreground px-3 text-sm text-background disabled:opacity-55"
                    >
                      {deletePending ? "正在删除…" : mode === "tag" ? "确认解除关联并删除" : "确认永久删除"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteArmed(true)}
                    className="min-h-10 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    删除{labels.singular}
                  </button>
                )
              ) : null}
            </div>
            {!deletingTag ? (
              <button
                type="submit"
                disabled={savePending || deletePending}
                className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-55"
              >
                {savePending ? "正在保存…" : editing ? "保存修改" : `创建${labels.singular}`}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

export function TaxonomyManager({
  mode,
  rows,
}: {
  mode: ManagerMode;
  rows: TaxonomyRow[];
}) {
  const labels = copy[mode];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialSort = searchParams.get("sort");
  const [sort, setSort] = useState<TaxonomySortKey>(
    initialSort === "updated" || initialSort === "total" || initialSort === "public"
      ? initialSort
      : "name",
  );
  const [selected, setSelected] = useState<TaxonomyRow | null | undefined>();
  const [dialogKey, setDialogKey] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    const currentSort = searchParams.get("sort") ?? "name";
    if (currentQuery === query && currentSort === sort) return;

    const next = new URLSearchParams(searchParams.toString());
    if (query) next.set("q", query);
    else next.delete("q");
    if (sort === "name") next.delete("sort");
    else next.set("sort", sort);
    const href = next.size > 0 ? `${pathname}?${next}` : pathname;
    router.replace(href, { scroll: false });
  }, [pathname, query, router, searchParams, sort]);

  const visibleRows = useMemo(() => {
    return filterAndSortTaxonomyRows(rows, query, sort);
  }, [query, rows, sort]);

  function openDialog(item: TaxonomyRow | null) {
    setFeedback(null);
    setDialogKey((value) => value + 1);
    setSelected(item);
  }

  const closeDialog = useCallback(() => setSelected(undefined), []);
  const handleFeedback = useCallback(
    (message: string, tone: "error" | "success") => setFeedback({ message, tone }),
    [],
  );

  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {labels.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {labels.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openDialog(null)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          新建{labels.singular}
        </button>
      </header>

      {feedback ? (
        <p
          role="status"
          className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="mt-9 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted">
            共 {rows.length} 个{labels.singular}{query ? `，找到 ${visibleRows.length} 个` : ""}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === "tag" ? "搜索标签名称" : `搜索${labels.singular}名称或 Slug`}
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent sm:w-64"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as TaxonomySortKey)}
              aria-label="排序方式"
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            >
              <option value="name">按名称</option>
              <option value="updated">最近更新</option>
              <option value="total">总引用数</option>
              <option value="public">公开引用数</option>
            </select>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium">{query ? "没有匹配结果" : `还没有${labels.singular}`}</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {query ? (mode === "tag" ? "试试其他名称。" : "试试其他名称或 Slug。") : `创建第一个${labels.singular}后，它会出现在这里。`}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-surface/70 text-xs text-muted">
                    <th className="px-5 py-3.5 font-medium">名称</th>
                    {mode !== "tag" ? <th className="px-5 py-3.5 font-medium">Slug</th> : null}
                    <th className="px-5 py-3.5 text-right font-medium">全部引用</th>
                    <th className="px-5 py-3.5 text-right font-medium">公开引用</th>
                    <th className="px-5 py-3.5 font-medium">最近更新</th>
                    <th className="w-20 px-5 py-3.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-t border-border transition-colors hover:bg-surface/45">
                      <td className="px-5 py-4 font-medium">{row.name}</td>
                      {mode !== "tag" ? <td className="px-5 py-4 font-mono text-xs text-muted">{row.slug}</td> : null}
                      <td className="px-5 py-4 text-right text-muted">{row.totalCount}</td>
                      <td className="px-5 py-4 text-right text-muted">{row.publicCount}</td>
                      <td className="px-5 py-4 text-muted">{formatUpdatedAt(row.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDialog(row)}
                          className="min-h-9 whitespace-nowrap rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                        >
                          {mode === "tag" ? "删除" : "编辑"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {visibleRows.map((row) => (
                <article key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-medium">{row.name}</h2>
                      {mode !== "tag" ? (
                        <p className="mt-1 truncate font-mono text-xs text-muted">{row.slug}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDialog(row)}
                      className="min-h-9 shrink-0 rounded-xl border border-border px-3 text-sm"
                    >
                      {mode === "tag" ? "删除" : "编辑"}
                    </button>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-muted">全部引用</dt><dd className="mt-1 text-sm">{row.totalCount}</dd></div>
                    <div><dt className="text-muted">公开引用</dt><dd className="mt-1 text-sm">{row.publicCount}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-muted">更新于 {formatUpdatedAt(row.updatedAt)}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selected !== undefined ? (
        <TaxonomyDialog
          key={dialogKey}
          item={selected}
          mode={mode}
          onClose={closeDialog}
          onFeedback={handleFeedback}
        />
      ) : null}
    </>
  );
}
