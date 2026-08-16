import { getSiteUrl } from "@/config/site";

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getBrowserAuthCallback(pathname: string) {
  const currentUrl = new URL(window.location.href);
  const isLocal = ["localhost", "127.0.0.1"].includes(currentUrl.hostname);
  const origin = isLocal ? currentUrl.origin : getSiteUrl().origin;
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", sanitizeNextPath(pathname));
  return callbackUrl.toString();
}

export function getTrustedRequestOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl);
  return ["localhost", "127.0.0.1"].includes(requestOrigin.hostname)
    ? requestOrigin.origin
    : getSiteUrl().origin;
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
