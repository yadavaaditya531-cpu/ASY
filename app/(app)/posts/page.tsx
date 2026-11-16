import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { countPostsByStatus, listPosts, type PostStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; statuses?: PostStatus[]; order?: "upcoming" }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts", statuses: ["draft"], order: "upcoming" },
  { key: "scheduled", label: "Scheduled", statuses: ["scheduled", "publishing"], order: "upcoming" },
  { key: "published", label: "Published", statuses: ["published", "partial"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
];

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { status, error } = await searchParams;
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];
  const posts = listPosts({ statuses: tab.statuses, order: tab.order });
  const counts = countPostsByStatus();
  const countFor = (t: (typeof TABS)[number]) =>
    (t.statuses ?? (Object.keys(counts) as PostStatus[])).reduce((sum, s) => sum + counts[s], 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <Link href="/compose" className="btn btn-primary">
          New post
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/posts" : `/posts?status=${t.key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              t === tab ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label} <span className="text-slate-400 tabular-nums">{countFor(t)}</span>
          </Link>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {posts.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-slate-500">No posts here yet.</p>
      )}
    </div>
  );
}
