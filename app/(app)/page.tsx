import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { countPostsByStatus, getBrand, listAccounts, listPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const accounts = listAccounts();
  const counts = countPostsByStatus();
  const upcoming = listPosts({ statuses: ["scheduled"], order: "upcoming", limit: 4 });
  const recent = listPosts({ statuses: ["published", "partial", "failed"], limit: 4 });
  const brand = getBrand();

  const stats = [
    { label: "Scheduled", value: counts.scheduled, href: "/posts?status=scheduled" },
    { label: "Drafts to review", value: counts.draft, href: "/posts?status=draft" },
    { label: "Published", value: counts.published + counts.partial, href: "/posts?status=published" },
    { label: "Failed", value: counts.failed, href: "/posts?status=failed" },
  ];
  const steps = [
    { done: accounts.length > 0, label: "Connect an account", href: "/accounts" },
    { done: Boolean(brand.name || brand.description), label: "Describe your brand for the AI", href: "/settings" },
    { done: Object.values(counts).some((n) => n > 0), label: "Create your first post", href: "/compose" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{brand.name || "Dashboard"}</h1>
        <div className="flex gap-2">
          <Link href="/campaign" className="btn">
            AI campaign
          </Link>
          <Link href="/compose" className="btn btn-primary">
            New post
          </Link>
        </div>
      </div>

      {steps.some((s) => !s.done) && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Get set up</h2>
          <ol className="space-y-1.5 text-sm">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-xs ${
                    step.done ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
                {step.done ? (
                  <span className="text-slate-400 line-through">{step.label}</span>
                ) : (
                  <Link href={step.href} className="text-brand font-medium underline">
                    {step.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card transition hover:border-slate-300">
            <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Up next</h2>
          {upcoming.length ? (
            upcoming.map((post) => <PostCard key={post.id} post={post} actions={false} />)
          ) : (
            <p className="text-sm text-slate-500">Nothing scheduled.</p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="font-semibold">Recently sent</h2>
          {recent.length ? (
            recent.map((post) => <PostCard key={post.id} post={post} actions={false} />)
          ) : (
            <p className="text-sm text-slate-500">Nothing published yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
