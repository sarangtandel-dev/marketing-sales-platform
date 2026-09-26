import { parseArgs } from "node:util";
import { buildSite } from "./build.ts";
import { SiteDefinitionError } from "./load.ts";

const usage = "usage: build-site <site-definition dir> <output dir> [--preview] [--form-endpoint <url>]";

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: { preview: { type: "boolean" }, "form-endpoint": { type: "string" } },
  });
} catch (err) {
  console.error(`${(err as Error).message}\n${usage}`);
  process.exit(2);
}

const [siteDir, outDir] = args.positionals;
if (!siteDir || !outDir) {
  console.error(usage);
  process.exit(2);
}

try {
  await buildSite({
    siteDir,
    outDir,
    preview: args.values.preview ?? false,
    formEndpoint: args.values["form-endpoint"],
  });
} catch (err) {
  console.error(err instanceof SiteDefinitionError ? err.message : err);
  process.exit(1);
}
