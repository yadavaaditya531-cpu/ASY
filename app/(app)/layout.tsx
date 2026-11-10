import Link from "next/link";
import { logout } from "@/app/actions";
import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 border-slate-200 px-4 py-4 md:w-56 md:border-r md:py-6">
        <Link href="/" className="px-3 text-lg font-bold tracking-tight">
          ASY<span className="text-brand">.</span>
        </Link>
        <Nav />
        {process.env.APP_PASSWORD && (
          <form action={logout} className="md:mt-auto">
            <button className="btn btn-sm w-full">Sign out</button>
          </form>
        )}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
