"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/server";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.generated";
import {
  POST_LIST_CACHE_TAG,
  postDetailCacheTag,
} from "./public-posts";
import { isPostKind, postKindOptions } from "./post-kinds";
import type { PostKind } from "./types";

export type DraftField =
  | "bodyMarkdown"
  | "groupName"
  | "groupSlug"
  | "groupId"
  | "slug"
  | "tagIds"
  | "tagName"
  | "tagSlug"
  | "title";

export type DraftActionState = {
  message: string | null;
  tone: "error" | "success" | "warning" | null;
  updatedAt: string | null;
  fieldErrors?: Partial<Record<DraftField, string>>;
  publishedPath?: string;
  saved?: boolean;
};

type DraftValues = {
  groupId: number | null;
  title: string | null;
  slug: string | null;
  summary: string | null;
  bodyMarkdown: string;
  expectedUpdatedAt: string | null;
  newTagName: string | null;
  newTagSlug: string | null;
  tagIds: number[];
};

type CreateDraftArgs =
  Database["public"]["Functions"]["create_post_draft"]["Args"];
type UpdateDraftArgs =
  Database["public"]["Functions"]["update_post_draft"]["Args"];
type PublishPostArgs =
  Database["public"]["Functions"]["publish_post"]["Args"];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalText(value: string) {
  return value.trim() ? value : null;
}

function readTagValues(
  formData: FormData,
  updatedAt: string | null,
):
  | Pick<DraftValues, "newTagName" | "newTagSlug" | "tagIds">
  | DraftActionState {
  const tagIds = formData.getAll("tagId").map((value) =>
    typeof value === "string" ? Number(value) : Number.NaN,
  );
  const newTagName = optionalText(readString(formData, "tagName"));
  const newTagSlug = optionalText(readString(formData, "tagSlug"));
  const fieldErrors: Partial<Record<DraftField, string>> = {};

  if (tagIds.some((tagId) => !Number.isSafeInteger(tagId) || tagId <= 0)) {
    fieldErrors.tagIds = "请选择有效的标签。";
  }

  if ((newTagName === null) !== (newTagSlug === null)) {
    if (newTagName === null) fieldErrors.tagName = "请输入新标签名称。";
    if (newTagSlug === null) fieldErrors.tagSlug = "请输入新标签 Slug。";
  }

  if (newTagSlug !== null && !slugPattern.test(newTagSlug)) {
    fieldErrors.tagSlug = "标签 Slug 只能使用小写字母、数字和单个连字符。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "请修正标出的标签字段后再保存。",
      tone: "error",
      updatedAt,
      fieldErrors,
    };
  }

  return {
    newTagName,
    newTagSlug,
    tagIds: [...new Set(tagIds)],
  };
}

function readDraftValues(
  formData: FormData,
  kind: PostKind,
): DraftValues | DraftActionState {
  const groupIdValue = readString(formData, "groupId");
  const groupId = groupIdValue ? Number(groupIdValue) : null;
  const slug = optionalText(readString(formData, "slug")?.trim());
  const expectedUpdatedAt = readString(formData, "expectedUpdatedAt") || null;

  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId <= 0)) {
    return {
      message: `请选择有效的${postKindOptions[kind].groupLabel}。`,
      tone: "error",
      updatedAt: expectedUpdatedAt,
    };
  }

  if (slug !== null && !slugPattern.test(slug)) {
    return {
      message: "Slug 只能使用小写字母、数字和单个连字符。",
      tone: "error",
      updatedAt: expectedUpdatedAt,
    };
  }

  const tagValues = readTagValues(formData, expectedUpdatedAt);
  if (isActionState(tagValues)) return tagValues;

  return {
    groupId,
    title: optionalText(readString(formData, "title")),
    slug,
    summary: optionalText(readString(formData, "summary")),
    bodyMarkdown: readString(formData, "bodyMarkdown"),
    expectedUpdatedAt,
    ...tagValues,
  };
}

function isActionState(value: object | DraftActionState): value is DraftActionState {
  return "message" in value;
}

function addOptionalValues<
  T extends CreateDraftArgs | UpdateDraftArgs,
>(args: T, values: DraftValues) {
  if (values.groupId !== null) args.p_group_id = values.groupId;
  if (values.title !== null) args.p_title = values.title;
  if (values.slug !== null) args.p_slug = values.slug;
  if (values.summary !== null) args.p_summary = values.summary;
  args.p_body_markdown = values.bodyMarkdown;
  args.p_tag_ids = values.tagIds;
  if (values.newTagName !== null) args.p_new_tag_name = values.newTagName;
  if (values.newTagSlug !== null) args.p_new_tag_slug = values.newTagSlug;
  return args;
}

