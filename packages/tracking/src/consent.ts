// Reads Google Consent Mode state from the dataLayer, which any certified consent tool
// updates through gtag("consent", "default" | "update", {...}). Tool-agnostic (ADR-0020).

export type ConsentState = { analytics: boolean; ads: boolean };
type Listener = (state: ConsentState) => void;

type DataLayer = unknown[] & { push: (...items: unknown[]) => number };

export function watchConsent(w: Window & { dataLayer?: DataLayer }, onChange: Listener): () => ConsentState {
  const state: ConsentState = { analytics: false, ads: false };
  const dataLayer = (w.dataLayer ??= [] as unknown as DataLayer);

  const apply = (item: unknown) => {
    // gtag() pushes its `arguments` object: ["consent", "update", { analytics_storage: "granted" }].
    const args = item as ArrayLike<unknown> | null;
    if (!args || typeof args !== "object" || args[0] !== "consent") return;
    const settings = args[2] as Record<string, string> | undefined;
    if (!settings) return;
    const before = { ...state };
    if (settings.analytics_storage) state.analytics = settings.analytics_storage === "granted";
    if (settings.ad_storage) state.ads = settings.ad_storage === "granted";
    if (before.analytics !== state.analytics || before.ads !== state.ads) onChange({ ...state });
  };

  for (const item of Array.from(dataLayer)) apply(item);
  const push = dataLayer.push.bind(dataLayer);
  dataLayer.push = (...items: unknown[]) => {
    items.forEach(apply);
    return push(...items);
  };
  return () => ({ ...state });
}
