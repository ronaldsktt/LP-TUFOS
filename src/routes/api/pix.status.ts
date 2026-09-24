import { createFileRoute } from "@tanstack/react-router";
import { getTransactionStatus } from "../../lib/syncpay";

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
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao consultar Pix.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
