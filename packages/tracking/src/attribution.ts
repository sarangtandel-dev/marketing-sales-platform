import { CLICK_IDS, SEARCH_ENGINES, SOCIAL_NETWORKS } from "./sources.ts";

// First touch and last non-direct touch (ADR-0022). No personal data: the landing page is
// stored without its query string, and UTM values that look like an email or phone are dropped.

export type Touch = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  click_ids?: Record<string, string>;
  landing_page: string;
  at: string;
};

const UTM = ["source", "medium", "campaign", "content", "term"] as const;
const EMAIL = /[^\s@]+@[^\s@]+/;
const PHONE = /\+?\d[\d\s().-]{6,}\d/;
const looksPersonal = (v: string) => EMAIL.test(v) || PHONE.test(v);

// "www.google.co.in" → "google"; "t.co" stays "t.co" because it's listed whole.
function siteName(host: string): string {
  const parts = host.replace(/^www\./, "").split(".");
  const joined = parts.join(".");
  if (joined in SOCIAL_NETWORKS || joined in SEARCH_ENGINES) return joined;
  const secondLevel = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);
  const i = parts.length >= 3 && secondLevel.has(parts[parts.length - 2]) ? parts.length - 3 : parts.length - 2;
  return parts[Math.max(i, 0)];
}

function fromReferrer(referrer: string, ownHost: string): { source: string; medium: string } | null {
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return null;
  }
  if (!host || host === ownHost) return null;
  const name = siteName(host);
  if (SEARCH_ENGINES[name]) return { source: SEARCH_ENGINES[name], medium: "organic" };
  if (SOCIAL_NETWORKS[name]) return { source: SOCIAL_NETWORKS[name], medium: "social" };
  return { source: host.replace(/^www\./, ""), medium: "referral" };
}

// The touch this page view represents, or null for a direct visit (which never overwrites last touch).
export function currentTouch(url: URL, referrer: string, now: Date): Touch | null {
  const params = url.searchParams;
  const utm: Partial<Record<(typeof UTM)[number], string>> = {};
  for (const key of UTM) {
    const value = params.get(`utm_${key}`);
    if (value && !looksPersonal(value)) utm[key] = value.slice(0, 200);
  }
  const clickIds: Record<string, string> = {};
  for (const id of Object.keys(CLICK_IDS)) {
    const value = params.get(id);
    if (value) clickIds[id] = value.slice(0, 500);
  }
  const firstClick = Object.keys(clickIds)[0];
  const fromClick = firstClick ? CLICK_IDS[firstClick] : null;
  const fromRef = fromReferrer(referrer, url.hostname);

  if (!utm.source && !utm.medium && !fromClick && !fromRef) return null;
  const touch: Touch = {
    source: utm.source ?? fromClick?.source ?? fromRef?.source ?? "(direct)",
    medium: utm.medium ?? fromClick?.medium ?? fromRef?.medium ?? "(none)",
    landing_page: url.pathname,
    at: now.toISOString(),
  };
  if (utm.campaign) touch.campaign = utm.campaign;
  if (utm.content) touch.content = utm.content;
  if (utm.term) touch.term = utm.term;
  if (firstClick) touch.click_ids = clickIds;
  return touch;
}

export const directTouch = (url: URL, now: Date): Touch => ({
  source: "(direct)",
  medium: "(none)",
  landing_page: url.pathname,
  at: now.toISOString(),
});

export function withoutClickIds(touch: Touch): Touch {
  const { click_ids: _, ...rest } = touch;
  return rest;
}
