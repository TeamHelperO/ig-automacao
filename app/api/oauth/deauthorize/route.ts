import { NextRequest, NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/verify-signed-request";
import { supabaseAdmin } from "@/lib/supabase";

// ---------------------------------------------------------
// POST: a Meta chama essa rota quando o usuário revoga, pela
// própria conta do Instagram, o acesso concedido ao app. O
// corpo vem como form-urlencoded com o campo "signed_request".
// A Meta não espera nenhum corpo específico de resposta, só
// um status 200 confirmando o recebimento.
// ---------------------------------------------------------
export async function POST(req: NextRequest) {
  const appSecret = process.env.IG_APP_SECRET!;

  const form = await req.formData();
  const signedRequest = form.get("signed_request")?.toString();

  if (!signedRequest) {
    return new NextResponse("signed_request ausente", { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  const igUserId: string | undefined = payload.user_id?.toString();

  if (igUserId) {
    try {
      // Marca a conta como desconectada em vez de apagar tudo na
      // hora — mantém histórico de automações/contatos, mas invalida
      // o token, já que ele deixou de ser válido no lado da Meta.
      await supabaseAdmin
        .from("accounts")
        .update({
          access_token: null,
          token_expires_at: null,
        })
        .eq("ig_user_id", igUserId);
    } catch (err) {
      console.error("Erro ao desconectar conta via deauthorize:", err);
      // mesmo com erro interno, respondemos 200 pra Meta — o log
      // acima é o que vamos usar pra investigar depois
    }
  }

  return NextResponse.json({ ok: true });
}