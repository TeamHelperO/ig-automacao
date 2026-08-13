import { createHmac, timingSafeEqual } from "crypto";

/**
 * Decodifica e valida o campo "signed_request" que a Meta manda
 * (form-urlencoded) nos callbacks de "Desautorização" e "Exclusão
 * de dados". Formato: "<assinatura_base64url>.<payload_base64url>",
 * onde a assinatura é HMAC-SHA256(payload_base64url, appSecret).
 *
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/permissions/data-deletion-callback/
 *
 * Retorna o payload decodificado (contém pelo menos "user_id", que
 * no caso do login do Instagram é o ig_user_id do usuário), ou
 * `null` se a assinatura for inválida.
 */
export function parseSignedRequest(
  signedRequest: string,
  appSecret: string
): Record<string, any> | null {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) return null;

  const expectedSig = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  const receivedSig = base64UrlDecode(encodedSig);

  if (expectedSig.length !== receivedSig.length) return null;
  if (!timingSafeEqual(expectedSig, receivedSig)) return null;

  const payloadJson = base64UrlDecode(encodedPayload).toString("utf8");
  return JSON.parse(payloadJson);
}

function base64UrlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64");
}