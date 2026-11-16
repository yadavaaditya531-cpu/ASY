import Link from "next/link";
import { approvePost, removePost, retryPost, unschedulePost } from "@/app/actions";
import type { Post, PostStatus } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";
import { LocalTime, SubmitButton } from "./ui";

const STATUS: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  scheduled: { label: "Scheduled", className: "bg-indigo-50 text-indigo-700" },
  publishing: { label: "Publishing…", className: "bg-amber-50 text-amber-700" },
  published: { label: "Published", className: "bg-emerald-50 text-emerald-700" },
  partial: { label: "Partly published", className: "bg-amber-50 text-amber-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
};

export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

export function PostCard({ post, actions = true }: { post: Post; actions?: boolean }) {
  const editable = post.status === "draft" || post.status === "scheduled";
  const done = post.status === "published" || post.status === "partial" || post.status === "failed";
  return (
    <article className="card space-y-3">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <StatusBadge status={post.status} />
        {post.scheduledAt ? <LocalTime iso={post.scheduledAt} /> : <span>No time set</span>}
        {post.campaign && <span className="truncate text-xs text-slate-400">Campaign: {post.campaign}</span>}
      </header>

      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{post.content}</p>

      <ul className="space-y-1 text-sm">
        {post.targets.map((target) => (
          <li key={target.id} className="flex flex-wrap items-baseline gap-x-2">
            <span className="size-2 shrink-0 self-center rounded-full" style={{ background: PLATFORMS[target.platform].color }} />
            <span className="text-slate-700">{target.accountLabel}</span>
            {done && target.status === "published" && (
              <span className="text-emerald-700">
                sent
                {target.externalUrl && (
                  <>
                    {" · "}
                    <a href={target.externalUrl} target="_blank" rel="noreferrer" className="underline">
                      view
                    </a>
                  </>
                )}
              </span>
            )}
            {target.status === "failed" && <span className="break-all text-red-600">{target.error}</span>}
          </li>
        ))}
        {!post.targets.length && <li className="text-slate-400">No accounts selected</li>}
      </ul>

      {actions && (
        <footer className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {post.status === "draft" && post.scheduledAt && post.targets.length > 0 && (
            <form action={approvePost.bind(null, post.id)}>
              <SubmitButton className="btn btn-primary btn-sm" pendingText="Approving…">
                Approve &amp; schedule
              </SubmitButton>
            </form>
          )}
          {editable && (
            <Link href={`/compose?id=${post.id}`} className="btn btn-sm">
              Edit
            </Link>
          )}
          {post.status === "scheduled" && (
            <form action={unschedulePost.bind(null, post.id)}>
              <SubmitButton className="btn btn-sm">Back to draft</SubmitButton>
            </form>
          )}
          {(post.status === "failed" || post.status === "partial") && (
            <form action={retryPost.bind(null, post.id)}>
              <SubmitButton className="btn btn-sm" pendingText="Retrying…">
                Retry failed
              </SubmitButton>
            </form>
          )}
          {post.status !== "publishing" && (
            <form action={removePost.bind(null, post.id)} className="ml-auto">
              <SubmitButton className="btn btn-danger btn-sm">Delete</SubmitButton>
            </form>
          )}
        </footer>
      )}
    </article>
  );
}
