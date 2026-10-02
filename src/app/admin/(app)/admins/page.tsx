import AdminList from "./AdminList";
import { getAdminContext } from "@/lib/celebration/db";

export const metadata = { title: "Admins" };

export default async function AdminsPage() {
  const { supabase, user } = await getAdminContext();
  const { data } = await supabase.from("admin_users").select("user_id, email, created_at").order("created_at");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Family admins</h1>
        <p className="mt-1 max-w-2xl text-stone-600">
          Admins can see contributor contact details and change everything about every event. Each person needs a login
          first: create it in Supabase under <strong>Authentication → Users → Add user</strong>, then approve their email
          here.
        </p>
      </div>
      <AdminList admins={(data ?? []) as { user_id: string; email: string | null; created_at: string }[]} currentUserId={user?.id ?? ""} />
    </div>
  );
}
