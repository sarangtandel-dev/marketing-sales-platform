import { createHash } from "node:crypto";
import type { Text } from "./definition.ts";

// The wording version stored with every Marketing Opt-in (ADR-0021): a hash of the exact
// label text in every language, so it changes whenever the wording does. The site
// definition's git history maps each version back to its text.
export function wordingVersion(channel: string, label: Text): string {
  const text = JSON.stringify(Object.entries(label).sort(([a], [b]) => a.localeCompare(b)));
  return `${channel}-${createHash("sha256").update(text).digest("hex").slice(0, 12)}`;
}
