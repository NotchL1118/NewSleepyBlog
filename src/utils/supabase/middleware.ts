import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!supabaseConfig) {
    return request.nextUrl.pathname.startsWith("/dashboard")
      ? NextResponse.redirect(new URL("/", request.url))
      : supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  if (
    request.nextUrl.pathname.startsWith("/dashboard") &&
    !data?.claims
  ) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie),
    );
    return redirectResponse;
  }

  return supabaseResponse;
}
