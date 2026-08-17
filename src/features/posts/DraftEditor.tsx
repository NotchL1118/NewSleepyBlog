"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createRegularPostDraft,
  publishRegularPost,
  updateRegularPostDraft,
  type DraftActionState,
  type DraftField,
} from "./draft-actions";
import type { PostDraft, RegularPostGroup } from "./drafts";

type DraftEditorProps = {
  draft: PostDraft | null;
  groups: RegularPostGroup[];
};

const emptyDraftActionState: DraftActionState = {
  message: null,
  tone: null,
  updatedAt: null,
};

function EditorActions({
  canPublish,
  published,
  publishAction,
  onPublish,
  onSave,
  publishPending,
  savePending,
}: {
  canPublish: boolean;
  published: boolean;
  publishAction: (formData: FormData) => void;
  onPublish: () => void;
  onSave: () => void;
  publishPending: boolean;
  savePending: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="submit"
        onClick={onSave}
        disabled={savePending || publishPending || published}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-55"
      >
        {savePending ? "正在保存…" : "保存草稿"}
      </button>
      {canPublish ? (
        <button
          type="submit"
          formAction={publishAction}
          onClick={onPublish}
          disabled={savePending || publishPending || published}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-55"
        >
          {published
            ? "已发布"
            : publishPending
              ? "正在发布…"
              : "发布文章"}
        </button>
      ) : null}
    </div>
  );
}

function FieldError({
  field,
  state,
}: {
  field: DraftField;
  state: DraftActionState;
}) {
  const message = state.fieldErrors?.[field];
  return message ? (
    <p id={`${field}-error`} className="mt-1.5 text-xs leading-5 text-foreground">
      {message}
    </p>
  ) : null;
}

