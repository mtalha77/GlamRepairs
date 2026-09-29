/**
 * What a post must be before it can be published — HOTFIX-47 §1.
 *
 * Shared by the editor (live counter, disabled button) and the publish
 * action, and mirrored by the `studio_blog_posts_published_is_finished`
 * CHECK constraint, which is the rule that actually holds: it also covers
 * the bundle publish, which puts linked drafts live without passing through
 * the single-post checks, and anything run by hand in SQL. That gap is how
 * an outline went live behind a finished pillar.
 */

/** Thin content drags on the whole domain, not just the page itself. */
export const MIN_PUBLISH_CHARS = 3000;

/**
 * Keep in step with the CHECK constraint: the markers are case-sensitive
 * (so "your todo list" in real prose is fine), lorem ipsum is not.
 */
const PLACEHOLDERS = [/_To write\._|DRAFT OUTLINE|\bTODO\b/, /lorem ipsum/i];

/** The placeholder text found in a body, or null when there is none. */
export function placeholderIn(body: string): string | null {
  for (const re of PLACEHOLDERS) {
    const m = body.match(re);
    if (m) return m[0];
  }
  return null;
}

/** Postgres' message for the constraint, turned into something actionable. */
export function explainPublishRefusal(message: string): string | null {
  if (!/studio_blog_posts_published_is_finished/.test(message)) return null;
  return (
    "One of the posts in this set is still an outline or under " +
    `${MIN_PUBLISH_CHARS.toLocaleString("en-GB")} characters, so none were published. ` +
    "Finish it, or remove the link to it, then publish again."
  );
}