function mutationErrorState(
  error: { code?: string; message?: string } | null,
  fallback: string,
  updatedAt: string | null,
  kind: PostKind,
): DraftActionState {
  if (error?.code === "40001") {
    return {
      message: "这篇草稿已在别处更新。请重新加载后再保存，避免覆盖较新的内容。",
      tone: "error",
      updatedAt,
    };
  }

  if (error?.code === "23505") {
    const tagConflict = error.message?.includes("tags_") ?? false;
    return {
      message: tagConflict
        ? "这个标签名称或 Slug 已存在。"
        : "这个 Slug 已被其他文章使用。",
      tone: "error",
      updatedAt,
      fieldErrors: tagConflict
        ? {
            tagName: "请使用尚未存在的标签名称。",
            tagSlug: "请使用尚未存在的标签 Slug。",
          }
        : { slug: "请输入尚未被其他文章使用的 Slug。" },
    };
  }

  if (error?.code === "23503") {
    const tagConflict = error.message?.includes("post_tags") ?? false;
    return {
      message: tagConflict
        ? "所选标签不存在，请重新选择。"
        : `所选${postKindOptions[kind].groupLabel}不存在，或不属于${postKindOptions[kind].singularLabel}。`,
      tone: "error",
      updatedAt,
      fieldErrors: tagConflict
        ? { tagIds: "请重新选择标签。" }
        : undefined,
    };
  }

  return { message: fallback, tone: "error", updatedAt };
}

function publicationErrorState(
  error: { code?: string; message?: string } | null,
  updatedAt: string,
  kind: PostKind,
): DraftActionState {
  const options = postKindOptions[kind];

  if (error?.code === "40001") {
    return {
      message: "这篇草稿已在别处更新。请重新加载后再发布。",
      tone: "error",
      updatedAt,
    };
  }

  if (error?.code === "23505") {
    const tagConflict = error.message?.includes("tags_") ?? false;
    const groupConflict = error.message?.includes("post_groups") ?? false;
    const groupNameConflict =
      error.message?.includes("post_groups_kind_name_key") ?? false;
    return {
      message: tagConflict
        ? "这个标签名称或 Slug 已存在。"
        : groupConflict
        ? `这个${options.groupLabel}名称或 Slug 已存在。`
        : "这个文章 Slug 已被使用。",
      tone: "error",
      updatedAt,
      fieldErrors: tagConflict
        ? {
            tagName: "请使用尚未存在的标签名称。",
            tagSlug: "请使用尚未存在的标签 Slug。",
          }
        : groupConflict
        ? groupNameConflict
          ? { groupName: `这个${options.groupLabel}名称已被使用。` }
          : { groupSlug: `这个${options.groupLabel} Slug 已被使用。` }
        : { slug: "请输入尚未被其他文章使用的 Slug。" },
    };
  }

  if (error?.code === "23503") {
    const tagConflict = error.message?.includes("post_tags") ?? false;
    return {
      message: tagConflict
        ? "所选标签不存在，请重新选择。"
        : `所选${options.groupLabel}不存在，或不属于${options.singularLabel}。`,
      tone: "error",
      updatedAt,
      fieldErrors: tagConflict
        ? { tagIds: "请重新选择标签。" }
        : {
            groupId: `请重新选择${options.singularLabel}${options.groupLabel}。`,
          },
    };
  }

  return {
    message: "文章暂时无法发布，请稍后重试。",
    tone: "error",
    updatedAt,
  };
}

