export function normalizeAuthRedirectPath(value: string | null | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  return value;
}
