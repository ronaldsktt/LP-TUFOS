import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

const PRODUCT_PRICE = "R$ 23,99";
const GOLD_BUTTON_STYLE = {
  backgroundImage: "linear-gradient(rgb(252, 211, 77), rgb(245, 158, 11) 60%, rgb(180, 83, 9))",
  boxShadow:
    "rgba(0, 0, 0, 0.35) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.7) 0px 1px 0px 0px inset, rgba(251, 191, 36, 0.55) 0px 10px 30px -8px",
} as const;

type Step = "form" | "pix" | "paid";

type Props = {
  open: boolean;
  onClose: () => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const fieldBoxStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  height: 48,
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid #2b3648",
  background: "#0b1220",
  padding: "0 14px",
};

const fieldInputStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: 0,
  outline: "none",
  background: "transparent",
  boxShadow: "none",
  color: "#fff",
  fontSize: 15,
  lineHeight: "20px",
  textAlign: "left",
  fontFamily: "Inter, system-ui, sans-serif",
  WebkitAppearance: "none",
  appearance: "none",
};

function GoldButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...GOLD_BUTTON_STYLE,
        width: "100%",
        height: 48,
        border: 0,
        borderRadius: 12,
        color: "#1a0a00",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

export function PixCheckout({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [copied, setCopied] = useState(false);
  const [deliveryUrl, setDeliveryUrl] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("form");
      setError("");
      setLoading(false);
      setPixCode("");
      setIdentifier("");
      setCopied(false);
      setDeliveryUrl("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== "pix" || !identifier) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(`/api/pix/status?id=${encodeURIComponent(identifier)}`);
        const data = (await response.json()) as { status?: string; deliveryUrl?: string | null };
        if (!cancelled && data.status === "completed") {
          setDeliveryUrl(data.deliveryUrl || "");
          setStep("paid");
        }
      } catch {
        // keep waiting
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, step, identifier]);

  const qrUrl = useMemo(() => {
    if (!pixCode) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(pixCode)}`;
  }, [pixCode]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: onlyDigits(phone),
        }),
      });
      const data = (await response.json()) as { error?: string; pixCode?: string; identifier?: string };
      if (!response.ok || !data.pixCode || !data.identifier) {
        throw new Error(data.error || "Não foi possível gerar o Pix.");
      }
      setPixCode(data.pixCode);
      setIdentifier(data.identifier);
      setStep("pix");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.78)",
        padding: 16,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <style>{`
        .pix-modal input,
        .pix-modal input[type="text"],
        .pix-modal input[type="email"],
        .pix-modal input[type="tel"] {
          all: unset !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          color: #fff !important;
          font-size: 15px !important;
          line-height: 20px !important;
          text-align: left !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          font-family: Inter, system-ui, sans-serif !important;
        }
        .pix-modal input::placeholder {
          color: rgba(255,255,255,0.38) !important;
        }
      `}</style>
      <div
        className="pix-modal"
        style={{
          position: "relative",
          width: "min(100%, 400px)",
          borderRadius: 18,
          background: "#101828",
          border: "1px solid #2a3344",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          padding: "28px 24px 22px",
          color: "#fff",
          textAlign: "left",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 28,
            height: 28,
            border: 0,
            background: "transparent",
            color: "rgba(255,255,255,0.55)",
            fontSize: 22,
            lineHeight: "28px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {step === "form" && (
          <form onSubmit={(event) => void submit(event)} style={{ display: "grid", gap: 16 }} autoComplete="off">
            <div>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: "30px", fontWeight: 700, color: "#fff", textAlign: "center" }}>
                Falta pouco para entrar!
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: "20px", color: "rgba(255,255,255,0.62)", textAlign: "center" }}>
                Vamos enviar seu acesso no e-mail e WhatsApp informados.
              </p>
            </div>

            <label style={{ display: "grid", gap: 8, textAlign: "left" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                E-mail
              </span>
              <div style={fieldBoxStyle}>
                <input required type="text" inputMode="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" style={fieldInputStyle} />
              </div>
            </label>

            <label style={{ display: "grid", gap: 8, textAlign: "left" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                WhatsApp (com DDD)
              </span>
              <div style={fieldBoxStyle}>
                <input required type="text" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} placeholder="(11) 98765-4321" style={fieldInputStyle} />
              </div>
            </label>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.72)" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#f5c14a" }}>{PRODUCT_PRICE}</span>
            </div>

            {error ? <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", textAlign: "center" }}>{error}</p> : null}
            <GoldButton type="submit" disabled={loading}>{loading ? "Gerando Pix..." : "Gerar Pix"}</GoldButton>
            <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.42)", textAlign: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pagamento processado com segurança via SyncPay
            </p>
          </form>
        )}

        {step === "pix" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: "30px", fontWeight: 700, textAlign: "center" }}>Pague com Pix</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: "20px", color: "rgba(255,255,255,0.62)", textAlign: "center" }}>
                Escaneie o QR Code ou copie o código para concluir o pagamento de {PRODUCT_PRICE}.
              </p>
            </div>
            {qrUrl ? <img src={qrUrl} alt="QR Code Pix" style={{ width: 208, height: 208, margin: "0 auto", borderRadius: 12, background: "#fff", padding: 8 }} /> : null}
            <textarea readOnly value={pixCode} style={{ width: "100%", height: 88, resize: "none", borderRadius: 10, border: "1px solid #2b3648", background: "#0b1220", color: "rgba(255,255,255,0.8)", padding: 12, fontSize: 11, textAlign: "left", fontFamily: "Inter, system-ui, sans-serif" }} />
            <GoldButton onClick={() => void copyPix()}>{copied ? "Código copiado" : "Copiar código Pix"}</GoldButton>
            <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: "rgba(245,193,74,0.85)" }}>Aguardando pagamento...</p>
            {error ? <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", textAlign: "center" }}>{error}</p> : null}
          </div>
        )}

        {step === "paid" && (
          <div style={{ display: "grid", gap: 16, textAlign: "center", padding: "8px 0" }}>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: "30px", fontWeight: 700 }}>Pagamento confirmado</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", color: "rgba(255,255,255,0.65)" }}>
              Seu acesso foi liberado. Entre no grupo do Telegram para receber o conteúdo.
            </p>
            {deliveryUrl ? (
              <a href={deliveryUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <GoldButton>Entrar no Telegram</GoldButton>
              </a>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                Vamos enviar o link para <strong>{email}</strong>{phone ? ` e ${phone}` : ""}.
              </p>
            )}
            <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
