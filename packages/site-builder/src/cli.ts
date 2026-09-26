import { buildSite } from "./build.ts";
import { SiteDefinitionError } from "./load.ts";

// Usage: node src/cli.ts <site-definition dir> <output dir>
const [siteDir, outDir] = process.argv.slice(2);
if (!siteDir || !outDir) {
  console.error("usage: build-site <site-definition dir> <output dir>");
  process.exit(2);
}

try {
  await buildSite({ siteDir, outDir });
} catch (err) {
  console.error(err instanceof SiteDefinitionError ? err.message : err);
  process.exit(1);
}
