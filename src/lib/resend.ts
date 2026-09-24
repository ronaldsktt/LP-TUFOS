const TELEGRAM_URL =
  process.env.DELIVERY_TELEGRAM_URL?.trim() || "https://t.me/+ZaDfdoV-HOo4NGYx";

export async function sendAccessEmail(email: string, identifier?: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("RESEND_API_KEY ausente; e-mail de acesso não enviado.");
    return { skipped: true as const };
  }

  const from = process.env.RESEND_FROM?.trim() || "Biblioteca VIP <acesso@secrettoons.online>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(identifier ? { "Idempotency-Key": identifier } : {}),
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Seu acesso à Biblioteca VIP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h1 style="font-size:22px;margin:0 0 12px">Pagamento confirmado</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
            Seu acesso foi liberado. Entre no grupo do Telegram para receber o conteúdo:
          </p>
          <p style="margin:0 0 24px">
            <a href="${TELEGRAM_URL}" style="display:inline-block;background:#f59e0b;color:#111;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
              Entrar no Telegram
            </a>
          </p>
          <p style="font-size:13px;color:#555;word-break:break-all">${TELEGRAM_URL}</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Resend error", text);
    throw new Error("Falha ao enviar e-mail de acesso.");
  }

  return { skipped: false as const };
}
