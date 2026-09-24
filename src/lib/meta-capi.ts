import { createHash } from "node:crypto";

const PRODUCT_AMOUNT = 23.99;
const PRODUCT_CURRENCY = "BRL";

export type MetaEventName = "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function trackingFromRequest(request: Request, body?: { fbp?: string; fbc?: string }) {
  const cookie = request.headers.get("cookie");
  return {
    clientIp:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "",
    userAgent: request.headers.get("user-agent") || "",
    fbp: body?.fbp || cookieValue(cookie, "_fbp"),
    fbc: body?.fbc || cookieValue(cookie, "_fbc"),
  };
}

export async function sendMetaEvent({
  eventName,
  eventId,
  email,
  phone,
  clientIp,
  userAgent,
  fbp,
  fbc,
  sourceUrl,
}: {
  eventName: MetaEventName;
  eventId: string;
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
}) {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!pixelId || !token) return { skipped: true as const };

  const userData: Record<string, unknown> = {
    country: [sha256("br")],
  };

  if (email) {
    const normalized = normalizeEmail(email);
    userData.em = [sha256(normalized)];
    userData.external_id = [sha256(normalized)];
  }
  if (phone) userData.ph = [sha256(normalizePhone(phone))];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim() || "TEST13776";

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl || "https://lp-tufos.vercel.app/",
        user_data: userData,
        custom_data: {
          currency: PRODUCT_CURRENCY,
          value: PRODUCT_AMOUNT,
          content_name: "Biblioteca VIP",
          content_type: "product",
          content_ids: ["biblioteca-vip"],
        },
      },
    ],
    test_event_code: testEventCode,
  };

  const response = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Meta CAPI error", eventName, text);
    throw new Error(`Falha ao enviar ${eventName} para o Meta.`);
  }

  return { skipped: false as const };
}
