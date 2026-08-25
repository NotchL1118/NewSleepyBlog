const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig =
  url && publishableKey ? { url, publishableKey } : null;

export function requireSupabaseConfig() {
  if (!supabaseConfig) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return supabaseConfig;
}
