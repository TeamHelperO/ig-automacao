import "server-only";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const mpPayment = new Payment(client);
export const mpPreApproval = new PreApproval(client);
