import { createFileRoute } from "@tanstack/react-router";
import { sendMetaEvent, trackingFromRequest } from "../../lib/meta-capi";
import { createCashIn } from "../../lib/syncpay";

const PRODUCT_AMOUNT = 4;

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export const Route = createFileRoute("/api/pix/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            email?: string;
            phone?: string;
            fbp?: string;
            fbc?: string;
          };

          const email = String(body.email ?? "").trim().toLowerCase();
          const phone = digits(String(body.phone ?? ""));

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
          }
          if (phone.length < 10 || phone.length > 11) {
            return Response.json({ error: "Informe um telefone com DDD." }, { status: 400 });
          }

          const origin = new URL(request.url).origin;
          const result = await createCashIn({
            amount: PRODUCT_AMOUNT,
            description: `Biblioteca VIP | ${email} | ${phone}`,
            webhookUrl: `${origin}/api/pix/webhook`,
          });

          const tracking = trackingFromRequest(request, body);
          await sendMetaEvent({
            eventName: "InitiateCheckout",
            eventId: `${result.identifier}:InitiateCheckout`,
            email,
            phone,
            sourceUrl: origin,
            ...tracking,
          }).catch((error) => console.error(error));

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
