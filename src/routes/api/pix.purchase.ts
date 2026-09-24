import { createFileRoute } from "@tanstack/react-router";
import { sendMetaEvent, trackingFromRequest } from "../../lib/meta-capi";
import { getTransactionStatus } from "../../lib/syncpay";

const PAID_STATUSES = new Set(["completed", "paid", "approved", "confirmed", "success"]);

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export const Route = createFileRoute("/api/pix/purchase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            identifier?: string;
            email?: string;
            phone?: string;
            fbp?: string;
            fbc?: string;
          };

          const identifier = String(body.identifier ?? "").trim();
          const email = String(body.email ?? "").trim().toLowerCase();
          const phone = digits(String(body.phone ?? ""));

          if (!identifier || !email || phone.length < 10) {
            return Response.json({ error: "Dados incompletos." }, { status: 400 });
          }

          const transaction = await getTransactionStatus(identifier);
          if (!PAID_STATUSES.has(transaction.status)) {
            return Response.json({ ok: false, status: transaction.status });
          }

          const tracking = trackingFromRequest(request, body);
          await sendMetaEvent({
            eventName: "Purchase",
            eventId: `${identifier}:Purchase`,
            email,
            phone,
            sourceUrl: new URL(request.url).origin,
            ...tracking,
          });

          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao rastrear compra.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
