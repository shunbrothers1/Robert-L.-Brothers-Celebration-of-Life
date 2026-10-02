"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminBrowserClient } from "@/lib/celebration/browser";

/** Only ever send someone back inside /admin after login — never to an arbitrary URL. */
function safeNext(next: string | null) {
  return next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await adminBrowserClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match."
          : /fetch/i.test(error.message)
            ? "We couldn't reach the server. Please check your connection and try again."
            : error.message
      );
      return;
    }
    router.push(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <main className="m-page flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="m-card w-full max-w-sm space-y-5 p-7">
        <div className="text-center">
          <p className="m-eyebrow">Family Admin</p>
          <h1 className="mt-2 font-display text-2xl font-semibold">Sign in</h1>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}
        <div>
          <label className="m-label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required autoComplete="username" className="m-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="m-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="m-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="m-btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
