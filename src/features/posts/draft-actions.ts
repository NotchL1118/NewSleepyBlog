"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/server";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.generated";
import {
  REGULAR_POST_LIST_CACHE_TAG,
  regularPostDetailCacheTag,
} from "./public-posts";

export type DraftField =
  | "bodyMarkdown"
  | "categoryName"
  | "categorySlug"
  | "groupId"
  | "slug"
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
};

type CreateDraftArgs =
  Database["public"]["Functions"]["create_post_draft"]["Args"];
type UpdateDraftArgs =
  Database["public"]["Functions"]["update_post_draft"]["Args"];
type PublishRegularPostArgs =
  Database["public"]["Functions"]["publish_regular_post"]["Args"];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalText(value: string) {
  return value.trim() ? value : null;
}

function readDraftValues(formData: FormData): DraftValues | DraftActionState {
  const groupIdValue = readString(formData, "groupId");
  const groupId = groupIdValue ? Number(groupIdValue) : null;
  const slug = optionalText(readString(formData, "slug")?.trim());

  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId <= 0)) {
    return {
      message: "请选择有效的分类。",
      tone: "error",
      updatedAt: readString(formData, "expectedUpdatedAt") || null,
    };
  }

  if (slug !== null && !slugPattern.test(slug)) {
    return {
      message: "Slug 只能使用小写字母、数字和单个连字符。",
      tone: "error",
      updatedAt: readString(formData, "expectedUpdatedAt") || null,
    };
  }

  return {
    groupId,
    title: optionalText(readString(formData, "title")),
    slug,
    summary: optionalText(readString(formData, "summary")),
    bodyMarkdown: readString(formData, "bodyMarkdown"),
    expectedUpdatedAt: readString(formData, "expectedUpdatedAt") || null,
  };
}

function isActionState(
  value: DraftValues | DraftActionState,
): value is DraftActionState {
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
  return args;
}

function mutationErrorState(
  code: string | undefined,
  fallback: string,
  updatedAt: string | null,
): DraftActionState {
  if (code === "40001") {
    return {
      message: "这篇草稿已在别处更新。请重新加载后再保存，避免覆盖较新的内容。",
      tone: "error",
      updatedAt,
    };
  }

  if (code === "23505") {
    return {
      message: "这个 Slug 已被其他文章使用。",
      tone: "error",
      updatedAt,
      fieldErrors: { slug: "请输入尚未被其他文章使用的 Slug。" },
    };
  }

  if (code === "23503") {
    return {
      message: "所选分类不存在，或不属于普通文章。",
      tone: "error",
      updatedAt,
    };
  }

  return { message: fallback, tone: "error", updatedAt };
}

function publicationErrorState(
  error: { code?: string; message?: string } | null,
  updatedAt: string,
): DraftActionState {
  if (error?.code === "40001") {
    return {
      message: "这篇草稿已在别处更新。请重新加载后再发布。",
      tone: "error",
      updatedAt,
    };
  }

  if (error?.code === "23505") {
    const categoryConflict = error.message?.includes("post_groups") ?? false;
    const categoryNameConflict =
      error.message?.includes("post_groups_kind_name_key") ?? false;
    return {
      message: categoryConflict
        ? "这个分类名称或 Slug 已存在。"
        : "这个文章 Slug 已被使用。",
      tone: "error",
      updatedAt,
      fieldErrors: categoryConflict
        ? categoryNameConflict
          ? { categoryName: "这个分类名称已被使用。" }
          : { categorySlug: "这个分类 Slug 已被使用。" }
        : { slug: "请输入尚未被其他文章使用的 Slug。" },
    };
  }

  if (error?.code === "23503") {
    return {
      message: "所选分类不存在，或不属于普通文章。",
      tone: "error",
      updatedAt,
      fieldErrors: { groupId: "请重新选择普通文章分类。" },
    };
  }

  return {
    message: "文章暂时无法发布，请稍后重试。",
    tone: "error",
    updatedAt,
  };
}

export async function createRegularPostDraft(
  _previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  const values = readDraftValues(formData);
  if (isActionState(values)) return values;

  const args = addOptionalValues<CreateDraftArgs>(
    { p_kind: "regular" },
    values,
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_post_draft", args);

  if (error || !data) {
    return mutationErrorState(
      error?.code,
      "草稿暂时无法保存，请稍后重试。",
      null,
    );
  }

  redirect(`/dashboard/posts/${data.id}`);
}

export async function updateRegularPostDraft(
  postId: number,
  previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return {
      message: "草稿标识无效。",
      tone: "error",
      updatedAt: previousState.updatedAt,
    };
  }

  const values = readDraftValues(formData);
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
      error?.code,
      "草稿暂时无法保存，请稍后重试。",
      values.expectedUpdatedAt,
    );
  }

  return {
    message: "草稿已保存。",
    tone: "success",
    updatedAt: data.updated_at,
  };
}

export async function publishRegularPost(
  postId: number,
  previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  await requireAdmin();

  const updatedAt = readString(formData, "expectedUpdatedAt");
  const title = readString(formData, "title").trim();
  const slug = readString(formData, "slug").trim();
  const summary = optionalText(readString(formData, "summary"));
  const bodyMarkdown = readString(formData, "bodyMarkdown");
  const categoryMode = readString(formData, "categoryMode");
  const groupIdValue = readString(formData, "groupId");
  const categoryName = readString(formData, "categoryName").trim();
  const categorySlug = readString(formData, "categorySlug").trim();
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

  if (!title) fieldErrors.title = "发布前请填写标题。";
  if (!slugPattern.test(slug)) {
    fieldErrors.slug = "Slug 只能使用小写字母、数字和单个连字符。";
  }
  if (!bodyMarkdown.trim()) {
    fieldErrors.bodyMarkdown = "发布前请填写 Markdown 正文。";
  }

  let groupId: number | null = null;
  if (categoryMode === "create") {
    if (!categoryName) fieldErrors.categoryName = "请输入分类名称。";
    if (!slugPattern.test(categorySlug)) {
      fieldErrors.categorySlug =
        "分类 Slug 只能使用小写字母、数字和单个连字符。";
    }
  } else {
    groupId = Number(groupIdValue);
    if (!Number.isSafeInteger(groupId) || groupId <= 0) {
      fieldErrors.groupId = "请选择一个普通文章分类。";
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

  const args: PublishRegularPostArgs = {
    p_post_id: postId,
    p_expected_updated_at: updatedAt,
    p_group_id: groupId,
    p_new_group_name: categoryMode === "create" ? categoryName : null,
    p_new_group_slug: categoryMode === "create" ? categorySlug : null,
    p_title: title,
    p_slug: slug,
    p_summary: summary,
    p_body_markdown: bodyMarkdown,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_regular_post", args);

  if (error || !data?.slug) {
    return publicationErrorState(error, updatedAt);
  }

  let cacheRefreshFailed = false;
  for (const tag of [
    REGULAR_POST_LIST_CACHE_TAG,
    regularPostDetailCacheTag(data.slug),
  ]) {
    try {
      updateTag(tag);
    } catch {
      cacheRefreshFailed = true;
    }
  }

  const publishedPath = `/posts/${data.slug}`;
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
