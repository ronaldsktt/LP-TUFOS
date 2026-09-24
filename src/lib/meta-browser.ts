export const META_PIXEL_ID = "908334682079725";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function readCookie(name: string) {
  const raw = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return raw ? decodeURIComponent(raw.slice(name.length + 1)) : "";
}

export function metaCookies() {
  return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}

function eventId(name: string) {
  const key = `meta_event_${name}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, id);
  return id;
}

export function trackBrowser(eventName: string, eventID: string, params?: Record<string, unknown>) {
  window.fbq?.("track", eventName, params ?? {}, { eventID });
}

export async function trackMeta(eventName: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase", extra?: {
  eventId?: string;
  email?: string;
  phone?: string;
}) {
  const id = extra?.eventId || eventId(eventName);
  trackBrowser(eventName, id, {
    value: 23.99,
    currency: "BRL",
    content_name: "Biblioteca VIP",
    content_type: "product",
  });
  await fetch("/api/meta/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      eventId: id,
      email: extra?.email,
      phone: extra?.phone,
      ...metaCookies(),
    }),
  }).catch(() => undefined);
  return id;
}
