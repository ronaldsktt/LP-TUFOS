import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pix/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = await request.json();
          console.log("SyncPay webhook", JSON.stringify(payload));
        } catch {
          console.log("SyncPay webhook received a non-JSON body");
        }
        return Response.json({ received: true });
      },
    },
  },
});
