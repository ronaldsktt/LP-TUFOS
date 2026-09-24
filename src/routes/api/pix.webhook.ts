import { createFileRoute } from "@tanstack/react-router";
import { sendMetaEvent } from "../../lib/meta-capi";
import { sendAccessEmail } from "../../lib/resend";

const PAID_STATUSES = new Set(["completed", "paid", "approved", "confirmed", "success"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseBuyer(description: string) {
  const parts = description.split("|").map((part) => part.trim());
  const email = parts.find((part) => part.includes("@")) || "";
  const phone = (parts.find((part) => /^\d{10,13}$/.test(part.replace(/\D/g, ""))) || "").replace(/\D/g, "");
  return { email: email.toLowerCase(), phone };
}

export const Route = createFileRoute("/api/pix/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = asRecord(await request.json());
          const data = asRecord(payload.data);
          const status = text(data.status || payload.status).toLowerCase();
          const identifier = text(data.identifier || payload.identifier);
          const description = text(data.description || payload.description);
          const { email, phone } = parseBuyer(description);

          console.log("SyncPay webhook", JSON.stringify({ status, identifier, email, phone }));

          if (identifier && email && PAID_STATUSES.has(status)) {
            if (phone) {
              await sendMetaEvent({
                eventName: "Purchase",
                eventId: `${identifier}:Purchase`,
                email,
                phone,
                sourceUrl: new URL(request.url).origin,
              }).catch((error) => console.error(error));
            }
            await sendAccessEmail(email, identifier).catch((error) => console.error(error));
          }
        } catch {
          console.log("SyncPay webhook received a non-JSON body");
        }
        return Response.json({ received: true });
      },
    },
  },
});
