const PRODUCTION_AUTH_ORIGIN = "https://lsyfighting.cn";
const LOCAL_AUTH_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getBrowserAuthCallback(pathname: string) {
  const currentUrl = new URL(window.location.href);
  const origin = LOCAL_AUTH_HOSTS.has(currentUrl.hostname)
    ? currentUrl.origin
    : PRODUCTION_AUTH_ORIGIN;
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", sanitizeNextPath(pathname));
  return callbackUrl.toString();
}

export function getTrustedRequestOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl);
  return LOCAL_AUTH_HOSTS.has(requestOrigin.hostname)
    ? requestOrigin.origin
    : PRODUCTION_AUTH_ORIGIN;
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
