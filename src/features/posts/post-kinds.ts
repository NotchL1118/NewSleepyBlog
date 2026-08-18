import type { PostKind } from "./types";

export type PostKindOptions = {
  singularLabel: string;
  pluralLabel: string;
  groupLabel: string;
  publicBasePath: string;
  studioBasePath: string;
};

export const postKindOptions = {
  regular: {
    singularLabel: "普通文章",
    pluralLabel: "普通文章",
    groupLabel: "分类",
    publicBasePath: "/posts",
    studioBasePath: "/dashboard/posts",
  },
  heartwork: {
    singularLabel: "心作",
    pluralLabel: "心作",
    groupLabel: "专栏",
    publicBasePath: "/heartworks",
    studioBasePath: "/dashboard/heartworks",
  },
} as const satisfies Record<PostKind, PostKindOptions>;

export function isPostKind(value: string): value is PostKind {
  return value === "regular" || value === "heartwork";
}
