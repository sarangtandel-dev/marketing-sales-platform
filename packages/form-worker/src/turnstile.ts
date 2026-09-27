const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = { success: boolean; hostname?: string; errors: string[] };

// Server-side Turnstile check (ADR-0013 step 1). Any failure to verify counts as a failed check.
// The hostname tells us which site the token was solved on (widgets are shared, ADR-0028).
export async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<TurnstileResult> {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body });
    if (!res.ok) return { success: false, errors: [`http-${res.status}`] };
    const data = (await res.json()) as { success?: boolean; hostname?: string; "error-codes"?: string[] };
    return { success: data.success === true, hostname: data.hostname, errors: data["error-codes"] ?? [] };
  } catch {
    return { success: false, errors: ["network"] };
  }
}
