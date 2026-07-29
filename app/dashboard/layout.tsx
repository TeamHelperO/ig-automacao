import { getCurrentUser } from "@/lib/supabase-server-auth";
import Sidebar from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--paper)] flex">
      <Sidebar email={current?.authUser.email} isSuperAdmin={current?.profile?.is_super_admin} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
