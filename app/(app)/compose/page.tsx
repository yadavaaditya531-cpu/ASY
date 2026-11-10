import { notFound } from "next/navigation";
import { Composer } from "@/components/Composer";
import { getPost, listAccounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const post = id ? getPost(id) : null;
  if (id && (!post || (post.status !== "draft" && post.status !== "scheduled"))) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{post ? "Edit post" : "New post"}</h1>
      <Composer key={post?.id ?? "new"} accounts={listAccounts()} post={post ?? undefined} />
    </div>
  );
}
