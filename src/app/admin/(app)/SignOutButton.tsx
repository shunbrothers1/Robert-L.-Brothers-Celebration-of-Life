"use client";

import { useRouter } from "next/navigation";
import { adminBrowserClient } from "@/lib/celebration/browser";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await adminBrowserClient().auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
