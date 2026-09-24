import { FormEvent, useEffect, useMemo, useState } from "react";

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
      className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold uppercase tracking-wide text-[#1a0a00] disabled:opacity-60"
      style={GOLD_BUTTON_STYLE}
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

  useEffect(() => {
    if (!open) {
      setStep("form");
      setError("");
      setLoading(false);
      setPixCode("");
      setIdentifier("");
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== "pix" || !identifier) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(`/api/pix/status?id=${encodeURIComponent(identifier)}`);
        const data = (await response.json()) as { status?: string };
        if (!cancelled && data.status === "completed") {
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-2xl border border-[#2a3344] bg-[#0f1724] px-6 pb-6 pt-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-xl leading-none text-white/55 hover:text-white"
          aria-label="Fechar"
        >
          ×
        </button>

        {step === "form" && (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="pr-6">
              <h2 className="text-[22px] font-semibold leading-tight text-white">Falta pouco pra entrar!</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                Vamos enviar seu acesso no e-mail e WhatsApp informados.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">E-mail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-lg border border-[#2b3648] bg-[#0b1220] px-3 text-sm text-white outline-none transition focus:border-amber-400"
                placeholder="seu@email.com"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
                WhatsApp (com DDD)
              </span>
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhone(event.target.value))}
                className="h-12 w-full rounded-lg border border-[#2b3648] bg-[#0b1220] px-3 text-sm text-white outline-none transition focus:border-amber-400"
                placeholder="(11) 99999-9999"
              />
            </label>

            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-white/70">Total</span>
              <span className="text-lg font-semibold text-amber-400">{PRODUCT_PRICE}</span>
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <GoldButton type="submit" disabled={loading}>
              {loading ? "Gerando Pix..." : "Gerar Pix"}
            </GoldButton>

            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-white/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pagamento processado com segurança via SyncPay
            </p>
          </form>
        )}

        {step === "pix" && (
          <div className="space-y-4 text-center">
            <div className="pr-6 text-left">
              <h2 className="text-[22px] font-semibold leading-tight text-white">Pague com Pix</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                Escaneie o QR Code ou copie o código para concluir o pagamento de {PRODUCT_PRICE}.
              </p>
            </div>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Pix"
                className="mx-auto h-52 w-52 rounded-xl bg-white p-2"
              />
            ) : null}
            <textarea
              readOnly
              value={pixCode}
              className="h-24 w-full resize-none rounded-lg border border-[#2b3648] bg-[#0b1220] p-3 text-[11px] text-white/80"
            />
            <GoldButton onClick={() => void copyPix()}>
              {copied ? "Código copiado" : "Copiar código Pix"}
            </GoldButton>
            <p className="text-xs text-amber-300/80">Aguardando pagamento...</p>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </div>
        )}

        {step === "paid" && (
          <div className="space-y-4 py-4 text-center">
            <h2 className="text-[22px] font-semibold text-white">Pagamento confirmado</h2>
            <p className="text-sm text-white/65">
              Vamos enviar o acesso para <strong>{email}</strong>
              {phone ? ` e ${phone}` : ""}.
            </p>
            <GoldButton onClick={onClose}>Fechar</GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
