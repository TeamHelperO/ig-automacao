import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import PlansManager from "./plans-manager";

export const dynamic = "force-dynamic";

export default async function AdminPlanosPage() {
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .order("price_cents", { ascending: true });

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin" className="text-sm text-neutral-500">
        ← Usuários
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 mt-2 mb-8">
        Planos
      </h1>
      <PlansManager initialPlans={plans ?? []} />
    </main>
  );
}
