import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import AutomationsList from "./automations-list";

export const dynamic = "force-dynamic";

export default async function AccountAutomationsPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const { data: automations } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Link
          href={`/dashboard/accounts/${accountId}/automations/nova`}
          className="btn btn-primary"
        >
          + Nova automação
        </Link>
      </div>

      <AutomationsList accountId={accountId} initialAutomations={automations ?? []} />
    </div>
  );
}
