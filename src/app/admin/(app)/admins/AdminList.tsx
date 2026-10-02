"use client";

import { useState } from "react";
import { ErrorNote, useAdminAction } from "../_components/useAdminAction";
import { adminBrowserClient } from "@/lib/celebration/browser";

export default function AdminList({
  admins,
  currentUserId,
}: {
  admins: { user_id: string; email: string | null; created_at: string }[];
  currentUserId: string;
}) {
  const { run, busy, error } = useAdminAction();
  const [email, setEmail] = useState("");
  const db = adminBrowserClient();

  return (
    <div className="space-y-4">
      <ul className="m-card divide-y divide-mist-200">
        {admins.map((a) => (
          <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span>
              {a.email ?? a.user_id}
              {a.user_id === currentUserId && <span className="ml-2 text-sm text-slate-500">(you)</span>}
            </span>
            {a.user_id !== currentUserId && (
              <button
                type="button"
                className="m-admin-btn bg-white text-red-700 ring-1 ring-mist-400 hover:bg-red-50"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove ${a.email} as an admin?`)) run(() => db.from("admin_users").delete().eq("user_id", a.user_id));
                }}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="m-card flex flex-wrap items-end gap-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => db.rpc("add_memorial_admin", { p_email: email }))) setEmail("");
        }}
      >
        <div className="min-w-[16rem] flex-1">
          <label className="m-label" htmlFor="new-admin">
            Approve another admin by email
          </label>
          <input id="new-admin" type="email" required className="m-admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800" disabled={busy}>
          Approve admin
        </button>
      </form>
      <ErrorNote error={error} />
    </div>
  );
}
