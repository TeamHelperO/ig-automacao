import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import AutomationsList from "./automations-list";

export const dynamic = "force-dynamic";

export default async function AccountAutomationsPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", current.authUser.id)
    .maybeSingle();

  if (!account) redirect("/dashboard");

  const { data: automations } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--ink-faint)]">
        ← Todas as contas
      </Link>
      <div className="flex items-center gap-3 mt-3 mb-8">
        {account.ig_profile_picture_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.ig_profile_picture_url}
            alt=""
            className="w-11 h-11 rounded-full object-cover"
          />
        )}
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          @{account.ig_username}
        </h1>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--ink-soft)] uppercase tracking-wide">
          Automações
        </h2>
        <Link
          href={`/dashboard/accounts/${accountId}/automations/nova`}
          className="btn btn-primary"
        >
          + Nova automação
        </Link>
      </div>

      <AutomationsList accountId={accountId} initialAutomations={automations ?? []} />
    </main>
  );
}
