import { NextResponse, type NextRequest } from "next/server";
import {
  getTrustedRequestOrigin,
  hasSupabaseEnv,
  sanitizeNextPath,
} from "@/features/auth/config";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const origin = getTrustedRequestOrigin(request.url);
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

  if (providerError) {
    return NextResponse.redirect(new URL("/?auth_error=oauth_denied", origin));
  }

  if (code && hasSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/?auth_error=oauth_callback", origin));
}
