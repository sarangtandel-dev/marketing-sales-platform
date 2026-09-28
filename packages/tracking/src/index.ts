import { currentTouch, directTouch, redactedPageUrl, redactedReferrer, type Touch, withoutClickIds } from "./attribution.ts";
import { type ConsentState, watchConsent } from "./consent.ts";
import { listenForClicks, pushEvent } from "./events.ts";

// The site tracking script (ADR-0022). It stores nothing until Consent Mode says
// analytics_storage is granted; click IDs also need ad_storage (ADR-0020).

const DAY = 86_400_000;
const RETENTION_DAYS = 90;
const KEYS = { first: "msp_first_touch", last: "msp_last_touch", known: "msp_known_contact" } as const;

type Stored<T> = { value: T; expires: string };

function read<T>(key: string, now: Date): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as Stored<T>;
    if (Date.parse(stored.expires) <= now.getTime()) {
      localStorage.removeItem(key);
      return undefined;
    }
    return stored.value;
  } catch {
    return undefined;
  }
}

// Replaces a stored value but keeps its original expiry.
function rewrite<T>(key: string, value: T) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Stored<T> | null;
    if (stored) localStorage.setItem(key, JSON.stringify({ value, expires: stored.expires }));
  } catch {
    // best-effort, like write()
  }
}

function write<T>(key: string, value: T, now: Date) {
  const stored: Stored<T> = { value, expires: new Date(now.getTime() + RETENTION_DAYS * DAY).toISOString() };
  try {
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // Storage full or blocked: attribution is best-effort.
  }
}

const now = () => new Date();
const url = new URL(location.href);
// Computed once per page view, stored only if and when consent allows.
const pageTouch = currentTouch(url, document.referrer, now());

// Consent Mode basic (ADR-0020): GTM, and so every Google tag, loads only after
// analytics consent. The container ID comes from the site definition via window.mspConfig.
let gtmLoaded = false;
function loadGtm(consent: ConsentState) {
  const id = (window as unknown as { mspConfig?: { gtm?: string | null } }).mspConfig?.gtm;
  if (gtmLoaded || !id) return;
  gtmLoaded = true;
  const dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer;
  // GA4 reads page_location and page_referrer from here instead of the raw URLs (see gtm/container.json).
  dataLayer.push({
    page_location: redactedPageUrl(url, consent.ads),
    page_referrer: redactedReferrer(document.referrer, url, consent.ads),
  });
  dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function forget() {
  try {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing could have been stored either.
  }
}

// Without advertising consent, stored touches keep everything except their click IDs.
function stripClickIds() {
  const at = now();
  for (const key of [KEYS.first, KEYS.last]) {
    const touch = read<Touch>(key, at);
    if (touch?.click_ids) rewrite(key, withoutClickIds(touch));
  }
}

function store(consent: ConsentState) {
  if (!consent.analytics) return;
  loadGtm(consent);
  const at = now();
  const touch = pageTouch && (consent.ads ? pageTouch : withoutClickIds(pageTouch));
  if (!read<Touch>(KEYS.first, at)) write(KEYS.first, touch ?? directTouch(url, at), at);
  if (touch) write(KEYS.last, touch, at);
  else if (!read<Touch>(KEYS.last, at)) write(KEYS.last, directTouch(url, at), at);
}

// Withdrawing analytics consent deletes what we stored. The starting state is "denied"
// until the consent tool restores a returning Visitor's choice, so only a change from
// granted to denied counts as a withdrawal.
let granted: ConsentState = { analytics: false, ads: false };
const consent = watchConsent(window as never, (state) => {
  if (granted.analytics && !state.analytics) forget();
  else if (granted.ads && !state.ads) stripClickIds();
  granted = state;
  store(state);
});
granted = consent();
store(granted);

function gaClientId(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
  return match?.[1];
}

const dataLayer = (window as unknown as { dataLayer: { push: (item: unknown) => void } }).dataLayer;
listenForClicks(document, dataLayer);

// Used by site components (the contact form).
const api = {
  // Pushes a listed event with only its listed parameters (see events.ts).
  event(name: string, params: Record<string, unknown>) {
    pushEvent(dataLayer, name, params);
  },
  // Attribution to send with a form submission; null without consent.
  attribution(): Record<string, unknown> | null {
    const { analytics, ads } = consent();
    if (!analytics) return null;
    const at = now();
    const shareable = (t: Touch | undefined) => (t ? (ads ? t : withoutClickIds(t)) : null);
    return {
      first_touch: shareable(read<Touch>(KEYS.first, at)),
      last_touch: shareable(read<Touch>(KEYS.last, at)),
      ga_client_id: gaClientId() ?? null,
    };
  },
  // After a successful enquiry: a flag with an expiry, never the contact's details.
  markKnownContact() {
    if (consent().analytics) write(KEYS.known, true, now());
  },
  consent,
};

(window as unknown as { msp: typeof api }).msp = api;
