import { createFileRoute } from "@tanstack/react-router";
import { sendMetaEvent, trackingFromRequest, type MetaEventName } from "../../lib/meta-capi";

const ALLOWED = new Set<MetaEventName>(["PageView", "ViewContent", "InitiateCheckout", "Purchase"]);

export const Route = createFileRoute("/api/meta/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            eventName?: string;
            eventId?: string;
            email?: string;
            phone?: string;
            fbp?: string;
            fbc?: string;
          };

          const eventName = body.eventName as MetaEventName;
          const eventId = String(body.eventId ?? "").trim();
          if (!ALLOWED.has(eventName) || !eventId) {
            return Response.json({ error: "Evento inválido." }, { status: 400 });
          }

          await sendMetaEvent({
            eventName,
            eventId,
            email: body.email,
            phone: body.phone,
            sourceUrl: new URL(request.url).origin,
            ...trackingFromRequest(request, body),
          });

          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao rastrear evento.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
