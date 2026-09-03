"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  publishBlogPost,
  saveBlogPost,
  unpublishBlogPost,
} from "@/lib/studio/blogActions";
import type { BlogPost } from "@/lib/studio/blog";

/**
 * Blog editor.
 *
 * ── The bug this version fixes ───────────────────────────────────────────────
 * Publish used to send only the post id, so the server validated whatever was
 * last *saved* rather than what was on screen. Choosing a reviewer and clicking
 * Publish without saving first produced "Set a qualified reviewer" while the
 * dropdown plainly showed one.
 *
 * Publish now submits the whole form and the server saves before it validates,
 * so the two can no longer disagree. The unsaved-changes marker below exists
 * for the same reason: never let the UI imply a state the database does not
 * hold.
 *
 * Markdown in a plain textarea rather than a rich-text editor is deliberate — a
 * WYSIWYG means a new dependency, a sanitiser, and a class of formatting bugs,
 * for content that is almost entirely headings, paragraphs and lists.
 */

const CLUSTERS = ["diagnostic", "ingredient", "routine", "myth", "pakistan"] as const;
const MIN_PUBLISH_CHARS = 1200;

type Props = {
  post: BlogPost | null;
  authors: { slug: string; name: string }[];
  reviewers: { slug: string; name: string; credentials: string }[];
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#662d91]";

export default function BlogEditor({ post, authors, reviewers }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [body, setBody] = useState(post?.bodyMarkdown ?? "");
  const [reviewer, setReviewer] = useState(post?.reviewerSlug ?? "");
  const [metaDesc, setMetaDesc] = useState(post?.metaDescription ?? "");

  const chars = body.trim().length;
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const longEnough = chars >= MIN_PUBLISH_CHARS;
  const canPublish = Boolean(reviewer) && longEnough;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setMessage(ok);
        setDirty(false);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  function onSave(formData: FormData) {
    run(() => saveBlogPost(formData), "Saved.");
  }

  /**
   * Publish submits the form's *current* values rather than the post id, so
   * unsaved edits — the reviewer especially — are written before validation.
   */
  function onPublish() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    run(() => publishBlogPost(formData), "Published — it is live on /blog now.");
  }

  function onUnpublish() {
    if (!post) return;
    run(() => unpublishBlogPost(post.id), "Moved back to draft.");
  }

  return (
    <form
      ref={formRef}
      action={onSave}
      onChange={() => setDirty(true)}
      className="px-6 py-8"
    >
      <input type="hidden" name="id" defaultValue={post?.id ?? ""} />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {post ? "Edit post" : "New post"}
          </h1>
          {post ? (
            <p className="mt-1 font-mono text-xs text-neutral-400">
              /blog/{post.slug} · {post.status}
              {dirty ? (
                <span className="ml-2 font-sans text-amber-700">
                  unsaved changes
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>

          {post && post.status !== "published" ? (
            <button
              type="button"
              onClick={onPublish}
              disabled={pending || !canPublish}
              title={
                canPublish
                  ? "Saves your changes, then publishes"
                  : !reviewer
                    ? "Choose a reviewer first"
                    : "Needs more content before it can go live"
              }
              className="rounded-xl bg-[#662d91] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Publishing…" : "Save & publish"}
            </button>
          ) : null}

          {post && post.status === "published" ? (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={pending}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── Content ── */}
        <div className="space-y-5">
          <Field label="Title">
            <input name="title" defaultValue={post?.title ?? ""} className={input} required />
          </Field>

          <Field label="Slug" hint="Leave blank to generate from the title.">
            <input name="slug" defaultValue={post?.slug ?? ""} className={input} />
          </Field>

          <Field label="Excerpt" hint="One or two sentences. Shown on the blog index.">
            <textarea
              name="excerpt"
              defaultValue={post?.excerpt ?? ""}
              rows={2}
              className={input}
            />
          </Field>

          <Field
            label="Body (Markdown)"
            hint="## headings, - lists, **bold**, [links](https://…). Phrase H2s as the question someone would actually search — those become FAQ schema."
          >
            <textarea
              name="body_markdown"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={26}
              className={`${input} font-mono text-[13px] leading-relaxed`}
            />
          </Field>

          <p className="text-xs text-neutral-500">
            {words.toLocaleString()} words · {chars.toLocaleString()} characters{" "}
            {longEnough ? (
              <span className="text-emerald-700">· long enough to publish</span>
            ) : (
              <span className="text-amber-700">
                · needs {(MIN_PUBLISH_CHARS - chars).toLocaleString()} more characters
              </span>
            )}
          </p>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Accountability
            </p>

            <div className="mt-4 space-y-4">
              <Field label="Author">
                <select
                  name="author_slug"
                  defaultValue={post?.authorSlug ?? "ayma-arif"}
                  className={input}
                >
                  {authors.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Reviewer"
                hint="Required to publish. This is the E-E-A-T signal."
              >
                <select
                  name="reviewer_slug"
                  value={reviewer}
                  onChange={(e) => {
                    setReviewer(e.target.value);
                    setDirty(true);
                  }}
                  className={input}
                >
                  <option value="">— not reviewed —</option>
                  {reviewers.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} ({r.credentials})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Search
            </p>

            <div className="mt-4 space-y-4">
              <Field label="Target keyword">
                <input
                  name="target_keyword"
                  defaultValue={post?.targetKeyword ?? ""}
                  className={input}
                />
              </Field>

              <Field label="Cluster">
                <select
                  name="cluster"
                  defaultValue={post?.cluster ?? "diagnostic"}
                  className={input}
                >
                  {CLUSTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Meta title" hint="Falls back to the post title.">
                <input
                  name="meta_title"
                  defaultValue={post?.metaTitle ?? ""}
                  className={input}
                />
              </Field>

              <Field label="Meta description">
                <textarea
                  name="meta_description"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  rows={3}
                  className={input}
                />
                <span
                  className={`mt-1 block text-xs ${
                    metaDesc.length >= 150 && metaDesc.length <= 160
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {metaDesc.length} / 150–160 characters
                </span>
              </Field>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
