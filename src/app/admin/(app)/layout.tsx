import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";
import { getAdminContext } from "@/lib/celebration/db";

// Every /admin page re-checks admin status on the server. This decides
// what renders; RLS on every table independently enforces the same rule,
// so even a crafted request from a non-admin session gets nothing.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdminContext();
  if (!user) redirect("/admin/login");

  if (!isAdmin) {
    return (
      <main className="m-page flex items-center justify-center px-4">
        <div className="m-card max-w-md space-y-4 p-8 text-center">
          <p className="font-display text-2xl font-semibold">Not approved yet</p>
          <p className="text-slate-600">
            You&apos;re signed in as <strong>{user.email}</strong>, but this account hasn&apos;t been approved as a family
            admin. Ask an existing admin to add you from the Admins page.
          </p>
          <SignOutButton className="m-btn-outline" />
        </div>
      </main>
    );
  }

  return (
    <div className="m-page text-[15px]">
      <header className="border-b border-mist-300 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Family Admin
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-mist-200">
              Events
            </Link>
            <Link href="/admin/admins" className="rounded-lg px-3 py-2 hover:bg-mist-200">
              Admins
            </Link>
            <SignOutButton className="rounded-lg px-3 py-2 text-slate-600 hover:bg-mist-200" />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
