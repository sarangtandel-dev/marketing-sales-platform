// Tracking events (ADR-0022). Site components are the only event source; GTM only listens.
// Every event and parameter is listed here, so nothing personal can reach the dataLayer.

export const EVENTS = {
  contact_click: ["channel", "cta_type", "cta_id"],
  cta_click: ["cta_type", "cta_id"],
  form_start: ["form_id", "form_type"],
  generate_lead: ["form_id", "form_type"],
} as const;

type EventName = keyof typeof EVENTS;

type DataLayer = { push: (item: unknown) => void };

export function pushEvent(dataLayer: DataLayer, name: string, params: Record<string, unknown>): void {
  const allowed = EVENTS[name as EventName] as readonly string[] | undefined;
  if (!allowed) return;
  const event: Record<string, string> = { event: name };
  for (const key of allowed) {
    const value = params[key];
    if (typeof value === "string" && value) event[key] = value.slice(0, 100);
  }
  dataLayer.push(event);
}

// The channel a link contacts the business through, or null if it isn't a contact link.
function contactChannel(href: string): "call" | "email" | "sms" | "whatsapp" | null {
  const h = href.trim().toLowerCase();
  if (h.startsWith("tel:")) return "call";
  if (h.startsWith("mailto:")) return "email";
  if (h.startsWith("sms:")) return "sms";
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//.test(h)) return "whatsapp";
  return null;
}

// One delegated listener: each click on a contact link or CTA pushes exactly one event.
export function listenForClicks(doc: Document, dataLayer: DataLayer): void {
  doc.addEventListener(
    "click",
    (e) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const cta = { cta_type: link.dataset.ctaType, cta_id: link.dataset.ctaId };
      const channel = contactChannel(link.getAttribute("href") ?? "");
      if (channel) pushEvent(dataLayer, "contact_click", { channel, ...cta });
      else if (cta.cta_type) pushEvent(dataLayer, "cta_click", cta);
    },
    { capture: true },
  );
}
