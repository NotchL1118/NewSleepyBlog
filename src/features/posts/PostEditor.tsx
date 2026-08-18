"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createPostDraft,
  deletePost,
  publishPost,
  transitionPost,
  updatePostDraft,
  type DraftActionState,
  type DraftField,
  type LifecycleActionState,
} from "./draft-actions";
import type { PostGroupOption, StudioPost, TagOption } from "./studio-post-editor";
import { postKindOptions } from "./post-kinds";
import type { PostStatus as StudioPostStatus } from "./studio-post-filters";
import type { PostKind } from "./types";

type PostEditorProps = {
  post: StudioPost | null;
  groups: PostGroupOption[];
  kind: PostKind;
  tags: TagOption[];
};

const emptyDraftActionState: DraftActionState = {
  message: null,
  tone: null,
  updatedAt: null,
};

const emptyLifecycleActionState: LifecycleActionState = {
  message: null,
  tone: null,
};

const editorStatusLabels = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
} as const satisfies Record<StudioPostStatus, string>;

const lifecycleTransitions = {
  draft: [],
  published: [
    { label: "撤回为草稿", primary: false, value: "withdraw" },
    { label: "归档", primary: true, value: "archive" },
  ],
  archived: [
    { label: "撤回为草稿", primary: false, value: "withdraw" },
    { label: "恢复发布", primary: true, value: "restore" },
  ],
} as const satisfies Record<
  StudioPostStatus,
  ReadonlyArray<{
    label: string;
    primary: boolean;
    value: "archive" | "restore" | "withdraw";
  }>
>;

function latestUpdatedAt(...values: Array<string | null | undefined>) {
  return values.reduce<string>((latest, value) => {
    if (!value) return latest;
    if (!latest) return value;
    return Date.parse(value) > Date.parse(latest) ? value : latest;
  }, "");
}

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
              : "发布"}
        </button>
      ) : null}
    </div>
  );
}

function LifecycleControls({
  deleteAction,
  lifecycleAction,
  onAction,
  pending,
  status,
}: {
  deleteAction: (formData: FormData) => void | Promise<void>;
  lifecycleAction: (formData: FormData) => void;
  onAction: () => void;
  pending: boolean;
  status: StudioPostStatus;
}) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const secondaryButtonClassName =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-55";
  const primaryButtonClassName =
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-55";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      {lifecycleTransitions[status].map((transition) => (
        <button
          key={transition.value}
          type="submit"
          name="transition"
          value={transition.value}
          formAction={lifecycleAction}
          onClick={onAction}
          disabled={pending}
          className={
            transition.primary
              ? primaryButtonClassName
              : secondaryButtonClassName
          }
        >
          {pending && transition.primary ? "正在更新…" : transition.label}
        </button>
      ))}

      {deleteArmed ? (
        <>
          <button
            type="button"
            onClick={() => setDeleteArmed(false)}
            className={secondaryButtonClassName}
          >
            取消删除
          </button>
          <button
            type="submit"
            formAction={deleteAction}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            再次确认永久删除
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setDeleteArmed(true)}
          className={secondaryButtonClassName}
        >
          永久删除
        </button>
      )}
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

function NewTagFields({ state }: { state: DraftActionState }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-xs font-medium text-muted">同时新建一个标签（可选）</p>
      <label className="block">
        <span className="text-xs text-muted">标签名称</span>
        <input
          name="tagName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：系统设计"
          aria-invalid={Boolean(state.fieldErrors?.tagName)}
          aria-describedby={state.fieldErrors?.tagName ? "tagName-error" : undefined}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted/65 focus:border-accent"
        />
        <FieldError field="tagName" state={state} />
      </label>
      <label className="block">
        <span className="text-xs text-muted">标签 Slug</span>
        <input
          name="tagSlug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="system-design"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(state.fieldErrors?.tagSlug)}
          aria-describedby={state.fieldErrors?.tagSlug ? "tagSlug-error" : undefined}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none placeholder:text-muted/65 focus:border-accent"
        />
        <FieldError field="tagSlug" state={state} />
      </label>
    </div>
  );
}

