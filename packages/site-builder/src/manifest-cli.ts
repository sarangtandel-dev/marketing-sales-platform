import { writeFileSync } from "node:fs";
import { formsManifest } from "./forms-manifest.ts";
import { loadSite } from "./load.ts";

// Usage: node src/manifest-cli.ts <site-definition dir> <output json>
const [siteDir, out] = process.argv.slice(2);
if (!siteDir || !out) {
  console.error("usage: forms-manifest <site-definition dir> <output json>");
  process.exit(2);
}
const { site } = loadSite(siteDir);
writeFileSync(out, `${JSON.stringify(formsManifest(site), null, 2)}\n`);
console.log(`wrote ${out}`);
