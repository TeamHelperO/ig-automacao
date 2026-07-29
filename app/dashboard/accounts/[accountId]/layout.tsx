import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { redirect } from "next/navigation";

// A navegação (voltar, avatar/@, abas) já vive na sidebar — esse layout
// só garante que a pessoa tem acesso à conta antes de mostrar a página.
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const current = await getCurrentUser();
  if (!current) return null;

  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) redirect("/dashboard");

  return <div className="px-8 py-10">{children}</div>;
}
