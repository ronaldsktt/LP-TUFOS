import { createFileRoute } from "@tanstack/react-router";
import { createCashIn } from "../../lib/syncpay";

const PRODUCT_AMOUNT = 23.99;
const PRODUCT_DESCRIPTION = "Biblioteca VIP - Acesso vitalício";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function nameFromEmail(email: string) {
  const raw = email.split("@")[0] ?? "Cliente";
  return raw
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Cliente";
}

export const Route = createFileRoute("/api/pix/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            email?: string;
            phone?: string;
            name?: string;
            cpf?: string;
          };

          const email = String(body.email ?? "").trim().toLowerCase();
          const phone = digits(String(body.phone ?? ""));
          const cpf = digits(String(body.cpf ?? ""));
          const name = String(body.name ?? "").trim() || nameFromEmail(email);

          if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) {
            return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
          }
          if (phone.length < 10 || phone.length > 11) {
            return Response.json({ error: "Informe um telefone com DDD." }, { status: 400 });
          }
          if (cpf.length !== 11) {
            return Response.json({ error: "Informe um CPF válido." }, { status: 400 });
          }

          const origin = new URL(request.url).origin;
          const result = await createCashIn({
            amount: PRODUCT_AMOUNT,
            description: PRODUCT_DESCRIPTION,
            webhookUrl: `${origin}/api/pix/webhook`,
            client: { name, cpf, email, phone },
          });

          return Response.json({
            identifier: result.identifier,
            pixCode: result.pixCode,
            amount: PRODUCT_AMOUNT,
            email,
            phone,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao gerar Pix.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
