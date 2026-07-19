"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DisconnectButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    if (!confirm("Desconectar essa conta? As automações dela vão parar de funcionar.")) return;
    setLoading(true);
    await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={handleDisconnect} disabled={loading} className="btn-danger-text text-xs">
      {loading ? "..." : "Desconectar"}
    </button>
  );
}
