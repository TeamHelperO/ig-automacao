import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import UsersTable from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .order("created_at", { ascending: false });

  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .order("price_cents", { ascending: true });

  const { data: accounts } = await supabaseAdmin.from("accounts").select("id, user_id");
  const countByUser = new Map<string, number>();
  for (const a of accounts ?? []) {
    countByUser.set(a.user_id, (countByUser.get(a.user_id) ?? 0) + 1);
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    accounts_count: countByUser.get(p.id) ?? 0,
  }));

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Super Admin</h1>
        <Link href="/admin/planos" className="text-sm text-neutral-500 underline">
          Gerenciar planos
        </Link>
      </div>

      <UsersTable users={users} plans={plans ?? []} />
    </main>
  );
}
