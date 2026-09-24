const SYNC_API = "https://api.syncpayments.com.br";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variável ${name} não configurada no servidor.`);
  }
  return value;
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message || json.error || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

export async function getSyncPayToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`${SYNC_API}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: requiredEnv("SYNCPAY_CLIENT_ID"),
      client_secret: requiredEnv("SYNCPAY_CLIENT_SECRET"),
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao autenticar na SyncPay: ${await readError(response)}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("A SyncPay não retornou access_token.");
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

export type CashInInput = {
  amount: number;
  description: string;
  webhookUrl?: string;
  client: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
  };
};

export type CashInResult = {
  identifier: string;
  pixCode: string;
};

export async function createCashIn(input: CashInInput): Promise<CashInResult> {
  const token = await getSyncPayToken();
  const response = await fetch(`${SYNC_API}/api/partner/v1/cash-in`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      description: input.description,
      webhook_url: input.webhookUrl,
      client: input.client,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao gerar Pix: ${await readError(response)}`);
  }

  const data = (await response.json()) as {
    identifier?: string;
    pix_code?: string;
    pixCode?: string;
    paymentCode?: string;
  };

  const pixCode = data.pix_code || data.pixCode || data.paymentCode;
  const identifier = data.identifier;
  if (!pixCode || !identifier) {
    throw new Error("A SyncPay não retornou o código Pix.");
  }

  return { identifier, pixCode };
}

export async function getTransactionStatus(identifier: string) {
  const token = await getSyncPayToken();
  const response = await fetch(`${SYNC_API}/api/partner/v1/transaction/${identifier}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar Pix: ${await readError(response)}`);
  }

  const payload = (await response.json()) as {
    data?: { status?: string; pix_code?: string | null; amount?: number };
    status?: string;
  };

  return {
    status: (payload.data?.status || payload.status || "pending").toLowerCase(),
    pixCode: payload.data?.pix_code ?? null,
    amount: payload.data?.amount ?? null,
  };
}