export function PostEditor({ post, groups, kind, tags }: PostEditorProps) {
  const options = postKindOptions[kind];
  const status = (post?.status ?? "draft") as StudioPostStatus;
  const editable = post === null || status === "draft";
  const [groupMode, setGroupMode] = useState<"create" | "existing">(
    "existing",
  );
  const [feedbackMode, setFeedbackMode] = useState<
    "lifecycle" | "publish" | "save"
  >(
    "save",
  );
  const initialState: DraftActionState = post
    ? {
        ...emptyDraftActionState,
        updatedAt: post.updated_at,
      }
    : emptyDraftActionState;
  const action = post
    ? updatePostDraft.bind(null, kind, post.id)
    : createPostDraft.bind(null, kind);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [publishState, publishAction, publishPending] = useActionState(
    publishPost.bind(null, kind, post?.id ?? 0),
    initialState,
  );
  const [lifecycleState, lifecycleAction, lifecyclePending] = useActionState(
    transitionPost.bind(null, kind, post?.id ?? 0),
    emptyLifecycleActionState,
  );
  const deleteAction = deletePost.bind(null, kind, post?.id ?? 0);
  const feedbackState = feedbackMode === "publish" ? publishState : state;
  const feedback =
    feedbackMode === "lifecycle" ? lifecycleState : feedbackState;
  const published = publishState.saved === true;

  return (
    <form action={formAction} className="mx-auto w-full max-w-5xl">
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={latestUpdatedAt(
          post?.updated_at,
          state.updatedAt,
          publishState.updatedAt,
        )}
      />
      <input type="hidden" name="groupMode" value={groupMode} />

      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={options.studioBasePath}
            className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            ← 返回{options.pluralLabel}
          </Link>
          <p className="mt-6 text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            {options.singularLabel} · {editorStatusLabels[status]}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {post
              ? post.title?.trim() || "无标题草稿"
              : `新建${options.singularLabel}`}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {post
              ? status === "draft"
                ? `草稿 #${post.id} · 保存时会检查是否存在更新冲突。`
                : `文章 #${post.id} · 先撤回为草稿，再编辑内容。`
              : "离开此页不会产生记录；第一次保存后才会创建草稿。"}
          </p>
        </div>
        {editable ? (
          <EditorActions
            canPublish={post !== null}
            published={published}
            publishAction={publishAction}
            onPublish={() => setFeedbackMode("publish")}
            onSave={() => setFeedbackMode("save")}
            publishPending={publishPending}
            savePending={pending}
          />
        ) : null}
      </header>

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium">标题</span>
            <input
              name="title"
              defaultValue={post?.title ?? ""}
              readOnly={!editable}
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
              defaultValue={post?.body_markdown ?? ""}
              readOnly={!editable}
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
          {status === "published" ? (
            <label className="block">
              <span className="text-sm font-medium">归档说明（可选）</span>
              <textarea
                name="archiveNote"
                rows={4}
                placeholder="向读者说明内容为何归档；仅保存纯文本。"
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted/65 focus:border-accent"
              />
            </label>
          ) : null}
          {status === "archived" ? (
            <div>
              <p className="text-sm font-medium">归档说明</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {post?.archive_note ?? "未填写归档说明。"}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">
              文章种类
            </p>
            <p className="mt-2 text-sm font-medium">
              {options.singularLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">创建后不可更改</p>
          </div>

          <fieldset disabled={!editable} className="border-t border-border pt-5 disabled:opacity-70">
            <legend className="text-sm font-medium">
              {options.groupLabel}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setGroupMode("existing")}
                aria-pressed={groupMode === "existing"}
                className={`min-h-9 rounded-lg px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  groupMode === "existing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                选择已有{options.groupLabel}
              </button>
              <button
                type="button"
                onClick={() => setGroupMode("create")}
                aria-pressed={groupMode === "create"}
                className={`min-h-9 rounded-lg px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  groupMode === "create"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                新建{options.groupLabel}
              </button>
            </div>

            {groupMode === "existing" ? (
              <div>
                <select
                  name="groupId"
                  defaultValue={post?.group_id ?? ""}
                  aria-label={`选择已有${options.groupLabel}`}
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
                  <span className="text-xs text-muted">
                    {options.groupLabel}名称
                  </span>
                  <input
                    name="groupName"
                    placeholder={kind === "regular" ? "例如：开发手记" : "例如：所思所想"}
                    aria-invalid={Boolean(
                      feedbackState.fieldErrors?.groupName,
                    )}
                    aria-describedby={
                      feedbackState.fieldErrors?.groupName
                        ? "groupName-error"
                        : undefined
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted/65 focus:border-accent"
                  />
                  <FieldError field="groupName" state={feedbackState} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">
                    {options.groupLabel} Slug
                  </span>
                  <input
                    name="groupSlug"
                    placeholder="development-notes"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(
                      feedbackState.fieldErrors?.groupSlug,
                    )}
                    aria-describedby={
                      feedbackState.fieldErrors?.groupSlug
                        ? "groupSlug-error"
                        : undefined
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none placeholder:text-muted/65 focus:border-accent"
                  />
                  <FieldError field="groupSlug" state={feedbackState} />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset disabled={!editable} className="border-t border-border pt-5 disabled:opacity-70">
            <legend className="text-sm font-medium">标签</legend>
            <p className="mt-1 text-xs leading-5 text-muted">
              可跨普通文章与心作复用，也可以不选。
            </p>
            {tags.length > 0 ? (
              <div className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm transition-colors hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      name="tagId"
                      value={tag.id}
                      defaultChecked={post?.tagIds.includes(tag.id)}
                      className="size-4 accent-accent"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{tag.name}</span>
                      <span className="block truncate font-mono text-[11px] text-muted">
                        {tag.slug}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted">还没有标签。</p>
            )}
            <FieldError field="tagIds" state={feedbackState} />

            <NewTagFields
              key={state.updatedAt ?? "unsaved"}
              state={feedbackState}
            />
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium">Slug</span>
            <input
              name="slug"
              defaultValue={post?.slug ?? ""}
              readOnly={!editable || Boolean(post?.published_at)}
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
              defaultValue={post?.summary ?? ""}
              readOnly={!editable}
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
            feedback.tone === "error" ||
            feedback.tone === "warning"
              ? "text-foreground"
              : feedback.tone === "success"
                ? "text-accent"
                : "text-muted"
          }`}
        >
          {feedback.message ??
            (editable
              ? `标题、Slug、${options.groupLabel}、标签、摘要和正文都可以稍后补全。`
              : "状态操作会立即同步到公开页面。")}
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {editable ? (
            <EditorActions
              canPublish={post !== null}
              published={published}
              publishAction={publishAction}
              onPublish={() => setFeedbackMode("publish")}
              onSave={() => setFeedbackMode("save")}
              publishPending={publishPending}
              savePending={pending}
            />
          ) : null}
          {post ? (
            <LifecycleControls
              deleteAction={deleteAction}
              lifecycleAction={lifecycleAction}
              onAction={() => setFeedbackMode("lifecycle")}
              pending={lifecyclePending}
              status={status}
            />
          ) : null}
        </div>
      </div>
    </form>
  );
}