export function DraftEditor({ draft, groups }: DraftEditorProps) {
  const [categoryMode, setCategoryMode] = useState<"create" | "existing">(
    "existing",
  );
  const [feedbackMode, setFeedbackMode] = useState<"publish" | "save">(
    "save",
  );
  const initialState: DraftActionState = draft
    ? {
        ...emptyDraftActionState,
        updatedAt: draft.updated_at,
      }
    : emptyDraftActionState;
  const action = draft
    ? updateRegularPostDraft.bind(null, draft.id)
    : createRegularPostDraft;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [publishState, publishAction, publishPending] = useActionState(
    publishRegularPost.bind(null, draft?.id ?? 0),
    initialState,
  );
  const feedbackState = feedbackMode === "publish" ? publishState : state;
  const published = publishState.saved === true;

  return (
    <form action={formAction} className="mx-auto w-full max-w-5xl">
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.updatedAt ?? ""}
      />
      <input type="hidden" name="categoryMode" value={categoryMode} />

      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/posts"
            className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            ← 返回普通文章
          </Link>
          <p className="mt-6 text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            普通文章 · 草稿
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {draft ? draft.title?.trim() || "无标题草稿" : "新建普通文章"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {draft
              ? `草稿 #${draft.id} · 保存时会检查是否存在更新冲突。`
              : "离开此页不会产生记录；第一次保存后才会创建草稿。"}
          </p>
        </div>
        <EditorActions
          canPublish={draft !== null}
          published={published}
          publishAction={publishAction}
          onPublish={() => setFeedbackMode("publish")}
          onSave={() => setFeedbackMode("save")}
          publishPending={publishPending}
          savePending={pending}
        />
      </header>

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium">标题</span>
            <input
              name="title"
              defaultValue={draft?.title ?? ""}
              placeholder="可以稍后填写"
              aria-invalid={Boolean(feedbackState.fieldErrors?.title)}
              aria-describedby={
                feedbackState.fieldErrors?.title ? "title-error" : undefined
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted/65 focus:border-accent"
            />
            <FieldError field="title" state={feedbackState} />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Markdown 正文</span>
            <textarea
              name="bodyMarkdown"
              defaultValue={draft?.body_markdown ?? ""}
              rows={20}
              placeholder="从这里开始写，空正文也可以保存为草稿。"
              aria-invalid={Boolean(
                feedbackState.fieldErrors?.bodyMarkdown,
              )}
              aria-describedby={
                feedbackState.fieldErrors?.bodyMarkdown
                  ? "bodyMarkdown-error"
                  : undefined
              }
              className="mt-2 min-h-[28rem] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm leading-7 outline-none transition-colors placeholder:font-sans placeholder:text-muted/65 focus:border-accent"
            />
            <FieldError field="bodyMarkdown" state={feedbackState} />
          </label>
        </div>

        <aside className="space-y-5 rounded-2xl border border-border bg-surface/55 p-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">
              文章种类
            </p>
            <p className="mt-2 text-sm font-medium">普通文章</p>
            <p className="mt-1 text-xs leading-5 text-muted">创建后不可更改</p>
          </div>

          <fieldset className="border-t border-border pt-5">
            <legend className="text-sm font-medium">分类</legend>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setCategoryMode("existing")}
                aria-pressed={categoryMode === "existing"}
                className={`min-h-9 rounded-lg px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  categoryMode === "existing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                选择已有分类
              </button>
              <button
                type="button"
                onClick={() => setCategoryMode("create")}
                aria-pressed={categoryMode === "create"}
                className={`min-h-9 rounded-lg px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  categoryMode === "create"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                新建分类
              </button>
            </div>

            {categoryMode === "existing" ? (
              <div>
                <select
                  name="groupId"
                  defaultValue={draft?.group_id ?? ""}
                  aria-label="选择已有分类"
                  aria-invalid={Boolean(feedbackState.fieldErrors?.groupId)}
                  aria-describedby={
                    feedbackState.fieldErrors?.groupId
                      ? "groupId-error"
                      : undefined
                  }
                  className="mt-3 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                >
                  <option value="">尚未选择</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <FieldError field="groupId" state={feedbackState} />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs text-muted">分类名称</span>
                  <input
                    name="categoryName"
                    placeholder="例如：开发手记"
                    aria-invalid={Boolean(
                      feedbackState.fieldErrors?.categoryName,
                    )}
                    aria-describedby={
                      feedbackState.fieldErrors?.categoryName
                        ? "categoryName-error"
                        : undefined
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted/65 focus:border-accent"
                  />
                  <FieldError field="categoryName" state={feedbackState} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">分类 Slug</span>
                  <input
                    name="categorySlug"
                    placeholder="development-notes"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(
                      feedbackState.fieldErrors?.categorySlug,
                    )}
                    aria-describedby={
                      feedbackState.fieldErrors?.categorySlug
                        ? "categorySlug-error"
                        : undefined
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none placeholder:text-muted/65 focus:border-accent"
                  />
                  <FieldError field="categorySlug" state={feedbackState} />
                </label>
              </div>
            )}
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium">Slug</span>
            <input
              name="slug"
              defaultValue={draft?.slug ?? ""}
              placeholder="lowercase-kebab-case"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(feedbackState.fieldErrors?.slug)}
              aria-describedby={
                feedbackState.fieldErrors?.slug ? "slug-error" : undefined
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none transition-colors placeholder:text-muted/65 focus:border-accent"
            />
            <FieldError field="slug" state={feedbackState} />
          </label>

          <label className="block">
            <span className="text-sm font-medium">摘要</span>
            <textarea
              name="summary"
              defaultValue={draft?.summary ?? ""}
              rows={5}
              placeholder="可选，发布前再补也可以"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted/65 focus:border-accent"
            />
          </label>
        </aside>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={`text-sm leading-6 ${
            feedbackState.tone === "error" ||
            feedbackState.tone === "warning"
              ? "text-foreground"
              : feedbackState.tone === "success"
                ? "text-accent"
                : "text-muted"
          }`}
        >
          {feedbackState.message ??
            "标题、Slug、分类、摘要和正文都可以稍后补全。"}
          {publishState.publishedPath ? (
            <>
              {" "}
              <Link
                href={publishState.publishedPath}
                className="font-medium text-accent underline underline-offset-4"
              >
                打开公开页面
              </Link>
            </>
          ) : null}
        </p>
        <EditorActions
          canPublish={draft !== null}
          published={published}
          publishAction={publishAction}
          onPublish={() => setFeedbackMode("publish")}
          onSave={() => setFeedbackMode("save")}
          publishPending={publishPending}
          savePending={pending}
        />
      </div>
    </form>
  );
}
