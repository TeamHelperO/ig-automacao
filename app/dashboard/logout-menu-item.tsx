"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { DropdownItem } from "@/components/dropdown-menu";

export default function LogoutMenuItem() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <DropdownItem onClick={handleLogout}>Sair</DropdownItem>;
}
