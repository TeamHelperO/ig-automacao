import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida o cabeçalho X-Hub-Signature-256 que a Meta manda em todo POST
 * de webhook: HMAC-SHA256 do corpo CRU (raw bytes, antes de qualquer
 * JSON.parse) usando a Chave Secreta do App do Instagram.
 *
 * IMPORTANTE: precisa do corpo cru, por isso no route.ts lemos com
 * request.text() em vez de request.json() antes de validar.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;

  const [algo, signatureHex] = signatureHeader.split("=");
  if (algo !== "sha256" || !signatureHex) return false;

  const expectedHex = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(signatureHex, "hex");

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
