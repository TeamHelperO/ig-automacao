import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import CollaboratorsManager from "./collaborators-manager";

export const dynamic = "force-dynamic";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("user_id")
    .eq("id", accountId)
    .maybeSingle();

  const isOwner = account?.user_id === current.authUser.id;

  const { data: collaborators } = await supabaseAdmin
    .from("account_collaborators")
    .select("*, profiles(email)")
    .eq("account_id", accountId);

  if (!isOwner) {
    return (
      <p className="text-sm text-[var(--ink-soft)]">
        Só o dono da conta pode gerenciar a equipe.
      </p>
    );
  }

  return (
    <CollaboratorsManager
      accountId={accountId}
      initialCollaborators={(collaborators ?? []) as any}
    />
  );
}
