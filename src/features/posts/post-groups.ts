import type { PostKind } from "./types";

type PostGroupKindQuery<TResult> = {
  eq(column: "kind", value: PostKind): TResult;
};

export function constrainPostGroupsToKind<TResult>(
  query: PostGroupKindQuery<TResult>,
  kind: PostKind,
) {
  return query.eq("kind", kind);
}
