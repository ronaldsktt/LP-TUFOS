import { FormEvent, useEffect, useMemo, useState } from "react";

const PRODUCT_PRICE = "R$ 23,99";

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

function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function PixCheckout({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
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
          cpf: onlyDigits(cpf),
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
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#0b0702] text-white shadow-[0_20px_80px_rgba(251,191,36,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-amber-300/80">Checkout Pix</div>
            <div className="font-semibold text-lg">Biblioteca VIP · {PRODUCT_PRICE}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {step === "form" && (
          <form onSubmit={(event) => void submit(event)} className="space-y-4 px-5 py-5">
            <p className="text-sm text-white/65">
              Preencha os dados para enviarmos o acesso depois do pagamento.
            </p>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-widest text-amber-200/80">E-mail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-3 text-sm outline-none ring-amber-400/40 focus:ring-2"
                placeholder="seu@email.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-widest text-amber-200/80">Telefone</span>
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhone(event.target.value))}
                className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-3 text-sm outline-none ring-amber-400/40 focus:ring-2"
                placeholder="(11) 99999-9999"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-widest text-amber-200/80">CPF</span>
              <input
                required
                inputMode="numeric"
                value={cpf}
                onChange={(event) => setCpf(maskCpf(event.target.value))}
                className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-3 text-sm outline-none ring-amber-400/40 focus:ring-2"
                placeholder="000.000.000-00"
              />
            </label>
            <p className="text-[11px] text-white/40">
              O CPF é exigido pela SyncPay para emitir o Pix.
            </p>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-md bg-gradient-to-b from-amber-300 to-amber-700 text-sm font-semibold uppercase tracking-wider text-black disabled:opacity-60"
            >
              {loading ? "Gerando Pix..." : "Gerar Pix"}
            </button>
          </form>
        )}

        {step === "pix" && (
          <div className="space-y-4 px-5 py-5 text-center">
            <p className="text-sm text-white/70">Escaneie o QR Code ou copie o código Pix.</p>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Pix"
                className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
              />
            ) : null}
            <textarea
              readOnly
              value={pixCode}
              className="h-24 w-full resize-none rounded-md border border-white/10 bg-black/60 p-3 text-[11px] text-white/80"
            />
            <button
              type="button"
              onClick={() => void copyPix()}
              className="flex h-12 w-full items-center justify-center rounded-md bg-gradient-to-b from-amber-300 to-amber-700 text-sm font-semibold uppercase tracking-wider text-black"
            >
              {copied ? "Código copiado" : "Copiar código Pix"}
            </button>
            <p className="text-xs text-amber-200/80">Aguardando pagamento...</p>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </div>
        )}

        {step === "paid" && (
          <div className="space-y-3 px-5 py-8 text-center">
            <div className="text-3xl">✓</div>
            <h3 className="text-xl font-semibold">Pagamento confirmado</h3>
            <p className="text-sm text-white/70">
              Vamos enviar o acesso para <strong>{email}</strong>
              {phone ? ` e ${phone}` : ""}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-md bg-gradient-to-b from-amber-300 to-amber-700 text-sm font-semibold uppercase tracking-wider text-black"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
