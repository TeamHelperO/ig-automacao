import { NextRequest, NextResponse } from "next/server";
import { drainQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await drainQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Erro ao drenar fila:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
