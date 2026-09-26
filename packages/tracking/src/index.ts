import { currentTouch, directTouch, type Touch, withoutClickIds } from "./attribution.ts";
import { type ConsentState, watchConsent } from "./consent.ts";

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

function store(consent: ConsentState) {
  if (!consent.analytics) return;
  const at = now();
  const touch = pageTouch && (consent.ads ? pageTouch : withoutClickIds(pageTouch));
  if (!read<Touch>(KEYS.first, at)) write(KEYS.first, touch ?? directTouch(url, at), at);
  if (touch) write(KEYS.last, touch, at);
  else if (!read<Touch>(KEYS.last, at)) write(KEYS.last, directTouch(url, at), at);
}

const consent = watchConsent(window as never, store);
store(consent());

function gaClientId(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
  return match?.[1];
}

// Used by site components (the contact form, and events in ticket 29).
const api = {
  // Attribution to send with a form submission; null without consent.
  attribution(): Record<string, unknown> | null {
    if (!consent().analytics) return null;
    const at = now();
    return {
      first_touch: read<Touch>(KEYS.first, at) ?? null,
      last_touch: read<Touch>(KEYS.last, at) ?? null,
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
