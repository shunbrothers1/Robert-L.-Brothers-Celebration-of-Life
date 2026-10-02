"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError, type DbError } from "@/lib/celebration/errors";

/**
 * Runs an admin mutation, shows the database's friendly error if it fails
 * (e.g. the capacity trigger's ITEM_FULL), and refreshes the server data
 * when it succeeds.
 */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => PromiseLike<{ error: DbError }>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const { error } = await action();
        if (error) {
          setError(friendlyError(error));
          return false;
        }
        router.refresh();
        return true;
      } catch {
        setError("Something went wrong. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  return { run, busy, error, setError };
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[15px] text-red-800 ring-1 ring-red-200">
      {error}
    </p>
  );
}
