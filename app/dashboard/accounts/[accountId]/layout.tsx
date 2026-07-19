import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AccountSubnav from "./account-subnav";

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

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", current.authUser.id)
    .maybeSingle();

  if (!account) redirect("/dashboard");

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--ink-faint)]">
        ← Todas as contas
      </Link>

      <div className="flex items-center gap-3 mt-3 mb-6">
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

      <AccountSubnav accountId={accountId} />

      <div className="mt-6">{children}</div>
    </main>
  );
}