export async function createPostDraft(
  kind: PostKind,
  _previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  if (!isPostKind(kind)) {
    return { message: "文章种类无效。", tone: "error", updatedAt: null };
  }

  const values = readDraftValues(formData, kind);
  if (isActionState(values)) return values;

  const args = addOptionalValues<CreateDraftArgs>(
    { p_kind: kind },
    values,
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_post_draft", args);

  if (error || !data) {
    return mutationErrorState(
      error,
      "草稿暂时无法保存，请稍后重试。",
      null,
      kind,
    );
  }

  redirect(`${postKindOptions[kind].studioBasePath}/${data.id}`);
}

export async function updatePostDraft(
  kind: PostKind,
  postId: number,
  previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  if (!isPostKind(kind)) {
    return {
      message: "文章种类无效。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return {
      message: "草稿标识无效。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  const values = readDraftValues(formData, kind);
  if (isActionState(values)) return values;

  if (!values.expectedUpdatedAt) {
    return {
      message: "缺少草稿版本信息，请重新加载后再保存。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  const args = addOptionalValues<UpdateDraftArgs>(
    {
      p_post_id: postId,
      p_expected_updated_at: values.expectedUpdatedAt,
    },
    values,
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_post_draft", args);

  if (error || !data) {
    return mutationErrorState(
      error,
      "草稿暂时无法保存，请稍后重试。",
      values.expectedUpdatedAt,
      kind,
    );
  }

  refresh();

  return {
    message: "草稿已保存。",
    tone: "success",
    updatedAt: data.updated_at,
    saved: true,
  };
}

export async function publishPost(
  kind: PostKind,
  postId: number,
  previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  if (!isPostKind(kind)) {
    return {
      message: "文章种类无效。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  const options = postKindOptions[kind];

  const updatedAt = readString(formData, "expectedUpdatedAt");
  const title = readString(formData, "title").trim();
  const slug = readString(formData, "slug").trim();
  const summary = optionalText(readString(formData, "summary"));
  const bodyMarkdown = readString(formData, "bodyMarkdown");
  const groupMode = readString(formData, "groupMode");
  const groupIdValue = readString(formData, "groupId");
  const groupName = readString(formData, "groupName").trim();
  const groupSlug = readString(formData, "groupSlug").trim();
  const fieldErrors: Partial<Record<DraftField, string>> = {};

  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return {
      message: "草稿标识无效。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  if (!updatedAt) {
    return {
      message: "缺少草稿版本信息，请重新加载后再发布。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  const tagValues = readTagValues(formData, updatedAt);
  if (isActionState(tagValues)) return tagValues;

  if (!title) fieldErrors.title = "发布前请填写标题。";
  if (!slugPattern.test(slug)) {
    fieldErrors.slug = "Slug 只能使用小写字母、数字和单个连字符。";
  }
  if (!bodyMarkdown.trim()) {
    fieldErrors.bodyMarkdown = "发布前请填写 Markdown 正文。";
  }

  let groupId: number | null = null;
  if (groupMode === "create") {
    if (!groupName) {
      fieldErrors.groupName = `请输入${options.groupLabel}名称。`;
    }
    if (!slugPattern.test(groupSlug)) {
      fieldErrors.groupSlug =
        `${options.groupLabel} Slug 只能使用小写字母、数字和单个连字符。`;
    }
  } else {
    groupId = Number(groupIdValue);
    if (!Number.isSafeInteger(groupId) || groupId <= 0) {
      fieldErrors.groupId = `请选择一个${options.singularLabel}${options.groupLabel}。`;
    }
  }

  if (Object.keys(fieldErrors).length) {
    return {
      message: "请修正标出的字段后再发布。",
      tone: "error",
      updatedAt,
      fieldErrors,
    };
  }

  const args: PublishPostArgs = {
    p_post_id: postId,
    p_expected_kind: kind,
    p_expected_updated_at: updatedAt,
    p_group_id: groupId,
    p_new_group_name: groupMode === "create" ? groupName : null,
    p_new_group_slug: groupMode === "create" ? groupSlug : null,
    p_title: title,
    p_slug: slug,
    p_summary: summary,
    p_body_markdown: bodyMarkdown,
    p_tag_ids: tagValues.tagIds,
    p_new_tag_name: tagValues.newTagName,
    p_new_tag_slug: tagValues.newTagSlug,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_post", args);

  if (error || !data?.slug) {
    return publicationErrorState(error, updatedAt, kind);
  }

  let cacheRefreshFailed = false;
  for (const tag of [
    POST_LIST_CACHE_TAG,
    postDetailCacheTag(data.slug),
  ]) {
    try {
      updateTag(tag);
    } catch {
      cacheRefreshFailed = true;
    }
  }

  const publishedPath = `${options.publicBasePath}/${data.slug}`;
  if (cacheRefreshFailed) {
    return {
      message: "文章已保存并发布，但缓存刷新失败；公开页面可能会短暂显示旧内容。",
      tone: "warning",
      updatedAt: data.updated_at,
      publishedPath,
      saved: true,
    };
  }

  return {
    message: "文章已发布，公开页面现在可以访问。",
    tone: "success",
    updatedAt: data.updated_at,
    publishedPath,
    saved: true,
  };
}
