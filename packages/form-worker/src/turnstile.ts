const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Server-side Turnstile check (ADR-0013 step 1). Any failure to verify counts as a failed check.
export async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
