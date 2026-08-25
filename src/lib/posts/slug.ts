/**
 * Slug rules shared by Posts and Post Groups.
 *
 * This mirrors the `posts_slug_check` and `post_groups_slug_check` constraints
 * in `supabase/migrations/`. The database stays the authority; this copy exists
 * so the Studio can name the offending field before the write is attempted.
 * Change both sides together.
 */
const SLUG_BODY = "[a-z0-9]+(?:-[a-z0-9]+)*";

/**
 * Anchored form, for validating a whole value. The trailing `(?![\s\S])`
 * rather than `$` is deliberate: JavaScript's `$` also matches before a final
 * newline, so `/^[a-z0-9]+$/` accepts `"post\n"` while the Postgres constraint
 * rejects it. This spelling is a true end-of-input anchor, like Postgres.
 */
export const SLUG_PATTERN = new RegExp(`^${SLUG_BODY}(?![\\s\\S])`);

/** Unanchored form, for an `<input pattern>` attribute (implicitly anchored). */
export const SLUG_INPUT_PATTERN = SLUG_BODY;

export function isValidSlug(value: string) {
  return SLUG_PATTERN.test(value);
}
