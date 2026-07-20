// Wrapper fino sobre a API "Instagram com Login do Instagram".
// Base: https://graph.instagram.com, versão v25.0.
// Docs de referência usadas ao montar isto: endpoints de mensagens,
// respostas privadas a comentário, replies públicas e assinatura de app.

const GRAPH_BASE = "https://graph.instagram.com/v25.0";
const AUTH_BASE = "https://api.instagram.com";
const OAUTH_AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export function buildLoginUrl(params: {
  appId: string;
  redirectUri: string;
  state?: string;
}) {
  const url = new URL(OAUTH_AUTHORIZE_BASE);
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", IG_SCOPES);
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
}

/** Troca o "code" do redirect por um token de curta duração (~1h). */
export async function exchangeCodeForShortToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}) {
  const form = new URLSearchParams({
    client_id: params.appId,
    client_secret: params.appSecret,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const res = await fetch(`${AUTH_BASE}/oauth/access_token`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Falha ao trocar code por token curto: ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    user_id: number;
    permissions: string[];
  };
}

/** Troca o token curto por um token longo (~60 dias). */
export async function exchangeForLongLivedToken(params: {
  appSecret: string;
  shortToken: string;
}) {
  const url = new URL(`${GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("access_token", params.shortToken);

  // A documentação da Meta diz GET, mas na prática a API vem rejeitando
  // GET nesse endpoint ("Unsupported request - method type: get").
  // POST com os mesmos parâmetros na query resolve.
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Falha ao trocar por token longo: ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number; // segundos, ~5184000 (60 dias)
  };
}

/** Renova um token longo ainda válido, estendendo por mais 60 dias. */
export async function refreshLongLivedToken(accessToken: string) {
  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  // mesmo motivo do comentário acima: POST em vez de GET
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

export async function getProfile(accessToken: string) {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set(
    "fields",
    "user_id,username,name,profile_picture_url"
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Falha ao buscar perfil: ${await res.text()}`);
  return (await res.json()) as {
    user_id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export async function subscribeWebhookFields(params: {
  igUserId: string;
  accessToken: string;
}) {
  const url = new URL(
    `${GRAPH_BASE}/${params.igUserId}/subscribed_apps`
  );
  url.searchParams.set("subscribed_fields", "comments,messages");
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Falha ao assinar webhooks: ${await res.text()}`);
  }
  return res.json();
}

export async function listMedia(params: {
  igUserId: string;
  accessToken: string;
  limit?: number;
}) {
  const url = new URL(`${GRAPH_BASE}/${params.igUserId}/media`);
  url.searchParams.set(
    "fields",
    "id,media_type,media_url,thumbnail_url,caption,permalink,timestamp"
  );
  url.searchParams.set("limit", String(params.limit ?? 25));
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Falha ao listar posts: ${await res.text()}`);
  return (await res.json()) as {
    data: Array<{
      id: string;
      media_type: string;
      media_url?: string;
      thumbnail_url?: string;
      caption?: string;
      permalink: string;
      timestamp: string;
    }>;
  };
}

type QuickReplyButton = { title: string; payload: string };

/**
 * Envia uma mensagem. Use `recipient.comment_id` para resposta privada a
 * um comentário (fura a janela de 24h, 1x por comentário, até 7 dias
 * depois) ou `recipient.id` para uma DM normal dentro de uma conversa já
 * aberta (últimas 24h, ou resposta a story/dm recebida).
 */
export async function sendMessage(params: {
  igUserId: string;
  accessToken: string;
  recipient: { id: string } | { comment_id: string };
  text?: string;
  buttonUrl?: { text: string; buttonLabel: string; url: string };
  quickReplies?: QuickReplyButton[];
}) {
  const url = new URL(`${GRAPH_BASE}/${params.igUserId}/messages`);
  url.searchParams.set("access_token", params.accessToken);

  let message: Record<string, unknown>;

  if (params.buttonUrl) {
    message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: params.buttonUrl.text,
          buttons: [
            {
              type: "web_url",
              url: params.buttonUrl.url,
              title: params.buttonUrl.buttonLabel,
            },
          ],
        },
      },
    };
  } else {
    message = { text: params.text ?? "" };
  }

  if (params.quickReplies?.length) {
    message.quick_replies = params.quickReplies.map((q) => ({
      content_type: "text",
      title: q.title,
      payload: q.payload,
    }));
  }

  const body = { recipient: params.recipient, message };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao enviar mensagem: ${JSON.stringify(json)}`);
  }
  return json as { recipient_id?: string; message_id?: string };
}

/** Comenta publicamente em resposta a um comentário (opcional). */
export async function replyToComment(params: {
  commentId: string;
  accessToken: string;
  text: string;
}) {
  const url = new URL(`${GRAPH_BASE}/${params.commentId}/replies`);
  url.searchParams.set("access_token", params.accessToken);
  url.searchParams.set("message", params.text);

  const res = await fetch(url.toString(), { method: "POST" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao responder comentário: ${JSON.stringify(json)}`);
  }
  return json;
}
