// Shared, configurable lists (ADR-0022). Edit here; every site picks them up on its next build.

// Click IDs captured into first and last touch, and the source/medium each one implies.
export const CLICK_IDS: Record<string, { source: string; medium: string }> = {
  gclid: { source: "google", medium: "cpc" },
  gbraid: { source: "google", medium: "cpc" },
  wbraid: { source: "google", medium: "cpc" },
  msclkid: { source: "bing", medium: "cpc" },
  fbclid: { source: "facebook", medium: "social" },
  ttclid: { source: "tiktok", medium: "cpc" },
  li_fat_id: { source: "linkedin", medium: "cpc" },
  twclid: { source: "twitter", medium: "cpc" },
};

// Referrer domains, matched on the registrable part of the host (`www.google.co.in` → google).
export const SEARCH_ENGINES: Record<string, string> = {
  google: "google",
  bing: "bing",
  yahoo: "yahoo",
  duckduckgo: "duckduckgo",
  baidu: "baidu",
  yandex: "yandex",
  ecosia: "ecosia",
  brave: "brave",
};

export const SOCIAL_NETWORKS: Record<string, string> = {
  facebook: "facebook",
  fb: "facebook",
  instagram: "instagram",
  linkedin: "linkedin",
  lnkd: "linkedin",
  "t.co": "twitter",
  twitter: "twitter",
  x: "twitter",
  youtube: "youtube",
  tiktok: "tiktok",
  pinterest: "pinterest",
  reddit: "reddit",
  whatsapp: "whatsapp",
};
