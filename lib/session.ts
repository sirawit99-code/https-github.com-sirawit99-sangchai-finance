const encoder = new TextEncoder();

type SessionPayload = { email: string; expiresAt: number };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_NOT_CONFIGURED");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createSession(email: string) {
  const payload: SessionPayload = { email: email.toLowerCase(), expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${await signature(encoded)}`;
}

export async function readSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature || suppliedSignature !== await signature(encoded)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    return payload.expiresAt > Date.now() && payload.email ? payload : null;
  } catch {
    return null;
  }
}
