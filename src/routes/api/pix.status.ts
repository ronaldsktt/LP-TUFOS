import { createFileRoute } from "@tanstack/react-router";
import { getTransactionStatus } from "../../lib/syncpay";

const PAID_STATUSES = new Set(["completed", "paid", "approved", "confirmed", "success"]);
const TELEGRAM_URL =
  process.env.DELIVERY_TELEGRAM_URL?.trim() || "https://t.me/+ZaDfdoV-HOo4NGYx";

export const Route = createFileRoute("/api/pix/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const identifier = new URL(request.url).searchParams.get("id")?.trim();
          if (!identifier) {
            return Response.json({ error: "Identificador ausente." }, { status: 400 });
          }

          const result = await getTransactionStatus(identifier);
          const paid = PAID_STATUSES.has(result.status);
          return Response.json({
            ...result,
            status: paid ? "completed" : result.status,
            deliveryUrl: paid ? TELEGRAM_URL : null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao consultar Pix.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
