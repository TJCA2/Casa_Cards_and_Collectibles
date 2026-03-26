const BASE =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Cache token in memory to avoid re-fetching on every request
let _token: { value: string; expiresAt: number } | null = null;

export async function getPayPalToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value;

  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token request failed: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _token = {
    value: data.access_token,
    // Expire 60 s early to avoid using a token right at expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return _token.value;
}

export async function paypalRequest<T = unknown>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const token = await getPayPalToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`PayPal API error (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}
